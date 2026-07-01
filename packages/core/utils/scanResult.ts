/**
 * QR scan result parser — interprets scanned text and classifies it for
 * routing. Priority order follows the plan (plan.md §3 table):
 *
 *   1. BIP21 payment URIs (bitcoin:, bitcoincash:, litecoin:, zcash:)
 *   2. EVM payment URI (ethereum:0x...)
 *   3. Solana payment URI (solana:...)
 *   4. Telegram bot deep link (t.me/...?start=...)
 *   5. Mobazha store URL (/store/{peerID})
 *   6. Mobazha listing URL (/product/{slug}?peerID={peerID})
 *   7. Bare peerID (12D3KooW...)
 *   8. Bare crypto address (validated externally)
 *   9. Generic URL (https://...)
 *  10. Fallback to search
 */

import { parseStartParam } from '../services/startParam';
import { hasPeerIDPrefix, PEER_ID_PREFIX_LIBP2P } from './identity';
import { allowsPaymentCoin } from '../edition/capabilities';

// ── Result types ──

export type ScanResultType = 'payment' | 'store' | 'listing' | 'search' | 'url';

export interface ScanResultPayment {
  type: 'payment';
  coin: string;
  address: string;
  amount?: string;
}

export interface ScanResultStore {
  type: 'store';
  peerID: string;
}

export interface ScanResultListing {
  type: 'listing';
  peerID: string;
  slug: string;
}

export interface ScanResultURL {
  type: 'url';
  url: string;
}

export interface ScanResultSearch {
  type: 'search';
  query: string;
}

export type ScanResult =
  | ScanResultPayment
  | ScanResultStore
  | ScanResultListing
  | ScanResultURL
  | ScanResultSearch;

// ── BIP21 scheme → coin mapping ──

const BIP21_SCHEMES: Record<string, string> = {
  bitcoin: 'BTC',
  bitcoincash: 'BCH',
  litecoin: 'LTC',
  zcash: 'ZEC',
};

// ── Helpers ──

const PEER_ID_PATTERN = /^[A-Za-z0-9]{1,80}$/;
const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Optional address validator injected by callers that have access to
 * `multicoin-address-validator`. Returns the coin symbol if the address
 * is recognized, `undefined` otherwise.
 */
export type AddressValidator = (address: string, coinHint?: string) => { coin: string } | undefined;

function validatePaymentAddress(
  address: string,
  coin: string,
  options?: ParseScanResultOptions
): { coin: string } | undefined {
  const expectedCoin = coin.toUpperCase();
  if (!allowsPaymentCoin(expectedCoin)) {
    return undefined;
  }

  if (expectedCoin === 'ETH') {
    return EVM_ADDRESS_PATTERN.test(address) ? { coin: 'ETH' } : undefined;
  }

  if (expectedCoin === 'SOL') {
    return SOLANA_ADDRESS_PATTERN.test(address) ? { coin: 'SOL' } : undefined;
  }

  const validated = options?.validateAddress?.(address, expectedCoin);
  if (!validated) return undefined;

  return validated.coin.toUpperCase() === expectedCoin ? { coin: expectedCoin } : undefined;
}

function parseBIP21(text: string, options?: ParseScanResultOptions): ScanResultPayment | undefined {
  const colonIdx = text.indexOf(':');
  if (colonIdx < 1) return undefined;

  const scheme = text.slice(0, colonIdx).toLowerCase();
  const coin = BIP21_SCHEMES[scheme];
  if (!coin) return undefined;

  const rest = text.slice(colonIdx + 1);
  const qIdx = rest.indexOf('?');
  const address = qIdx >= 0 ? rest.slice(0, qIdx) : rest;
  if (!address) return undefined;

  const validated = validatePaymentAddress(address, coin, options);
  if (!validated) return undefined;

  let amount: string | undefined;
  if (qIdx >= 0) {
    const params = new URLSearchParams(rest.slice(qIdx + 1));
    amount = params.get('amount') ?? undefined;
  }
  return { type: 'payment', coin: validated.coin, address, amount };
}

function parseEVMUri(
  text: string,
  options?: ParseScanResultOptions
): ScanResultPayment | undefined {
  if (!text.toLowerCase().startsWith('ethereum:')) return undefined;
  const address = text.slice('ethereum:'.length).split('?')[0];
  if (!address) return undefined;
  const validated = validatePaymentAddress(address, 'ETH', options);
  if (!validated) return undefined;
  return { type: 'payment', coin: 'ETH', address };
}

