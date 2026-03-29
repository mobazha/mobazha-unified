import { describe, expect, it } from 'vitest';

import { toCanonicalPaymentCoin } from '../../data/tokens';

describe('toCanonicalPaymentCoin', () => {
  it('maps legacy chain+token to canonical asset id', () => {
    expect(toCanonicalPaymentCoin('BSCUSDT')).toBe(
      'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955'
    );
  });

  it('maps TRONUSDT alias to TRXUSDT canonical asset id', () => {
    expect(toCanonicalPaymentCoin('TRONUSDT')).toBe(
      'crypto:tron:mainnet:trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    );
  });

  it('returns canonical crypto/fiat input as-is', () => {
    expect(toCanonicalPaymentCoin('crypto:eip155:1:native')).toBe('crypto:eip155:1:native');
    expect(toCanonicalPaymentCoin('fiat:stripe:USD')).toBe('fiat:stripe:USD');
  });
});
