import { describe, expect, it } from 'vitest';
import {
  EXCHANGE_USDT_PAYMENT_HELP_PATH,
  EXCHANGE_USDT_GUIDE_DISMISS_STORAGE_KEY,
  applyExchangeUsdtCheckoutTokenOrdering,
  exchangeUsdtCheckoutTokenPriorityIndex,
  getExchangeUsdtWithdrawalHintKey,
  isExchangeUsdtPaymentGuideLocale,
  sortTokenIdsForExchangeUsdtCheckout,
} from '../../config/exchangeUsdtPaymentGuide';

describe('exchangeUsdtPaymentGuide', () => {
  it('enables guide for zh and en locales only', () => {
    expect(isExchangeUsdtPaymentGuideLocale('zh')).toBe(true);
    expect(isExchangeUsdtPaymentGuideLocale('en')).toBe(true);
    expect(isExchangeUsdtPaymentGuideLocale('ja')).toBe(false);
  });

  it('sorts token IDs with BSC/SOL USDT first', () => {
    expect(sortTokenIdsForExchangeUsdtCheckout(['ETHUSDT', 'SOLUSDT', 'BSCUSDT'])).toEqual([
      'BSCUSDT',
      'SOLUSDT',
      'ETHUSDT',
    ]);
  });

  it('orders currency groups and nested tokens for exchange checkout', () => {
    const ordered = applyExchangeUsdtCheckoutTokenOrdering([
      {
        symbol: 'USDT',
        category: 'stablecoin',
        tokens: [{ id: 'ETHUSDT' }, { id: 'BSCUSDT' }, { id: 'SOLUSDT' }],
      },
      { symbol: 'ETH', category: 'native', tokens: [{ id: 'ETH' }] },
    ]);

    expect(ordered[0].tokens.map(t => t.id)).toEqual(['BSCUSDT', 'SOLUSDT', 'ETHUSDT']);
  });

  it('maps token IDs to withdrawal hint keys', () => {
    expect(getExchangeUsdtWithdrawalHintKey('BSCUSDT')).toBe('bsc');
    expect(getExchangeUsdtWithdrawalHintKey('SOLUSDT')).toBe('sol');
    expect(getExchangeUsdtWithdrawalHintKey('BASEUSDT')).toBe('base');
    expect(getExchangeUsdtWithdrawalHintKey('MATICUSDT')).toBe('matic');
    expect(getExchangeUsdtWithdrawalHintKey('ARBUSDT')).toBe('arbitrum');
    expect(getExchangeUsdtWithdrawalHintKey('ETHUSDT')).toBe('eth');
    expect(getExchangeUsdtWithdrawalHintKey('')).toBeNull();
  });

  it('exposes stable help path and dismiss storage key', () => {
    expect(EXCHANGE_USDT_PAYMENT_HELP_PATH).toBe('/help/exchange-usdt-payment');
    expect(EXCHANGE_USDT_GUIDE_DISMISS_STORAGE_KEY).toBe('mobazha.exchangeUsdtGuide.dismissed');
    expect(exchangeUsdtCheckoutTokenPriorityIndex('BSCUSDT')).toBeLessThan(
      exchangeUsdtCheckoutTokenPriorityIndex('ETHUSDT')
    );
  });
});