function parseSolanaUri(
  text: string,
  options?: ParseScanResultOptions
): ScanResultPayment | undefined {
  if (!text.toLowerCase().startsWith('solana:')) return undefined;
  const address = text.slice('solana:'.length).split('?')[0];
  if (!address) return undefined;
  const validated = validatePaymentAddress(address, 'SOL', options);
  if (!validated) return undefined;
  return { type: 'payment', coin: 'SOL', address };
}

function parseTelegramDeepLink(text: string): ScanResultStore | undefined {
  try {
    let url: URL;
    if (text.startsWith('https://') || text.startsWith('http://')) {
      url = new URL(text);
    } else if (text.startsWith('t.me/')) {
      url = new URL('https://' + text);
    } else if (text.startsWith('tg://')) {
      url = new URL(text);
    } else {
      return undefined;
    }

    if (url.protocol !== 'tg:' && url.hostname !== 't.me') return undefined;
    const start = url.searchParams.get('start') ?? url.searchParams.get('startapp');
    if (!start) return undefined;

    const parsed = parseStartParam(start);
    if (parsed.storePeerID) {
      return { type: 'store', peerID: parsed.storePeerID };
    }
  } catch {
    // Invalid URL — not a Telegram deep link
  }
  return undefined;
}

function isPeerID(value: string | undefined): value is string {
  return !!value && PEER_ID_PATTERN.test(value) && hasPeerIDPrefix(value);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const MOBAZHA_DOMAINS: string[] =
  typeof __OUTPOST__ !== 'undefined' && __OUTPOST__
    ? []
    : ['app.mobazha.org', 'mobazha.org', 'test-new.mobazha.org'];

function parseMobazhaURL(text: string): ScanResultStore | ScanResultListing | undefined {
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();

    const isMobazha =
      MOBAZHA_DOMAINS.includes(host) ||
      host.endsWith('.mobaza.org') ||
      host.endsWith('.mobazha.org');
    if (!isMobazha) return undefined;

    const parts = url.pathname.split('/').filter(Boolean);

    // Current app routes: /store/{peerID}
    if (parts[0] === 'store' && isPeerID(parts[1])) {
      return { type: 'store', peerID: parts[1] };
    }

    // Current app routes: /product/{slug}?peerID={peerID}
    const productPeerID = url.searchParams.get('peerID') ?? undefined;
    if (parts[0] === 'product' && parts[1] && isPeerID(productPeerID)) {
      return {
        type: 'listing',
        peerID: productPeerID,
        slug: safeDecode(parts[1]),
      };
    }

    // Legacy routes: /{peerID}/store/{slug}
    if (parts.length >= 3 && isPeerID(parts[0]) && parts[1] === 'store') {
      return { type: 'listing', peerID: parts[0], slug: safeDecode(parts[2]) };
    }

    // Legacy routes: /{peerID}/store or /{peerID}
    if (parts.length >= 1 && isPeerID(parts[0])) {
      return { type: 'store', peerID: parts[0] };
    }
  } catch {
    // Invalid URL
  }
  return undefined;
}

// ── Main parser ──

export interface ParseScanResultOptions {
  /** Optional validator for bare crypto addresses (priority 8). */
  validateAddress?: AddressValidator;
}

/**
 * Parse scanned QR text into a structured result for routing.
 *
 * Never throws — unrecognized input falls back to `{ type: 'search' }`.
 */
export function parseScanResult(text: string, options?: ParseScanResultOptions): ScanResult {
  const trimmed = text.trim();
  if (!trimmed) return { type: 'search', query: text };

  // 1. BIP21 payment URI
  const bip21 = parseBIP21(trimmed, options);
  if (bip21) return bip21;

  // 2. EVM payment URI
  const evm = parseEVMUri(trimmed, options);
  if (evm) return evm;

  // 3. Solana payment URI
  const sol = parseSolanaUri(trimmed, options);
  if (sol) return sol;

  // 4. Telegram bot deep link
  const tgLink = parseTelegramDeepLink(trimmed);
  if (tgLink) return tgLink;

  // 5-6. Mobazha URL (store or listing)
  const mobazhaUrl = parseMobazhaURL(trimmed);
  if (mobazhaUrl) return mobazhaUrl;

  // 7. Bare peerID
  if (trimmed.startsWith(PEER_ID_PREFIX_LIBP2P) && /^[A-Za-z0-9]+$/.test(trimmed)) {
    return { type: 'store', peerID: trimmed };
  }

  // 8. Bare crypto address (external validator)
  if (options?.validateAddress) {
    const addrResult = options.validateAddress(trimmed);
    if (addrResult) {
      return { type: 'payment', coin: addrResult.coin, address: trimmed };
    }
  }

  // 9. Generic URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed);
      return { type: 'url', url: trimmed };
    } catch {
      // Not a valid URL
    }
  }

  // 10. Fallback to search
  return { type: 'search', query: trimmed };
}
