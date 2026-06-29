import { beforeEach, describe, expect, it } from 'vitest';
import { getSupportedChains } from '../../data/tokens';
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

describe('paymentMethodVisibility', () => {
  beforeEach(() => {
    initializeRuntimeConfig({});
  });

  it('fails closed for optional methods when the backend has no versioned capabilities', () => {
    expect(isTronPaymentVisible()).toBe(false);
    expect(isFiatPaymentVisible()).toBe(false);
    expect(filterVisibleAcceptedCurrencies(['BTC', 'crypto:tron:mainnet:native', 'ETH'])).toEqual([
      'BTC',
      'ETH',
    ]);
    expect(filterVisibleFiatProviderIDs(['stripe', 'paypal'])).toEqual([]);
  });

  it('projects versioned backend payment capabilities', () => {
    const runtimeConfig = initializeRuntimeConfig({
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
    expect(isFiatPaymentVisible()).toBe(true);
    expect(filterVisibleAcceptedCurrencies(['BTC', 'ETH', 'ZEC'])).toEqual(['BTC', 'ZEC']);
    expect(filterVisibleFiatProviderIDs(['stripe', 'paypal'])).toEqual(['stripe']);
    expect(sanitizeCheckoutFiatProvider('stripe')).toBe('stripe');
    expect(sanitizeCheckoutFiatProvider('paypal')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('ZEC')).toBe('ZEC');
    expect(getVisibleSupportedChainCount()).toBe(2);
    expect(projectRuntimeCryptoPaymentMethods(runtimeConfig)).toEqual([
      { id: 'BTC', name: 'Bitcoin' },
      { id: 'ZEC', name: 'Zcash' },
    ]);
  });

  it('fails closed and normalizes aliases for marketing payment methods', () => {
    expect(projectRuntimeCryptoPaymentMethods(initializeRuntimeConfig({}))).toEqual([]);

    const runtimeConfig = initializeRuntimeConfig({
      schemaVersion: 2,
      capabilities: {
        payments: {
          methods: [
            { id: 'ETHEREUM', kind: 'crypto', flow: 'external-wallet' },
            { id: 'SOLANA', kind: 'crypto', flow: 'external-wallet' },
            { id: 'ethereum', kind: 'crypto', flow: 'external-wallet' },
            { id: 'stripe', kind: 'fiat', flow: 'provider-session' },
          ],
        },
      },
    });

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
    expect(filterVisiblePaymentTokens(tokens)).toEqual([{ id: 'BTC', chain: 'BTC' }]);
  });

  it('sanitizes legacy checkout selections', () => {
    expect(sanitizeAcceptedPaymentCoins(['BTC', 'TRX', 'ETH'])).toEqual(['BTC', 'ETH']);
    expect(sanitizeCheckoutTokenId('TRXUSDT')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('ZEC')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('BTC')).toBe('BTC');
  });

  it('uses the legacy visible chain count before capability bootstrap', () => {
    const withoutTron = getSupportedChains().filter(c => c.id !== 'TRON').length;
    expect(getVisibleSupportedChainCount()).toBe(withoutTron);
  });
});
