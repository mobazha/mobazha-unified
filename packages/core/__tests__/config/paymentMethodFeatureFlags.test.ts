// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import {
  isFiatPaymentVisible,
  isTronPaymentVisible,
  PAYMENT_METHOD_VISIBILITY,
} from '../../config/paymentMethodFeatureFlags';

describe('paymentMethodFeatureFlags', () => {
  it('defaults TRON and fiat to hidden', () => {
    expect(PAYMENT_METHOD_VISIBILITY.tron).toBe(false);
    expect(PAYMENT_METHOD_VISIBILITY.fiat).toBe(false);
    expect(isTronPaymentVisible()).toBe(false);
    expect(isFiatPaymentVisible()).toBe(false);
  });
});

describe('payment method config module graph', () => {
  it('loads checkoutPaymentPolicy without depending on paymentMethodVisibility', async () => {
    vi.resetModules();
    const policy = await import('../../config/checkoutPaymentPolicy');

    expect(policy.normalizeCheckoutPaymentPolicy('escrow_crypto_only')).toBe('escrow_crypto_only');
    expect(policy.isFiatAllowedByCheckoutPaymentPolicy('all')).toBe(false);
    expect(policy.isFiatAllowedByCheckoutPaymentPolicy('escrow_crypto_only')).toBe(false);
  });

  it('loads paymentMethodVisibility after checkoutPaymentPolicy with policy-aware session sync', async () => {
    vi.resetModules();
    await import('../../config/checkoutPaymentPolicy');
    const visibility = await import('../../config/paymentMethodVisibility');

    expect(visibility.isFiatPaymentVisible()).toBe(false);
    const synced = visibility.syncCheckoutPaymentSessionStorage({ paymentPolicy: 'all' });
    expect(synced.paymentPolicy).toBe('all');
    expect(synced.fiatProvider).toBeUndefined();
  });
});
