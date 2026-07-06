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
  projectRuntimeCryptoPaymentMethods,
  sanitizeAcceptedPaymentCoins,
  sanitizeCheckoutFiatProvider,
  sanitizeCheckoutTokenId,
} from '../../config/paymentMethodVisibility';

function runtimeMethods(methods: Array<Record<string, unknown>>) {
  return {
    schemaVersion: 3,
    authMode: 'hosted',
    deployment: { mode: 'hosted', allowExternalResources: true },
    experience: { kind: 'platform' },
    capabilitiesReady: true,
    features: {},
    capabilities: {
      commerce: { storefront: true, storeAdmin: true, checkout: true },
      marketplace: {
        discovery: true,
        operator: true,
        selling: true,
        curation: true,
        sellerReview: true,
        customDomains: true,
        releasePublishing: true,
        attribution: true,
      },
      sovereign: { isolatedRuntime: false, managedFleet: false },
      payments: { methods },
    },
  };
}

describe('paymentMethodVisibility', () => {
  beforeEach(() => {
    initializeRuntimeConfig({});
  });

  it('fails closed for optional methods when the backend has no versioned capabilities', () => {
    expect(isTronPaymentVisible()).toBe(false);
    expect(isFiatPaymentVisible()).toBe(false);
    expect(filterVisibleAcceptedCurrencies(['BTC', 'crypto:tron:mainnet:native', 'ETH'])).toEqual(
      []
    );
    expect(filterVisibleFiatProviderIDs(['stripe', 'paypal'])).toEqual([]);
  });

  it('projects versioned backend payment capabilities', () => {
    const runtimeConfig = initializeRuntimeConfig(
      runtimeMethods([
        { id: 'XMR', kind: 'crypto', flow: 'address-transfer' },
        { id: 'BTC', kind: 'crypto', flow: 'address-transfer' },
        { id: 'ZEC', kind: 'crypto', flow: 'address-transfer', addressMode: 'transparent' },
        { id: 'stripe', kind: 'fiat', flow: 'provider-session' },
      ])
    );

    expect(isTronPaymentVisible()).toBe(false);
    expect(isFiatPaymentVisible()).toBe(true);
    expect(filterVisibleAcceptedCurrencies(['BTC', 'ETH', 'ZEC'])).toEqual(['BTC', 'ZEC']);
    expect(
      sanitizeAcceptedPaymentCoins(['crypto:monero:mainnet:native', 'crypto:tron:mainnet:native'])
    ).toEqual(['crypto:monero:mainnet:native']);
    expect(filterVisibleFiatProviderIDs(['stripe', 'paypal'])).toEqual(['stripe']);
    expect(sanitizeCheckoutFiatProvider('stripe')).toBe('stripe');
    expect(sanitizeCheckoutFiatProvider('paypal')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('ZEC')).toBe('ZEC');
    expect(getVisibleSupportedChainCount()).toBe(3);
    expect(projectRuntimeCryptoPaymentMethods(runtimeConfig)).toEqual([
      { id: 'XMR', name: 'Monero' },
      { id: 'BTC', name: 'Bitcoin' },
      { id: 'ZEC', name: 'Zcash' },
    ]);
  });

  it('fails closed and normalizes aliases for marketing payment methods', () => {
    expect(projectRuntimeCryptoPaymentMethods(initializeRuntimeConfig({}))).toEqual([]);

    const runtimeConfig = initializeRuntimeConfig(
      runtimeMethods([
        { id: 'ETHEREUM', kind: 'crypto', flow: 'external-wallet' },
        { id: 'SOLANA', kind: 'crypto', flow: 'external-wallet' },
        { id: 'ethereum', kind: 'crypto', flow: 'external-wallet' },
        { id: 'stripe', kind: 'fiat', flow: 'provider-session' },
      ])
    );

    expect(projectRuntimeCryptoPaymentMethods(runtimeConfig)).toEqual([
      { id: 'ETH', name: 'Ethereum' },
      { id: 'SOL', name: 'Solana' },
    ]);
  });

  it('identifies TRON payment coins and filters tokens when unsupported', () => {
    expect(isTronPaymentCoin('TRX')).toBe(true);
    expect(isTronPaymentCoin('TRON')).toBe(true);
    expect(isTronPaymentCoin('TRXUSDT')).toBe(true);
    expect(isTronPaymentCoin('BTC')).toBe(false);

    const tokens = [
      { id: 'BTC', chain: 'BTC' },
      { id: 'TRX', chain: 'TRON' },
      { id: 'TRXUSDT', chain: 'TRON' },
    ];
    expect(filterVisiblePaymentTokens(tokens)).toEqual([]);
  });

  it('fails closed for checkout selections absent from runtime capabilities', () => {
    expect(sanitizeAcceptedPaymentCoins(['BTC', 'TRX', 'ETH'])).toEqual([]);
    expect(sanitizeCheckoutTokenId('TRXUSDT')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('ZEC')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('BTC')).toBeUndefined();
  });

  it('reports zero visible chains for a fail-closed snapshot', () => {
    expect(getVisibleSupportedChainCount()).toBe(0);
  });
});
