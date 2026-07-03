// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { normalizeCheckoutPaymentPolicy, type CheckoutPaymentPolicy } from '@mobazha/core';

/** True when an in-flight fetch still matches the payment page's active order ID. */
export function isActivePaymentOrderFetch(
  requestedOrderID: string | null | undefined,
  activeOrderID: string | null | undefined
): boolean {
  return Boolean(requestedOrderID) && requestedOrderID === activeOrderID;
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
