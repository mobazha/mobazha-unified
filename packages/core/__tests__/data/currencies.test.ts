import { describe, expect, it } from 'vitest';
import { getCurrencyByCode, getCurrencyDecimals, isCryptoCurrency } from '../../data/currencies';

describe('Monero currency metadata', () => {
  it('uses the canonical 12-decimal atomic-unit precision', () => {
    expect(getCurrencyDecimals('XMR')).toBe(12);
    expect(getCurrencyByCode('XMR')).toMatchObject({
      code: 'XMR',
      name: 'Monero',
      decimals: 12,
      type: 'crypto',
    });
    expect(isCryptoCurrency('XMR')).toBe(true);
  });
});
