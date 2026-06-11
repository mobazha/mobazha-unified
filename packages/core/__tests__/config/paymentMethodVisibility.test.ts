import { describe, expect, it } from 'vitest';
import { getSupportedChains } from '../../data/tokens';
import {
  filterVisibleAcceptedCurrencies,
  filterVisibleFiatProviderIDs,
  filterVisiblePaymentTokens,
  getVisibleSupportedChainCount,
  isFiatPaymentVisible,
  isTronPaymentCoin,
  isTronPaymentVisible,
  PAYMENT_METHOD_VISIBILITY,
  sanitizeAcceptedPaymentCoins,
  sanitizeCheckoutFiatProvider,
  sanitizeCheckoutTokenId,
} from '../../config/paymentMethodVisibility';

describe('paymentMethodVisibility', () => {
  it('defaults TRON and fiat to hidden', () => {
    expect(PAYMENT_METHOD_VISIBILITY.tron).toBe(false);
    expect(PAYMENT_METHOD_VISIBILITY.fiat).toBe(false);
    expect(isTronPaymentVisible()).toBe(false);
    expect(isFiatPaymentVisible()).toBe(false);
  });

  it('identifies TRON payment coins and asset ids', () => {
    expect(isTronPaymentCoin('TRX')).toBe(true);
    expect(isTronPaymentCoin('TRON')).toBe(true);
    expect(isTronPaymentCoin('TRXUSDT')).toBe(true);
    expect(isTronPaymentCoin('BTC')).toBe(false);
    expect(filterVisibleAcceptedCurrencies(['BTC', 'crypto:tron:mainnet:native', 'ETH'])).toEqual([
      'BTC',
      'ETH',
    ]);
  });

  it('filters TRON tokens when hidden', () => {
    const tokens = [
      { id: 'BTC', chain: 'BTC' },
      { id: 'TRX', chain: 'TRON' },
      { id: 'TRXUSDT', chain: 'TRON' },
    ];
    expect(filterVisiblePaymentTokens(tokens)).toEqual([{ id: 'BTC', chain: 'BTC' }]);
  });

  it('sanitizes guest-checkout and checkout session selections', () => {
    expect(sanitizeAcceptedPaymentCoins(['BTC', 'TRX', 'ETH'])).toEqual(['BTC', 'ETH']);
    expect(sanitizeCheckoutTokenId('TRXUSDT')).toBeUndefined();
    expect(sanitizeCheckoutTokenId('BTC')).toBe('BTC');
    expect(sanitizeCheckoutFiatProvider('stripe')).toBeUndefined();
  });

  it('filters fiat providers when hidden', () => {
    expect(filterVisibleFiatProviderIDs(['stripe', 'paypal'])).toEqual([]);
  });

  it('excludes TRON from visible supported chain count when hidden', () => {
    const all = getSupportedChains().length;
    const withoutTron = getSupportedChains().filter(c => c.id !== 'TRON').length;
    expect(getVisibleSupportedChainCount()).toBe(isTronPaymentVisible() ? all : withoutTron);
  });
});
