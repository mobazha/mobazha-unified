import { describe, expect, it } from 'vitest';

import {
  isCrossCurrencyOrderPayment,
  isCrossCurrencyOrderPaymentFromFields,
  resolveOrderPricingDisplay,
  resolvePaymentDisplayLabel,
} from '../../utils/orderPaymentDisplay';

describe('resolveOrderPricingDisplay', () => {
  it('prefers pricingBreakdown over legacy pricing fields', () => {
    expect(
      resolveOrderPricingDisplay({
        pricingBreakdown: { total: '29.00', currency: 'USD' },
        pricingAmount: '15.00',
        pricingCurrency: 'EUR',
      })
    ).toEqual({ amount: '29.00', currency: 'USD' });
  });

  it('falls back to pricingAmount and pricingCurrency', () => {
    expect(
      resolveOrderPricingDisplay({
        pricingAmount: '29.00',
        pricingCurrency: 'USD',
      })
    ).toEqual({ amount: '29.00', currency: 'USD' });
  });

  it('returns undefined when pricing currency is missing', () => {
    expect(resolveOrderPricingDisplay({ pricingAmount: '29.00' })).toBeUndefined();
  });
});

describe('isCrossCurrencyOrderPayment', () => {
  it('detects USD listing paid in ETH', () => {
    expect(
      isCrossCurrencyOrderPayment(
        { amount: '29.00', currency: 'USD' },
        'crypto:eip155:1:native',
        'ETH'
      )
    ).toBe(true);
  });

  it('returns false for same-currency orders', () => {
    expect(isCrossCurrencyOrderPayment({ amount: '29.00', currency: 'USD' }, 'USD', 'USD')).toBe(
      false
    );
  });
});

describe('isCrossCurrencyOrderPaymentFromFields', () => {
  it('resolves payment label from paymentCoin', () => {
    expect(
      isCrossCurrencyOrderPaymentFromFields({
        pricingAmount: '29.00',
        pricingCurrency: 'USD',
        paymentCoin: 'crypto:eip155:11155111:native',
        currency: 'ETH',
      })
    ).toBe(true);
  });
});

describe('resolvePaymentDisplayLabel', () => {
  it('uses payment coin display label when paymentCoin is set', () => {
    expect(resolvePaymentDisplayLabel('crypto:eip155:11155111:native', 'ETH')).toBeTruthy();
  });
});
