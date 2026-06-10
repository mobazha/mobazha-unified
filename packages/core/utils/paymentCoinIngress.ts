/**
 * Payment-coin keyed map lookups for ingress paths (e.g. buyer refund prefs).
 * Coin normalization lives in data/tokens.tryNormalizePaymentCoinToAssetId.
 */

import { tryNormalizePaymentCoinToAssetId } from '../data/tokens';

/** Lookup a value by payment coin (mirrors paymentaddress.LookupByPaymentCoin). */
export function lookupPaymentCoinAddress(
  values: Record<string, string> | undefined,
  paymentCoin: string | undefined
): string {
  if (!values || !paymentCoin) return '';

  const trimmedCoin = paymentCoin.trim();
  const direct = values[trimmedCoin]?.trim();
  if (direct) return direct;

  const normalized = tryNormalizePaymentCoinToAssetId(trimmedCoin);
  if (normalized) {
    const fromNormalized = values[normalized]?.trim();
    if (fromNormalized) return fromNormalized;
  }

  if (normalized) {
    for (const [coin, addr] of Object.entries(values)) {
      const keyNorm = tryNormalizePaymentCoinToAssetId(coin);
      if (keyNorm === normalized) {
        const value = addr?.trim();
        if (value) return value;
      }
    }
  }

  return '';
}
