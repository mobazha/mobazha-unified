/**
 * Community Edition runtime capability policy.
 * Frontend policy may narrow backend responses but must never widen them.
 */

import { TOKENS, getTokenById, type TokenConfig } from '../data/tokens';
import {
  COMMUNITY_PAYMENT_CHAIN_SET,
  COMMUNITY_PAYMENT_CHAINS,
  COMMUNITY_EDITION_MANIFEST,
} from './manifest';

export class EditionCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditionCapabilityError';
  }
}

/** Normalize chain identifiers to uppercase chain codes (BTC, BCH, LTC, ZEC). */
export function normalizePaymentChain(chain: string): string {
  return (chain || '').trim().toUpperCase();
}

export function allowsPaymentChain(chain: string): boolean {
  return COMMUNITY_PAYMENT_CHAIN_SET.has(normalizePaymentChain(chain));
}

export function allowsTokenId(tokenId: string): boolean {
  const token = getTokenById(tokenId);
  if (!token) return false;
  return allowsPaymentChain(token.chain) && token.isNative;
}

export function allowsPaymentCoin(coin: string): boolean {
  const trimmed = (coin || '').trim();
  if (!trimmed) return false;

  const token = getTokenById(trimmed);
  if (token) {
    return allowsTokenId(token.id);
  }

  return allowsPaymentChain(trimmed);
}

export function supportsFiatPayments(): boolean {
  return false;
}

export function zcashTransparentOnly(): boolean {
  return COMMUNITY_EDITION_MANIFEST.zcash.transparentOnly;
}

/**
 * Accept only legacy transparent Zcash address families.
 *
 * Mainnet transparent addresses start with t1/t3. Testnet transparent
 * addresses start with tm/t2. Shielded (z/zc/zs) and unified (u/uview/...)
 * address families fail closed before the generic address validator runs.
 */
export function isTransparentZcashAddress(address: string, network: 'prod' | 'testnet'): boolean {
  const normalized = (address || '').trim();
  if (!normalized) return false;

  const transparentPrefix = network === 'testnet' ? /^(?:tm|t2)/ : /^(?:t1|t3)/;
  return transparentPrefix.test(normalized);
}

/**
 * Intersect backend-reported chains with the edition allowlist.
 * Never widens: unknown backend chains outside the edition set are dropped.
 */
export function intersectPaymentChains(backendChains: readonly string[]): string[] {
  const backendSet = new Set(backendChains.map(normalizePaymentChain));
  return COMMUNITY_PAYMENT_CHAINS.filter(chain => backendSet.has(chain));
}

/**
 * Intersect seller/backend crypto payment identifiers with edition policy.
 * Accepts token IDs (BTC) or canonical asset IDs.
 */
export function intersectCryptoPaymentMethods(methods: readonly string[]): string[] {
  const allowed = new Set<string>();

  for (const method of methods) {
    const trimmed = (method || '').trim();
    if (!trimmed) continue;

    const token = getTokenById(trimmed);
    if (token && allowsTokenId(token.id)) {
      allowed.add(token.id);
      if (token.assetId) {
        allowed.add(token.assetId);
      }
      continue;
    }

    if (allowsPaymentCoin(trimmed)) {
      allowed.add(trimmed);
    }
  }

  return Array.from(allowed);
}

/** Selectable native UTXO tokens for checkout UI. */
export function getEditionSelectableTokens(): TokenConfig[] {
  return TOKENS.filter(
    token => token.isNative && !token.disabled && allowsPaymentChain(token.chain)
  );
}

export function filterSelectableTokens(tokens: readonly TokenConfig[]): TokenConfig[] {
  return tokens.filter(
    token => token.isNative && !token.disabled && allowsPaymentChain(token.chain)
  );
}

export interface PaymentSelectorOptions {
  isRwaTokenPurchase?: boolean;
  acceptedCurrencies?: readonly string[];
}

/**
 * Resolve selectable token IDs for Community Edition checkout UI.
 * RWA purchases return none; acceptedCurrencies never widens the edition allowlist.
 */
export function resolvePaymentSelectorTokenIds(options: PaymentSelectorOptions = {}): string[] {
  if (options.isRwaTokenPurchase) {
    return [];
  }

  let tokens = getEditionSelectableTokens();

  if (options.acceptedCurrencies?.length) {
    const accepted = new Set(
      options.acceptedCurrencies
        .map(value => value?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value))
    );
    tokens = tokens.filter(token => {
      const tokenID = token.id.trim().toLowerCase();
      const canonical = token.assetId?.trim().toLowerCase();
      return accepted.has(tokenID) || (canonical ? accepted.has(canonical) : false);
    });
  }

  return tokens.map(token => token.id);
}

/** Fiat selection is disabled in Community Edition regardless of caller flags. */
export function isFiatSelectionEnabled(showFiatMethods: boolean): boolean {
  return supportsFiatPayments() && showFiatMethods;
}

export function assertPaymentChainAllowed(chain: string): void {
  if (!allowsPaymentChain(chain)) {
    throw new EditionCapabilityError(`Payment chain not available in Community Edition: ${chain}`);
  }
}

export function assertTokenIdAllowed(tokenId: string): void {
  if (!allowsTokenId(tokenId)) {
    throw new EditionCapabilityError(
      `Payment token not available in Community Edition: ${tokenId}`
    );
  }
}
