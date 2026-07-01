/**
 * Guest order kind resolution (physical vs digital vs unknown).
 *
 * Used after order creation for fulfillment UI — separate from checkout-time
 * contract type homogeneity (see contractTypeCheckout.ts).
 */

import { CONTRACT_TYPE_DIGITAL, CONTRACT_TYPE_PHYSICAL } from './contractTypeCheckout';

export type GuestOrderKindLineItem = {
  contractType?: string | null;
};

export type GuestOrderKindHint = 'digital' | 'physical' | null;

/** Resolved guest order kind — never infer physical from missing metadata. */
export type GuestOrderKind = 'digital' | 'physical' | 'unknown';

/** Infer order kind from persisted line-item contract types (authoritative when present). */
export function inferGuestOrderKindFromItems(items: GuestOrderKindLineItem[]): GuestOrderKindHint {
  if (!items.length) return null;
  const types = items.map(item => item.contractType?.trim()).filter(Boolean);
  if (types.length !== items.length) return null;

  const distinct = new Set(types);
  if (distinct.size > 1) return null;

  if (distinct.has(CONTRACT_TYPE_DIGITAL)) return 'digital';
  if (distinct.has(CONTRACT_TYPE_PHYSICAL)) return 'physical';
  return null;
}

export function isMissingContractTypeReason(reason?: string | null): boolean {
  return reason?.trim() === 'missing_contract_type';
}

/** Combine delivery API + line items without defaulting non-digital to physical. */
export function resolveGuestOrderKind(input: {
  deliveryKnown: boolean;
  isDigitalFromApi?: boolean | null;
  deliveryReason?: string | null;
  kindFromItems: GuestOrderKindHint;
}): GuestOrderKind {
  if (input.deliveryKnown && isMissingContractTypeReason(input.deliveryReason)) {
    return 'unknown';
  }

  if (input.kindFromItems === 'digital') return 'digital';
  if (input.kindFromItems === 'physical') return 'physical';

  if (input.deliveryKnown) {
    if (input.isDigitalFromApi === true) return 'digital';
    // Delivery API "not digital" covers physical and other contract types — do not guess physical.
    return 'unknown';
  }

  return 'unknown';
}
