// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { CommerceGuestOrderRequest } from '@mobazha/commerce-kit/checkout';
import type { GuestCartItem } from '../stores/guestCartStore';
import type { Address } from '../types/common';
import { toISOCountryCode } from './countryUtils';

export interface GuestShippingAddressPayload extends Record<string, unknown> {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressNotes?: string;
}

export function buildGuestShippingAddressPayload(addr: Address): GuestShippingAddressPayload {
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

export function normalizeGuestShippingCountry(value: string): string {
  const code = toISOCountryCode(value).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

export function buildGuestOrderRequest(
  items: GuestCartItem[],
  addr: Address | null,
  encryptedAddr: string | null,
  email: string,
  coin: string,
  affiliateReferralSessionID?: string
): CommerceGuestOrderRequest {
  return {
    items: items.map(item => ({
      listingSlug: item.slug,
      listingHash: item.listingHash,
      quantity: item.quantity,
      options: item.options?.map(option => ({ [option.name]: option.value })),
      shippingOption: item.shipping?.name,
      shippingService: item.shipping?.service,
    })),
    paymentCoin: coin,
    contactEmail: email || undefined,
    affiliateReferralSessionID: affiliateReferralSessionID?.trim() || undefined,
    shippingCountry: addr ? normalizeGuestShippingCountry(addr.country) || undefined : undefined,
    ...(addr !== null && encryptedAddr
      ? { shippingAddress: encryptedAddr }
      : addr !== null
        ? { shippingAddress: buildGuestShippingAddressPayload(addr) }
        : {}),
  };
}
