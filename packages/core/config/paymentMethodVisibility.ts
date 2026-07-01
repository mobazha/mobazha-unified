/**
 * Payment method visibility — intersects edition policy with backend runtime capabilities.
 *
 * Neither source may widen the other: the Community Edition manifest is the
 * distributable ceiling, while a versioned backend snapshot may narrow it.
 */
import { getTokenById, isPaymentCoinEnabled, isRetiredPaymentChain } from '../data/tokens';
import { allowsPaymentCoin, allowsTokenId, supportsFiatPayments } from '../edition/capabilities';
import { getEditionSupportedChainCount } from '../edition/uiPolicy';
import {
  getRuntimePaymentCapabilities,
  hasRuntimePaymentCapabilities,
  supportsRuntimePaymentMethod,
} from './runtimeConfig';

function runtimeChainID(chain: string): string {
  const upper = chain.trim().toUpperCase();
  return upper === 'TRON' ? 'TRX' : upper;
}

export function isTronPaymentVisible(): boolean {
  if (!hasRuntimePaymentCapabilities()) return false;
  return allowsPaymentCoin('TRX') && supportsRuntimePaymentMethod('TRX', 'crypto');
}

export function isFiatPaymentVisible(): boolean {
  return supportsFiatPayments();
}

export function isTronPaymentCoin(coinOrChain: string): boolean {
  const upper = coinOrChain.trim().toUpperCase();
  return upper === 'TRON' || upper === 'TRX' || upper.startsWith('TRX');
}

export function isVisibleAcceptedCurrency(coin: string): boolean {
  const trimmed = coin.trim();
  if (!trimmed) return false;
  if (!allowsPaymentCoin(trimmed)) return false;

  const token = getTokenById(trimmed);
  const chain = runtimeChainID(token?.chain ?? trimmed);
  if (hasRuntimePaymentCapabilities() && !supportsRuntimePaymentMethod(chain, 'crypto')) {
    return false;
  }

  if (isTronPaymentVisible()) return true;

  const lower = trimmed.toLowerCase();
  if (lower.includes('crypto:tron:') || lower.includes(':tron:')) return false;

  const upper = trimmed.toUpperCase();
  if (upper === 'TRON' || isTronPaymentCoin(upper)) return false;

  return true;
}

export function filterVisibleAcceptedCurrencies(coins: string[]): string[] {
  return coins.filter(isVisibleAcceptedCurrency);
}

export function filterVisibleFiatProviderIDs(providerIDs: string[]): string[] {
  if (!isFiatPaymentVisible()) return [];
  return providerIDs.filter(providerID => supportsRuntimePaymentMethod(providerID, 'fiat'));
}

export function isPaymentTokenVisible(token: { chain: string; id: string }): boolean {
  if (!allowsTokenId(token.id)) return false;
  if (
    hasRuntimePaymentCapabilities() &&
    !supportsRuntimePaymentMethod(runtimeChainID(token.chain), 'crypto')
  ) {
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
  if (!token || token.disabled) return undefined;
  if (!allowsTokenId(token.id)) return undefined;
  if (!isPaymentTokenVisible(token)) return undefined;
  const assetId = token.assetId || token.id;
  if (!isPaymentCoinEnabled(assetId) || isRetiredPaymentChain(assetId)) return undefined;
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
export function syncCheckoutPaymentSessionStorage(): {
  tokenId?: string;
  fiatProvider?: string;
  category: 'crypto' | 'fiat';
} {
  if (typeof window === 'undefined') {
    return { category: 'crypto' };
  }

  const rawToken = sessionStorage.getItem(CHECKOUT_TOKEN_KEY);
  const rawFiat = sessionStorage.getItem(CHECKOUT_FIAT_KEY);
  const tokenId = sanitizeCheckoutTokenId(rawToken);
  const fiatProvider = sanitizeCheckoutFiatProvider(rawFiat);

  if (rawToken && !tokenId) {
    sessionStorage.removeItem(CHECKOUT_TOKEN_KEY);
  }
  if (rawFiat && !fiatProvider) {
    sessionStorage.removeItem(CHECKOUT_FIAT_KEY);
  }

  return {
    tokenId,
    fiatProvider,
    category: fiatProvider ? 'fiat' : 'crypto',
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

/** Marketing / stats: chain count aligned with Community Edition allowlist. */
export function getVisibleSupportedChainCount(): number {
  if (hasRuntimePaymentCapabilities()) {
    return new Set(
      getRuntimePaymentCapabilities()
        .filter(method => method.kind === 'crypto' && allowsPaymentCoin(method.id))
        .map(method => method.id.toUpperCase())
    ).size;
  }
  return getEditionSupportedChainCount();
}

// Re-export edition selector helpers for checkout UI consumers.
export { resolvePaymentSelectorTokenIds, isFiatSelectionEnabled } from '../edition/capabilities';
