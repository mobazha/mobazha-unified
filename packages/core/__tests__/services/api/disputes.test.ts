import { describe, expect, it } from 'vitest';
import { formatCaseListAmount } from '../../../services/api/disputes';

describe('formatCaseListAmount', () => {
  it('formats minimal-unit ETH amount with canonical payment coin', () => {
    const result = formatCaseListAmount(
      {
        amount: '1001000000000000000',
        currency: { code: 'ETH', divisibility: 18 },
      },
      'crypto:eip155:1:native'
    );
    expect(result.totalDisplay).toBe('1.001 ETH');
    expect(result.coin).toBe('ETH');
    expect(result.amountMinimal).toBe('1001000000000000000');
  });

  it('formats USD-style fiat amounts', () => {
    const result = formatCaseListAmount({
      amount: '4999',
      currency: { code: 'USD', divisibility: 2 },
    });
    expect(result.totalDisplay).toBe('49.99 USD');
    expect(result.coin).toBe('USD');
  });
});
