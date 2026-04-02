import { describe, expect, it } from 'vitest';

import {
  assetIdFromTokenId,
  getChainFromCoin,
  isCanonicalPaymentCoin,
  mustCanonicalCoin,
  getTokenByPaymentCoin,
  getTokenDecimals,
  parseCanonicalPaymentCoin,
} from '../../data/tokens';

describe('mustCanonicalCoin', () => {
  it('rejects non-canonical token IDs in hardcut mode', () => {
    expect(() => mustCanonicalCoin('BSCUSDT')).toThrow(/non-canonical payment coin/i);
    expect(() => mustCanonicalCoin('TRXUSDT')).toThrow(/non-canonical payment coin/i);
    expect(() => mustCanonicalCoin('DAI')).toThrow(/non-canonical payment coin/i);
    expect(() => mustCanonicalCoin('BUSD')).toThrow(/non-canonical payment coin/i);
  });

  it('returns canonical crypto/fiat input as-is', () => {
    expect(mustCanonicalCoin('crypto:eip155:1:native')).toBe('crypto:eip155:1:native');
    expect(mustCanonicalCoin('fiat:stripe:USD')).toBe('fiat:stripe:USD');
  });

  it('resolves canonical eip155 token coin to token config and decimals', () => {
    const canonicalBscUsdt = 'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955';
    const token = getTokenByPaymentCoin(canonicalBscUsdt);
    expect(token?.id).toBe('BSCUSDT');
    expect(getTokenDecimals(canonicalBscUsdt)).toBe(6);
    expect(getChainFromCoin(canonicalBscUsdt)).toBe('BSC');
  });

  it('resolves canonical native coins to chain symbols', () => {
    expect(getChainFromCoin('crypto:bip122:000000000019d6689c085ae165831e93:native')).toBe('BTC');
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

  it('provides explicit tokenId -> canonical assetId mapping helper', () => {
    expect(assetIdFromTokenId('BSCUSDT')).toBe(
      'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955'
    );
    expect(assetIdFromTokenId('TRXUSDT')).toBe(
      'crypto:tron:mainnet:trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    );
    expect(assetIdFromTokenId('UNKNOWN')).toBeUndefined();
  });

  it('can quickly detect canonical values', () => {
    expect(isCanonicalPaymentCoin('crypto:eip155:1:native')).toBe(true);
    expect(isCanonicalPaymentCoin('fiat:stripe:USD')).toBe(true);
    expect(isCanonicalPaymentCoin('ETHUSDT')).toBe(false);
  });
});
