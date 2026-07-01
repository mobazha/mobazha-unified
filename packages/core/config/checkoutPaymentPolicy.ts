// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { isFiatPaymentVisible } from './paymentMethodFeatureFlags';
import {
  resolveCollectibleListingCustodyKind,
  type ParsedCollectibleListingMetadata,
} from '../collectibles/listing';

/** Checkout-wide payment constraints — apply in selector/provider, not per-button. */
export type CheckoutPaymentPolicy = 'all' | 'escrow_crypto_only';

export const CHECKOUT_PAYMENT_POLICY_VALUES = ['all', 'escrow_crypto_only'] as const;

const CHECKOUT_PAYMENT_POLICY_KEY = 'checkout_payment_policy';
const CHECKOUT_ORDER_PAYMENT_POLICY_PREFIX = `${CHECKOUT_PAYMENT_POLICY_KEY}:order:`;

function checkoutPaymentPolicyStorageKey(orderID?: string): string {
  const normalizedOrderID = orderID?.trim();
  return normalizedOrderID
    ? `${CHECKOUT_ORDER_PAYMENT_POLICY_PREFIX}${normalizedOrderID}`
    : CHECKOUT_PAYMENT_POLICY_KEY;
}

export function normalizeCheckoutPaymentPolicy(value: unknown): CheckoutPaymentPolicy {
  if (value === 'escrow_crypto_only') return 'escrow_crypto_only';
  return 'all';
}

export function isFiatAllowedByCheckoutPaymentPolicy(policy: CheckoutPaymentPolicy): boolean {
  return policy === 'all' && isFiatPaymentVisible();
}

export function resolveCheckoutPaymentPolicyFromCollectibleMeta(
  meta: Pick<ParsedCollectibleListingMetadata, 'hubLocation'>
): CheckoutPaymentPolicy {
  return resolveCollectibleListingCustodyKind(meta) === 'source' ? 'escrow_crypto_only' : 'all';
}

export function resolveCheckoutPaymentPolicyFromCheckoutItems(
  items: Array<{ isAuthoritativeCollectibleTitle?: boolean; hubLocation?: string }>
): CheckoutPaymentPolicy {
  const requiresEscrowCrypto = items.some(
    item =>
      item.isAuthoritativeCollectibleTitle &&
      resolveCollectibleListingCustodyKind({ hubLocation: item.hubLocation }) === 'source'
  );
  return requiresEscrowCrypto ? 'escrow_crypto_only' : 'all';
}

export function readCheckoutPaymentPolicyFromSession(orderID?: string): CheckoutPaymentPolicy {
  if (typeof window === 'undefined') return 'all';
  return normalizeCheckoutPaymentPolicy(
    sessionStorage.getItem(checkoutPaymentPolicyStorageKey(orderID))
  );
}

export function persistCheckoutPaymentPolicy(
  policy: CheckoutPaymentPolicy,
  orderID?: string
): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(checkoutPaymentPolicyStorageKey(orderID), policy);
}

export function clearCheckoutPaymentPolicyFromSession(orderID?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(checkoutPaymentPolicyStorageKey(orderID));
}

/** Strip cached fiat selection when policy forbids fiat checkout. */
export function sanitizeCheckoutPaymentPolicySession(policy: CheckoutPaymentPolicy): void {
  if (typeof window === 'undefined') return;
  if (policy !== 'escrow_crypto_only') return;

  sessionStorage.removeItem('checkout_selected_fiat_provider');
}
