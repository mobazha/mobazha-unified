import { describe, expect, it } from 'vitest';
import {
  persistCheckoutPaymentPolicy,
  resolveCheckoutPaymentPolicyFromCheckoutItems,
  sanitizeCheckoutPaymentPolicySession,
} from '@mobazha/core';

describe('checkout payment policy propagation', () => {
  it('derives escrow_crypto_only from source-custody checkout items', () => {
    expect(
      resolveCheckoutPaymentPolicyFromCheckoutItems([
        {
          isAuthoritativeCollectibleTitle: true,
          hubLocation: 'source-custody',
        },
      ])
    ).toBe('escrow_crypto_only');
  });

  it('resets cached fiat when source-custody policy is persisted', () => {
    sessionStorage.setItem('checkout_selected_fiat_provider', 'stripe');
    persistCheckoutPaymentPolicy('escrow_crypto_only');
    sanitizeCheckoutPaymentPolicySession('escrow_crypto_only');
    expect(sessionStorage.getItem('checkout_selected_fiat_provider')).toBeNull();
  });
});
