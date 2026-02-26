import { describe, it, expect } from 'vitest';
import { getOrderCurrencyCode, getProductCurrencyCode } from '@/components/admin/dashboard/utils';

describe('getOrderCurrencyCode', () => {
  it('returns currencyCode from flat price shape', () => {
    const order = {
      total: { amount: 2500, currencyCode: 'USD' },
      coinType: 'BTC',
    } as any;
    expect(getOrderCurrencyCode(order)).toBe('USD');
  });

  it('returns currency.code from nested price shape', () => {
    const order = {
      total: { amount: 2500, currency: { code: 'EUR', divisibility: 2 } },
      coinType: 'ETH',
    } as any;
    expect(getOrderCurrencyCode(order)).toBe('EUR');
  });

  it('falls back to coinType when total has no currency info', () => {
    const order = {
      total: { amount: 1000 },
      coinType: 'BTC',
    } as any;
    expect(getOrderCurrencyCode(order)).toBe('BTC');
  });

  it('falls back to USD when no currency info at all', () => {
    const order = {
      total: { amount: 500 },
    } as any;
    expect(getOrderCurrencyCode(order)).toBe('USD');
  });

  it('handles undefined total gracefully', () => {
    const order = { coinType: 'SOL' } as any;
    expect(getOrderCurrencyCode(order)).toBe('SOL');
  });

  it('prefers currencyCode over currency.code', () => {
    const order = {
      total: {
        amount: 100,
        currencyCode: 'GBP',
        currency: { code: 'JPY' },
      },
      coinType: 'BNB',
    } as any;
    expect(getOrderCurrencyCode(order)).toBe('GBP');
  });
});

describe('getProductCurrencyCode', () => {
  it('returns currencyCode from flat price shape', () => {
    const product = {
      price: { amount: 1500, currencyCode: 'USD' },
    } as any;
    expect(getProductCurrencyCode(product)).toBe('USD');
  });

  it('returns currency.code from nested price shape', () => {
    const product = {
      price: { amount: 1500, currency: { code: 'EUR', divisibility: 2 } },
    } as any;
    expect(getProductCurrencyCode(product)).toBe('EUR');
  });

  it('falls back to USD when no currency info', () => {
    const product = {
      price: { amount: 1000 },
    } as any;
    expect(getProductCurrencyCode(product)).toBe('USD');
  });

  it('handles undefined price gracefully', () => {
    const product = {} as any;
    expect(getProductCurrencyCode(product)).toBe('USD');
  });
});
