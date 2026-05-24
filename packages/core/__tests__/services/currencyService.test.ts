import { describe, expect, it } from 'vitest';

import { formatPrice, formatPaymentAmount } from '../../services/currencyService';

describe('formatPrice crypto precision', () => {
  it('never rounds small non-zero BTC amounts to zero', () => {
    expect(formatPrice(0.00029838, 'BTC')).toBe('0.0002984 BTC');
    expect(formatPrice('0.00029838', 'BTC')).toBe('0.0002984 BTC');
  });

  it('displays ETH with currency code instead of Xi symbol', () => {
    expect(formatPrice(0.01, 'ETH')).toBe('0.01 ETH');
  });

  it('shows enough decimals for 1 satoshi', () => {
    expect(formatPrice(0.00000001, 'BTC')).toBe('0.00000001 BTC');
  });
});

describe('formatPaymentAmount', () => {
  it('returns null when amount or label is missing', () => {
    expect(formatPaymentAmount(undefined, undefined, undefined)).toBeNull();
    expect(formatPaymentAmount('1', undefined, '')).toBeNull();
  });

  it('formats crypto with significant digits', () => {
    expect(formatPaymentAmount('0.00029838', undefined, 'BTC')).toBe('0.0002984 BTC');
  });
});
