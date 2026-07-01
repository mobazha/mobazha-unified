/**
 * Payment method visibility — projects backend runtime capabilities into UI.
 *
 * Apply visibility here (API projection + checkout session), not in each UI leaf.
 * Payment methods fail closed until an authoritative backend snapshot is available.
 */
import { getTokenById, isPaymentCoinEnabled, isRetiredPaymentChain } from '../data/tokens';
import {
  getRuntimePaymentCapabilities,
  getRuntimeConfig,
  hasRuntimePaymentCapabilities,
  supportsRuntimePaymentMethod,
  type RuntimeConfig,
} from './runtimeConfig';
import { isFiatPaymentVisible, isTronPaymentVisible } from './paymentMethodFeatureFlags';
import {
  isFiatAllowedByCheckoutPaymentPolicy,
  normalizeCheckoutPaymentPolicy,
  readCheckoutPaymentPolicyFromSession,
  type CheckoutPaymentPolicy,
} from './checkoutPaymentPolicy';

export {
  PAYMENT_METHOD_VISIBILITY,
  isFiatPaymentVisible,
  isTronPaymentVisible,
} from './paymentMethodFeatureFlags';

export interface RuntimePaymentDisplayMethod {
  id: string;
  name: string;
}

const RUNTIME_PAYMENT_DISPLAY: Record<string, RuntimePaymentDisplayMethod> = {
  BTC: { id: 'BTC', name: 'Bitcoin' },
  BCH: { id: 'BCH', name: 'Bitcoin Cash' },
  LTC: { id: 'LTC', name: 'Litecoin' },
  ZEC: { id: 'ZEC', name: 'Zcash' },
  ETH: { id: 'ETH', name: 'Ethereum' },
  BNB: { id: 'BNB', name: 'BNB Chain' },
  BASE: { id: 'BASE', name: 'Base' },
  MATIC: { id: 'MATIC', name: 'Polygon' },
  ARBITRUM: { id: 'ARBITRUM', name: 'Arbitrum' },
  SOL: { id: 'SOL', name: 'Solana' },
  TRX: { id: 'TRX', name: 'TRON' },
  XMR: { id: 'XMR', name: 'Monero' },
  USDT: { id: 'USDT', name: 'Tether (USDT)' },
  USDC: { id: 'USDC', name: 'USD Coin (USDC)' },
};

const RUNTIME_PAYMENT_ALIASES: Record<string, string> = {
  ETHEREUM: 'ETH',
  BSC: 'BNB',
  POLYGON: 'MATIC',
  ARB: 'ARBITRUM',
  SOLANA: 'SOL',
  TRON: 'TRX',
  MONERO: 'XMR',
};

/** Marketing projection from the backend-authoritative capability snapshot. */
export function projectRuntimeCryptoPaymentMethods(
  config: RuntimeConfig
): RuntimePaymentDisplayMethod[] {
  const projected: RuntimePaymentDisplayMethod[] = [];
  const seen = new Set<string>();
  for (const method of config.capabilities.payments.methods) {
    if (method.kind !== 'crypto') continue;
    const upper = method.id.trim().toUpperCase();
    if (!upper) continue;
    const canonical = RUNTIME_PAYMENT_ALIASES[upper] ?? upper;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    projected.push(RUNTIME_PAYMENT_DISPLAY[canonical] ?? { id: canonical, name: method.id });
  }
  return projected;
}

function runtimeChainID(chain: string): string {
  const upper = chain.trim().toUpperCase();
  return upper === 'TRON' ? 'TRX' : upper;
}

function isTransparentZecRuntimeCapability(
  token: { chain: string; id: string },
  config: RuntimeConfig = getRuntimeConfig()
): boolean {
  const chain = runtimeChainID(token.chain);
  if (chain !== 'ZEC' && token.id.trim().toUpperCase() !== 'ZEC') return false;
  if (!hasRuntimePaymentCapabilities(config)) return false;
  return getRuntimePaymentCapabilities(config).some(
    method =>
      method.kind === 'crypto' &&
      method.id.trim().toUpperCase() === 'ZEC' &&
      method.addressMode?.trim().toLowerCase() === 'transparent'
  );
}

export function isTronPaymentCoin(coinOrChain: string): boolean {
  const upper = coinOrChain.trim().toUpperCase();
  return upper === 'TRON' || upper === 'TRX' || upper.startsWith('TRX');
}

export function isVisibleAcceptedCurrency(
  coin: string,
  config: RuntimeConfig = getRuntimeConfig()
): boolean {
  const trimmed = coin.trim();
  if (!trimmed) return false;

  const token = getTokenById(trimmed);
  const chain = runtimeChainID(token?.chain ?? trimmed);
  if (token?.disabled && !isTransparentZecRuntimeCapability(token, config)) return false;
  if (!hasRuntimePaymentCapabilities(config)) return false;
  if (!supportsRuntimePaymentMethod(chain, 'crypto', config)) {
    return false;
  }

  if (isTronPaymentVisible(config)) return true;

  const lower = trimmed.toLowerCase();
  if (lower.includes('crypto:tron:') || lower.includes(':tron:')) return false;

  const upper = trimmed.toUpperCase();
  if (upper === 'TRON' || isTronPaymentCoin(upper)) return false;

  return true;
}

