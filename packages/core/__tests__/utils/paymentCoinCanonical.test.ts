import { describe, expect, it } from 'vitest';

import {
  getChainFromCoin,
  getTokenByPaymentCoin,
  getTokenDecimals,
  parseCanonicalPaymentCoin,
  toCanonicalPaymentCoin,
} from '../../data/tokens';

describe('toCanonicalPaymentCoin', () => {
  it('maps legacy chain+token to canonical asset id', () => {
    expect(toCanonicalPaymentCoin('BSCUSDT')).toBe(
      'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955'
    );
  });

  it('maps TRXUSDT token id to canonical asset id', () => {
    expect(toCanonicalPaymentCoin('TRXUSDT')).toBe(
      'crypto:tron:mainnet:trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    );
  });

  it('maps DAI/BUSD legacy symbols to canonical asset ids', () => {
    expect(toCanonicalPaymentCoin('DAI')).toBe(
      'crypto:eip155:1:erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F'
    );
    expect(toCanonicalPaymentCoin('BUSD')).toBe(
      'crypto:eip155:56:erc20:0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    );
  });

  it('returns canonical crypto/fiat input as-is', () => {
    expect(toCanonicalPaymentCoin('crypto:eip155:1:native')).toBe('crypto:eip155:1:native');
    expect(toCanonicalPaymentCoin('fiat:stripe:USD')).toBe('fiat:stripe:USD');
  });

  it('resolves canonical eip155 token coin to token config and decimals', () => {
    const canonicalBscUsdt = 'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955';
    const token = getTokenByPaymentCoin(canonicalBscUsdt);
    expect(token?.id).toBe('BSCUSDT');
    expect(getTokenDecimals(canonicalBscUsdt)).toBe(6);
    expect(getChainFromCoin(canonicalBscUsdt)).toBe('BSC');
  });

  it('resolves canonical native coins to chain symbols', () => {
    expect(
      getChainFromCoin(
        'crypto:bip122:000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f:native'
      )
    ).toBe('BTC');
    expect(getChainFromCoin('crypto:tron:mainnet:native')).toBe('TRON');
  });

  it('parses canonical payment coin structure', () => {
    const parsed = parseCanonicalPaymentCoin('crypto:eip155:8453:native');
    expect(parsed).toEqual({
      namespace: 'eip155',
      chainRef: '8453',
      standard: 'native',
    });
  });
});
