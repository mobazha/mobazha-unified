import { describe, expect, it } from 'vitest';
import type { CommerceGuestCheckoutSettings, CommerceGuestOrderResponse } from './contracts';
import { INITIAL_COMMERCE_GUEST_CHECKOUT_STATE, commerceGuestCheckoutReducer } from './workflow';

const settings: CommerceGuestCheckoutSettings = {
  enabled: true,
  acceptedCoins: ['ALT'],
  availableCoins: ['ALT'],
  paymentTimeoutMinutes: 30,
};

const order: CommerceGuestOrderResponse = {
  orderToken: 'order-1',
  paymentAddress: 'address-1',
  paymentAmount: '10',
  paymentCoin: 'ALT',
  priceCurrency: 'USD',
  priceDivisibility: 2,
  expiresAt: '2026-07-04T12:00:00Z',
  items: [],
};

describe('commerceGuestCheckoutReducer', () => {
  it('models settings load, submit and payment handoff', () => {
    const loading = commerceGuestCheckoutReducer(INITIAL_COMMERCE_GUEST_CHECKOUT_STATE, {
      type: 'load-started',
    });
    const ready = commerceGuestCheckoutReducer(loading, {
      type: 'settings-loaded',
      settings,
    });
    const submitting = commerceGuestCheckoutReducer(ready, {
      type: 'submit-started',
      settings,
    });
    const awaiting = commerceGuestCheckoutReducer(submitting, {
      type: 'order-created',
      settings,
      order,
    });

    expect(loading.status).toBe('loading-settings');
    expect(ready).toEqual({ status: 'ready', settings });
    expect(submitting).toEqual({ status: 'submitting', settings });
    expect(awaiting).toEqual({ status: 'awaiting-payment', settings, order });
  });

  it('fails closed when checkout or all runtime payment methods are disabled', () => {
    expect(
      commerceGuestCheckoutReducer(INITIAL_COMMERCE_GUEST_CHECKOUT_STATE, {
        type: 'settings-loaded',
        settings: { ...settings, enabled: false },
      })
    ).toMatchObject({ status: 'unavailable', reason: 'disabled' });

    expect(
      commerceGuestCheckoutReducer(INITIAL_COMMERCE_GUEST_CHECKOUT_STATE, {
        type: 'settings-loaded',
        settings: { ...settings, availableCoins: [] },
      })
    ).toMatchObject({ status: 'unavailable', reason: 'no-payment-methods' });
  });

  it('preserves loaded settings across a retryable create-order failure', () => {
    const failure = new Error('offline');
    const failed = commerceGuestCheckoutReducer(
      { status: 'submitting', settings },
      {
        type: 'operation-failed',
        operation: 'create-order',
        settings,
        error: failure,
      }
    );

    expect(failed).toEqual({
      status: 'error',
      operation: 'create-order',
      settings,
      error: failure,
    });
    expect(commerceGuestCheckoutReducer(failed, { type: 'error-reset' })).toEqual({
      status: 'ready',
      settings,
    });
  });
});