export function filterVisibleAcceptedCurrencies(
  coins: string[],
  config: RuntimeConfig = getRuntimeConfig()
): string[] {
  return coins.filter(coin => isVisibleAcceptedCurrency(coin, config));
}

export function filterVisibleFiatProviderIDs(providerIDs: string[]): string[] {
  if (!isFiatPaymentVisible()) return [];
  return providerIDs.filter(providerID => supportsRuntimePaymentMethod(providerID, 'fiat'));
}

export function isPaymentTokenVisible(token: { chain: string; id: string }): boolean {
  const configuredToken = getTokenById(token.id);
  if (configuredToken?.disabled && !isTransparentZecRuntimeCapability(token)) return false;
  if (!hasRuntimePaymentCapabilities()) return false;
  if (!supportsRuntimePaymentMethod(runtimeChainID(token.chain), 'crypto')) {
    return false;
  }
  if (isTronPaymentVisible()) return true;
  if (token.chain.toUpperCase() === 'TRON') return false;
  return !isTronPaymentCoin(token.id);
}

export function filterVisiblePaymentTokens<T extends { chain: string; id: string }>(
  tokens: T[]
): T[] {
  return tokens.filter(isPaymentTokenVisible);
}

/** Strip hidden payment coins from persisted guest-checkout / seller settings. */
export function sanitizeAcceptedPaymentCoins(coins: string[]): string[] {
  return filterVisibleAcceptedCurrencies(coins);
}

/** Buyer checkout: validate token id from catalog + visibility flags. */
export function sanitizeCheckoutTokenId(tokenId: string | null | undefined): string | undefined {
  if (!tokenId) return undefined;
  const token = getTokenById(tokenId);
  if (!token) return undefined;
  if (!isPaymentTokenVisible(token)) return undefined;
  const assetId = token.assetId || token.id;
  if (
    (!isPaymentCoinEnabled(assetId) && !isTransparentZecRuntimeCapability(token)) ||
    isRetiredPaymentChain(assetId)
  ) {
    return undefined;
  }
  return token.id;
}

/** Buyer checkout: validate fiat provider selection. */
export function sanitizeCheckoutFiatProvider(
  providerID: string | null | undefined
): string | undefined {
  if (!providerID || !isFiatPaymentVisible()) return undefined;
  const trimmed = providerID.trim();
  if (!trimmed || !supportsRuntimePaymentMethod(trimmed, 'fiat')) return undefined;
  return trimmed;
}

const CHECKOUT_TOKEN_KEY = 'checkout_selected_token';
const CHECKOUT_FIAT_KEY = 'checkout_selected_fiat_provider';

/** Read + scrub stale checkout payment selections from sessionStorage. */
export function syncCheckoutPaymentSessionStorage(options?: {
  paymentPolicy?: CheckoutPaymentPolicy;
}): {
  tokenId?: string;
  fiatProvider?: string;
  category: 'crypto' | 'fiat';
  paymentPolicy: CheckoutPaymentPolicy;
} {
  if (typeof window === 'undefined') {
    return { category: 'crypto', paymentPolicy: 'all' };
  }

  const paymentPolicy = normalizeCheckoutPaymentPolicy(
    options?.paymentPolicy ?? readCheckoutPaymentPolicyFromSession()
  );
  const fiatAllowed = isFiatAllowedByCheckoutPaymentPolicy(paymentPolicy);

  const rawToken = sessionStorage.getItem(CHECKOUT_TOKEN_KEY);
  const rawFiat = sessionStorage.getItem(CHECKOUT_FIAT_KEY);
  const tokenId = sanitizeCheckoutTokenId(rawToken);
  let fiatProvider = fiatAllowed ? sanitizeCheckoutFiatProvider(rawFiat) : undefined;

  if (rawToken && !tokenId) {
    sessionStorage.removeItem(CHECKOUT_TOKEN_KEY);
  }
  if (rawFiat && !fiatProvider) {
    sessionStorage.removeItem(CHECKOUT_FIAT_KEY);
  }
  if (!fiatAllowed && rawFiat) {
    sessionStorage.removeItem(CHECKOUT_FIAT_KEY);
    fiatProvider = undefined;
  }

  return {
    tokenId,
    fiatProvider,
    category: fiatProvider ? 'fiat' : 'crypto',
    paymentPolicy,
  };
}

export function persistCheckoutTokenSelection(tokenId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CHECKOUT_TOKEN_KEY, tokenId);
  sessionStorage.removeItem(CHECKOUT_FIAT_KEY);
}

export function persistCheckoutFiatSelection(providerID: string): void {
  if (typeof window === 'undefined') return;
  if (!sanitizeCheckoutFiatProvider(providerID)) return;
  sessionStorage.setItem(CHECKOUT_FIAT_KEY, providerID);
  sessionStorage.removeItem(CHECKOUT_TOKEN_KEY);
}

/** Marketing / stats: chain count aligned with visible checkout chains. */
export function getVisibleSupportedChainCount(): number {
  if (!hasRuntimePaymentCapabilities()) return 0;
  return new Set(
    getRuntimePaymentCapabilities()
      .filter(method => method.kind === 'crypto')
      .map(method => method.id.toUpperCase())
  ).size;
}
