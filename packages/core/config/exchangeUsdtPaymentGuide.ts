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

/** In-app help page for exchange USDT checkout (full SOP). */
export const EXCHANGE_USDT_PAYMENT_HELP_PATH = '/help/exchange-usdt-payment';

/** localStorage key for "don't show again" on checkout slim guide. */
export const EXCHANGE_USDT_GUIDE_DISMISS_STORAGE_KEY = 'mobazha.exchangeUsdtGuide.dismissed';

export type ExchangeUsdtWithdrawalHintKey =
  | 'bsc'
  | 'sol'
  | 'base'
  | 'matic'
  | 'arbitrum'
  | 'eth'
  | 'generic';

/** Map selected checkout token to a withdrawal-network hint i18n key (P2). */
export function getExchangeUsdtWithdrawalHintKey(
  tokenId?: string | null
): ExchangeUsdtWithdrawalHintKey | null {
  if (!tokenId?.trim()) return null;
  const id = tokenId.trim().toUpperCase();
  if (id === 'BSCUSDT' || (id.includes('BSC') && id.includes('USDT'))) return 'bsc';
  if (id === 'SOLUSDT' || (id.startsWith('SOL') && id.includes('USDT'))) return 'sol';
  if (id === 'BASEUSDT' || id.includes('BASEUSDT')) return 'base';
  if (id === 'MATICUSDT' || (id.includes('MATIC') && id.includes('USDT'))) return 'matic';
  if (id === 'ARBUSDT' || (id.includes('ARB') && id.includes('USDT'))) return 'arbitrum';
  if (id === 'ETHUSDT' || (id.includes('ETH') && id.includes('USDT') && !id.includes('BASE'))) {
    return 'eth';
  }
  if (id.includes('USDT') || id.includes('USDC')) return 'generic';
  return null;
}

/** Preferred checkout token IDs when paying via exchange (TRON excluded at platform level). */
export const EXCHANGE_USDT_CHECKOUT_TOKEN_PRIORITY = [
  'BSCUSDT',
  'SOLUSDT',
  'BASEUSDT',
  'MATICUSDT',
  'ARBUSDT',
  'ETHUSDT',
] as const;

/** Show exchange on-ramp checkout guide for zh/en checkout UI. */
export function isExchangeUsdtPaymentGuideLocale(locale: Locale): boolean {
  return locale === 'zh' || locale === 'en';
}

export function exchangeUsdtCheckoutTokenPriorityIndex(tokenId: string): number {
  const idx = EXCHANGE_USDT_CHECKOUT_TOKEN_PRIORITY.indexOf(
    tokenId as (typeof EXCHANGE_USDT_CHECKOUT_TOKEN_PRIORITY)[number]
  );
  return idx === -1 ? EXCHANGE_USDT_CHECKOUT_TOKEN_PRIORITY.length + 1 : idx;
}

export function sortTokenIdsForExchangeUsdtCheckout(tokenIds: string[]): string[] {
  return [...tokenIds].sort(
    (a, b) => exchangeUsdtCheckoutTokenPriorityIndex(a) - exchangeUsdtCheckoutTokenPriorityIndex(b)
  );
}

export interface ExchangeUsdtSortableToken {
  id: string;
}

export interface ExchangeUsdtSortableCurrencyGroup<
  T extends ExchangeUsdtSortableToken = ExchangeUsdtSortableToken,
> {
  symbol: string;
  tokens: T[];
  category: 'stablecoin' | 'native' | 'other';
}

/** Re-order groups and intra-group tokens for exchange checkout (BSC/SOL USDT first). */
export function applyExchangeUsdtCheckoutTokenOrdering<T extends ExchangeUsdtSortableToken>(
  groups: ExchangeUsdtSortableCurrencyGroup<T>[]
): ExchangeUsdtSortableCurrencyGroup<T>[] {
  const withSortedTokens = groups.map(group => ({
    ...group,
    tokens: [...group.tokens].sort(
      (a, b) =>
        exchangeUsdtCheckoutTokenPriorityIndex(a.id) - exchangeUsdtCheckoutTokenPriorityIndex(b.id)
    ),
  }));

  return [...withSortedTokens].sort((a, b) => {
    const aScore = Math.min(...a.tokens.map(t => exchangeUsdtCheckoutTokenPriorityIndex(t.id)));
    const bScore = Math.min(...b.tokens.map(t => exchangeUsdtCheckoutTokenPriorityIndex(t.id)));
    if (aScore !== bScore) return aScore - bScore;
    return a.symbol.localeCompare(b.symbol);
  });
}
