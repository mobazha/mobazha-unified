import { describe, expect, it } from 'vitest';

import {
  applyMainlandCheckoutTokenOrdering,
  EXCHANGE_C2C_GUIDE_URLS,
  EXCHANGE_C2C_GUIDE_URLS_EN,
  getExchangeC2CGuideUrls,
  getMainlandWithdrawalHintKey,
  isMainlandCryptoPaymentGuideLocale,
  sortTokenIdsForMainlandCheckout,
} from '../../config/mainlandCryptoPaymentGuide';

describe('mainlandCryptoPaymentGuide', () => {
  it('enables guide for zh and en locales', () => {
    expect(isMainlandCryptoPaymentGuideLocale('zh')).toBe(true);
    expect(isMainlandCryptoPaymentGuideLocale('en')).toBe(true);
    expect(isMainlandCryptoPaymentGuideLocale('ja')).toBe(false);
  });

  it('sorts token ids with BSC and SOL USDT first', () => {
    expect(sortTokenIdsForMainlandCheckout(['ETHUSDT', 'SOLUSDT', 'BSCUSDT'])).toEqual([
      'BSCUSDT',
      'SOLUSDT',
      'ETHUSDT',
    ]);
  });

  it('orders currency groups and nested tokens for mainland checkout', () => {
    const ordered = applyMainlandCheckoutTokenOrdering([
      {
        symbol: 'USDT',
        category: 'stablecoin',
        tokens: [{ id: 'ETHUSDT' }, { id: 'BSCUSDT' }, { id: 'SOLUSDT' }],
      },
      {
        symbol: 'ETH',
        category: 'native',
        tokens: [{ id: 'ETH' }],
      },
    ]);

    expect(ordered[0].symbol).toBe('USDT');
    expect(ordered[0].tokens.map(t => t.id)).toEqual(['BSCUSDT', 'SOLUSDT', 'ETHUSDT']);
  });

  it('maps token ids to withdrawal hint keys', () => {
    expect(getMainlandWithdrawalHintKey('BSCUSDT')).toBe('bsc');
    expect(getMainlandWithdrawalHintKey('SOLUSDT')).toBe('sol');
    expect(getMainlandWithdrawalHintKey('BASEUSDT')).toBe('base');
    expect(getMainlandWithdrawalHintKey('MATICUSDT')).toBe('matic');
    expect(getMainlandWithdrawalHintKey('ETHUSDT')).toBe('eth');
    expect(getMainlandWithdrawalHintKey('')).toBeNull();
  });

  it('returns locale-specific exchange guide URLs', () => {
    expect(getExchangeC2CGuideUrls('zh')).toEqual(EXCHANGE_C2C_GUIDE_URLS);
    expect(getExchangeC2CGuideUrls('en')).toEqual(EXCHANGE_C2C_GUIDE_URLS_EN);
  });
});
