// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { normalizeCheckoutPaymentPolicy, type CheckoutPaymentPolicy } from '@mobazha/core';

export type PaymentPageOrderDestination = 'checkout' | 'confirmation' | 'order-detail';

interface FiatPaymentReturnUrlOptions {
  origin: string;
  orderID: string;
  vendorPeerID?: string;
  providerID: string;
  isDealBacked: boolean;
}

function buildFiatPaymentReturnUrl(
  options: FiatPaymentReturnUrlOptions,
  verificationPending: boolean
): string {
  const url = new URL('/payment', options.origin);
  url.searchParams.set('orderID', options.orderID);
  url.searchParams.set('fiatProvider', options.providerID);
  if (verificationPending) url.searchParams.set('fiatReturn', '1');
  if (options.vendorPeerID) url.searchParams.set('vendorPeerID', options.vendorPeerID);
  if (options.isDealBacked) url.searchParams.set('source', 'deal_link');
  return url.toString();
}

export function buildFiatPaymentVerificationUrl(options: FiatPaymentReturnUrlOptions): string {
  return buildFiatPaymentReturnUrl(options, true);
}

export function buildFiatPaymentCancelUrl(options: FiatPaymentReturnUrlOptions): string {
  return buildFiatPaymentReturnUrl(options, false);
}

const PAYMENT_OPEN_STATES = new Set(['AWAITING_PAYMENT', 'AWAITING_PAYMENT_VERIFICATION']);
const PAYMENT_UNSUCCESSFUL_STATES = new Set([
  'CANCELED',
  'CANCELLED',
  'DECLINED',
  'EXPIRED',
  'REFUNDED',
  'PROCESSING_ERROR',
]);

/**
 * Keep unpaid orders in checkout, send failed/expired orders to their detail page,
 * and reserve the confirmation page for orders that advanced through payment.
 */
export function resolvePaymentPageOrderDestination(
  state: string | null | undefined
): PaymentPageOrderDestination {
  const normalized = state?.trim().toUpperCase();
  if (!normalized || PAYMENT_OPEN_STATES.has(normalized)) return 'checkout';
  if (PAYMENT_UNSUCCESSFUL_STATES.has(normalized)) return 'order-detail';
  return 'confirmation';
}

/** True when an in-flight fetch still matches the payment page's active order ID. */
export function isActivePaymentOrderFetch(
  requestedOrderID: string | null | undefined,
  activeOrderID: string | null | undefined
): boolean {
  return Boolean(requestedOrderID) && requestedOrderID === activeOrderID;
}

/**
 * Payment preparation must stay on the seller runtime that accepted the
 * order. Passing the peer explicitly also prevents the quote and session
 * requests from racing the global store context during Deal checkout.
 */
export function resolvePaymentRuntimeVendorPeerID(options: {
  isDealBacked: boolean;
  vendorPeerID?: string | null;
}): string | undefined {
  return options.vendorPeerID?.trim() || undefined;
}

/** URL paymentPolicy is only a pre-order hint; never pass it after order metadata locks policy. */
export function resolvePaymentPageRestoreOptions(options: {
  /** Order ID whose listing metadata established checkout payment policy. */
  orderPaymentPolicyLockedForOrderID?: string | null;
  orderID?: string;
  urlPaymentPolicy?: string | null;
}): { orderID?: string; paymentPolicy?: CheckoutPaymentPolicy } {
  const isLockedForCurrentOrder =
    Boolean(options.orderID) && options.orderPaymentPolicyLockedForOrderID === options.orderID;

  if (isLockedForCurrentOrder) {
    return { orderID: options.orderID };
  }

  return {
    orderID: options.orderID,
    paymentPolicy: options.urlPaymentPolicy
      ? normalizeCheckoutPaymentPolicy(options.urlPaymentPolicy)
      : undefined,
  };
}
