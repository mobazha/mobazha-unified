import type { Locale } from '../i18n/types';

/** Official exchange C2C / network help — Mobazha does not operate these services. */
export const EXCHANGE_C2C_GUIDE_URLS = {
  /** OKX: 如何使用快捷买币/卖币 (C2C/P2P) */
  okx: 'https://www.okx.com/zh-hans/help/how-do-i-buy-crypto-on-okx-p2p-trading',
  /** Binance: P2P 专区 FAQ */
  binance: 'https://www.binance.com/zh-CN/support/faq/list/66-67-69',
  htx: 'https://www.htx.com/feed/community/4393837/',
} as const;

/** English exchange C2C guides (same platforms, EN help pages). */
export const EXCHANGE_C2C_GUIDE_URLS_EN = {
  okx: 'https://www.okx.com/help/how-do-i-buy-crypto-on-okx-p2p-trading',
  binance: 'https://www.binance.com/en/support/faq/list/66-67-69',
  htx: 'https://www.htx.com/support/en-us/detail/900000002234',
} as const;

export type ExchangeC2CGuideKey = keyof typeof EXCHANGE_C2C_GUIDE_URLS;

export function getExchangeC2CGuideUrls(locale: Locale): Record<ExchangeC2CGuideKey, string> {
  return locale === 'zh' ? EXCHANGE_C2C_GUIDE_URLS : EXCHANGE_C2C_GUIDE_URLS_EN;
}

/** In-app help page for mainland crypto checkout (full SOP). */
export const MAINLAND_PAYMENT_HELP_PATH = '/help/mainland-payment';

/** localStorage key for "don't show again" on checkout slim guide. */
export const MAINLAND_GUIDE_DISMISS_STORAGE_KEY = 'mobazha.mainlandCryptoGuide.dismissed';

export type MainlandWithdrawalHintKey = 'bsc' | 'sol' | 'base' | 'matic' | 'eth' | 'generic';

/** Map selected checkout token to a withdrawal-network hint i18n key (P2). */
export function getMainlandWithdrawalHintKey(
  tokenId?: string | null
): MainlandWithdrawalHintKey | null {
  if (!tokenId?.trim()) return null;
  const id = tokenId.trim().toUpperCase();
  if (id === 'BSCUSDT' || (id.includes('BSC') && id.includes('USDT'))) return 'bsc';
  if (id === 'SOLUSDT' || (id.startsWith('SOL') && id.includes('USDT'))) return 'sol';
  if (id === 'BASEUSDT' || id.includes('BASEUSDT')) return 'base';
  if (id === 'MATICUSDT' || (id.includes('MATIC') && id.includes('USDT'))) return 'matic';
  if (id === 'ETHUSDT' || (id.includes('ETH') && id.includes('USDT') && !id.includes('BASE'))) {
    return 'eth';
  }
  if (id.includes('USDT') || id.includes('USDC')) return 'generic';
  return null;
}

/** Preferred checkout token IDs for mainland buyers (TRON excluded at platform level). */
export const MAINLAND_CHECKOUT_TOKEN_PRIORITY = [
  'BSCUSDT',
  'SOLUSDT',
  'BASEUSDT',
  'MATICUSDT',
  'ETHUSDT',
] as const;

/** Show exchange on-ramp checkout guide (zh + en UI; content applies to mainland buyers). */
export function isMainlandCryptoPaymentGuideLocale(locale: Locale): boolean {
  return locale === 'zh' || locale === 'en';
}

export function mainlandCheckoutTokenPriorityIndex(tokenId: string): number {
  const idx = MAINLAND_CHECKOUT_TOKEN_PRIORITY.indexOf(
    tokenId as (typeof MAINLAND_CHECKOUT_TOKEN_PRIORITY)[number]
  );
  return idx === -1 ? MAINLAND_CHECKOUT_TOKEN_PRIORITY.length + 1 : idx;
}

export function sortTokenIdsForMainlandCheckout(tokenIds: string[]): string[] {
  return [...tokenIds].sort(
    (a, b) => mainlandCheckoutTokenPriorityIndex(a) - mainlandCheckoutTokenPriorityIndex(b)
  );
}

export interface MainlandSortableToken {
  id: string;
}

export interface MainlandSortableCurrencyGroup<
  T extends MainlandSortableToken = MainlandSortableToken,
> {
  symbol: string;
  tokens: T[];
  category: 'stablecoin' | 'native' | 'other';
}

/** Re-order groups and intra-group tokens for zh checkout (BSC/SOL USDT first). */
export function applyMainlandCheckoutTokenOrdering<T extends MainlandSortableToken>(
  groups: MainlandSortableCurrencyGroup<T>[]
): MainlandSortableCurrencyGroup<T>[] {
  const withSortedTokens = groups.map(group => ({
    ...group,
    tokens: [...group.tokens].sort(
      (a, b) => mainlandCheckoutTokenPriorityIndex(a.id) - mainlandCheckoutTokenPriorityIndex(b.id)
    ),
  }));

  return [...withSortedTokens].sort((a, b) => {
    const aScore = Math.min(...a.tokens.map(t => mainlandCheckoutTokenPriorityIndex(t.id)));
    const bScore = Math.min(...b.tokens.map(t => mainlandCheckoutTokenPriorityIndex(t.id)));
    if (aScore !== bScore) return aScore - bScore;
    return a.symbol.localeCompare(b.symbol);
  });
}
