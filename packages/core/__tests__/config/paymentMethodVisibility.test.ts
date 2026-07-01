import { beforeEach, describe, expect, it } from 'vitest';
import { initializeRuntimeConfig } from '../../config/runtimeConfig';
import {
  filterVisibleAcceptedCurrencies,
  filterVisibleFiatProviderIDs,
  filterVisiblePaymentTokens,
  getVisibleSupportedChainCount,
  isFiatPaymentVisible,
  isTronPaymentCoin,
  isTronPaymentVisible,
  sanitizeAcceptedPaymentCoins,
  sanitizeCheckoutFiatProvider,
  sanitizeCheckoutTokenId,
} from '../../config/paymentMethodVisibility';

describe('paymentMethodVisibility', () => {
  beforeEach(() => {
    initializeRuntimeConfig({});
  });

  it('fails closed for optional methods when the backend has no versioned capabilities', () => {
    expect(isTronPaymentVisible()).toBe(false);
    expect(isFiatPaymentVisible()).toBe(false);
    expect(filterVisibleAcceptedCurrencies(['BTC', 'crypto:tron:mainnet:native', 'ETH'])).toEqual([
      'BTC',
    ]);
    expect(filterVisibleFiatProviderIDs(['stripe', 'paypal'])).toEqual([]);
  });

  it('intersects versioned backend capabilities with edition policy', () => {
    initializeRuntimeConfig({
      schemaVersion: 2,
      capabilities: {
        payments: {
          methods: [
            { id: 'BTC', kind: 'crypto', flow: 'address-transfer' },
            { id: 'ZEC', kind: 'crypto', flow: 'address-transfer', addressMode: 'transparent' },
            { id: 'stripe', kind: 'fiat', flow: 'provider-session' },
          ],
        },
      },
    });

    expect(isTronPaymentVisible()).toBe(false);
    expect(isFiatPaymentVisible()).toBe(false);
    expect(filterVisibleAcceptedCurrencies(['BTC', 'ETH', 'ZEC'])).toEqual(['BTC']);
    expect(filterVisibleFiatProviderIDs(['stripe', 'paypal'])).toEqual([]);
    expect(sanitizeCheckoutFiatProvider('stripe')).toBeUndefined();
    expect(sanitizeCheckoutFiatProvider('paypal')).toBeUndefined();
    expect(getVisibleSupportedChainCount()).toBe(1);
  });

  it('identifies TRON payment coins and filters non-edition tokens', () => {
    expect(isTronPaymentCoin('TRX')).toBe(true);
    expect(isTronPaymentCoin('TRON')).toBe(true);
    expect(isTronPaymentCoin('TRXUSDT')).toBe(true);
    expect(isTronPaymentCoin('BTC')).toBe(false);

    const tokens = [
      { id: 'BTC', chain: 'BTC' },
      { id: 'TRX', chain: 'TRON' },
      { id: 'ETH', chain: 'ETH' },
      { id: 'LTC', chain: 'LTC' },
    ];
    expect(filterVisiblePaymentTokens(tokens)).toEqual([
      { id: 'BTC', chain: 'BTC' },
      { id: 'LTC', chain: 'LTC' },
    ]);
  });

  it('sanitizes guest-checkout and checkout session selections', () => {
    expect(sanitizeAcceptedPaymentCoins(['BTC', 'TRX', 'ETH', 'LTC'])).toEqual(['BTC', 'LTC']);
    expect(sanitizeCheckoutTokenId('TRXUSDT')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('ETH')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('BTC')).toBe('BTC');
  });

  it('filters fiat providers when hidden', () => {
    expect(filterVisibleFiatProviderIDs(['stripe', 'paypal'])).toEqual([]);
  });

  it('reports Community Edition supported chain count', () => {
    expect(getVisibleSupportedChainCount()).toBe(3);
  });
});
