// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import type { Address } from '@mobazha/core';
import { buildGuestOrderRequest } from '@mobazha/core';
import type { GuestCartItem } from '@mobazha/core/stores';

function item(overrides: Partial<GuestCartItem> = {}): GuestCartItem {
  return {
    slug: 'listing-1',
    listingHash: 'QmListing1',
    quantity: 1,
    vendorPeerID: 'QmSellerA',
    ...overrides,
  } as GuestCartItem;
}

const address: Address = {
  name: 'Buyer',
  addressLineOne: '1 Market Street',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94105',
  country: 'United States',
};

describe('guest checkout buildOrderRequest', () => {
  it('does not add an affiliate referral field for a normal checkout', () => {
    const req = buildGuestOrderRequest([item()], null, null, 'buyer@example.com', 'BTC');
    expect(req.affiliateReferralSessionID).toBeUndefined();
  });

  it('carries a same-seller referral session id, trimmed', () => {
    const req = buildGuestOrderRequest(
      [item()],
      null,
      null,
      'buyer@example.com',
      'BTC',
      '  referral-1  '
    );
    expect(req.affiliateReferralSessionID).toBe('referral-1');
  });

  it('omits a blank/whitespace-only referral session id', () => {
    const req = buildGuestOrderRequest([item()], null, null, 'buyer@example.com', 'BTC', '   ');
    expect(req.affiliateReferralSessionID).toBeUndefined();
  });

  it('normalizes the shipping country and preserves an encrypted address', () => {
    const req = buildGuestOrderRequest(
      [item()],
      address,
      '-----BEGIN PGP MESSAGE-----encrypted',
      'buyer@example.com',
      'BTC'
    );

    expect(req.shippingCountry).toBe('US');
    expect(req.shippingAddress).toBe('-----BEGIN PGP MESSAGE-----encrypted');
  });
});
