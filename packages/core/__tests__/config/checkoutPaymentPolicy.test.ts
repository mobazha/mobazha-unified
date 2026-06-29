import { beforeEach, describe, expect, it } from 'vitest';
import {
  isFiatAllowedByCheckoutPaymentPolicy,
  normalizeCheckoutPaymentPolicy,
  persistCheckoutPaymentPolicy,
  readCheckoutPaymentPolicyFromSession,
  resolveCheckoutPaymentPolicyFromCheckoutItems,
  sanitizeCheckoutPaymentPolicySession,
} from '../../config/checkoutPaymentPolicy';
import { syncCheckoutPaymentSessionStorage } from '../../config/paymentMethodVisibility';

describe('checkoutPaymentPolicy', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('requires escrow crypto only for source-custody authoritative titles', () => {
    expect(
      resolveCheckoutPaymentPolicyFromCheckoutItems([
        { isAuthoritativeCollectibleTitle: true, hubLocation: 'source-custody' },
      ])
    ).toBe('escrow_crypto_only');

    expect(
      resolveCheckoutPaymentPolicyFromCheckoutItems([
        { isAuthoritativeCollectibleTitle: true, hubLocation: 'hub' },
      ])
    ).toBe('all');

    expect(
      resolveCheckoutPaymentPolicyFromCheckoutItems([{ isAuthoritativeCollectibleTitle: false }])
    ).toBe('all');
  });

  it('disallows fiat under escrow_crypto_only even when fiat GA is enabled later', () => {
    expect(isFiatAllowedByCheckoutPaymentPolicy('escrow_crypto_only')).toBe(false);
    expect(isFiatAllowedByCheckoutPaymentPolicy('all')).toBe(false);
  });

  it('persists policy and scrubs cached fiat selection from session storage', () => {
    sessionStorage.setItem('checkout_selected_fiat_provider', 'stripe');
    sessionStorage.setItem('checkout_selected_token', 'ETH');

    persistCheckoutPaymentPolicy('escrow_crypto_only');
    sanitizeCheckoutPaymentPolicySession('escrow_crypto_only');

    expect(readCheckoutPaymentPolicyFromSession()).toBe('escrow_crypto_only');
    expect(sessionStorage.getItem('checkout_selected_fiat_provider')).toBeNull();

    const synced = syncCheckoutPaymentSessionStorage({
      paymentPolicy: normalizeCheckoutPaymentPolicy('escrow_crypto_only'),
    });
    expect(synced.fiatProvider).toBeUndefined();
    expect(synced.category).toBe('crypto');
    expect(synced.tokenId).toBe('ETH');
  });

  it('isolates persisted policy by order instead of leaking the checkout draft', () => {
    persistCheckoutPaymentPolicy('escrow_crypto_only');
    persistCheckoutPaymentPolicy('escrow_crypto_only', 'source-order');
    persistCheckoutPaymentPolicy('all', 'ordinary-order');

    expect(readCheckoutPaymentPolicyFromSession('source-order')).toBe('escrow_crypto_only');
    expect(readCheckoutPaymentPolicyFromSession('ordinary-order')).toBe('all');
    expect(readCheckoutPaymentPolicyFromSession('unknown-order')).toBe('all');
    expect(readCheckoutPaymentPolicyFromSession()).toBe('escrow_crypto_only');
  });
});
