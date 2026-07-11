// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { Address } from '@mobazha/core';
import type { GuestCartItem } from '@mobazha/core/stores';
import type { CommerceGuestOrderRequest } from '@mobazha/commerce-kit/checkout';
import { normalizeShippingCountry } from '@/lib/guestShipping';

export function buildAddressPayload(addr: Address): {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressNotes?: string;
} {
  return {
    name: addr.name,
    address: addr.addressLineOne,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    addressNotes: addr.addressNotes || undefined,
  };
}

export function buildOrderRequest(
  items: GuestCartItem[],
  addr: Address | null,
  encryptedAddr: string | null,
  email: string,
  coin: string,
  affiliateReferralSessionID?: string
): CommerceGuestOrderRequest {
  return {
    items: items.map(i => ({
      listingSlug: i.slug,
      listingHash: i.listingHash,
      quantity: i.quantity,
      options: i.options?.map(opt => ({ [opt.name]: opt.value })),
      shippingOption: i.shipping?.name,
      shippingService: i.shipping?.service,
    })),
    paymentCoin: coin,
    contactEmail: email || undefined,
    affiliateReferralSessionID: affiliateReferralSessionID?.trim() || undefined,
    shippingCountry: addr ? normalizeShippingCountry(addr.country) || undefined : undefined,
    ...(addr !== null && encryptedAddr
      ? { shippingAddress: encryptedAddr }
      : addr !== null
        ? { shippingAddress: buildAddressPayload(addr) }
        : {}),
  };
}
