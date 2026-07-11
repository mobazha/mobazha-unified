// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import type { GuestCartItem } from '@mobazha/core/stores';
import { buildOrderRequest } from '@/app/guest-checkout/buildOrderRequest';

function item(overrides: Partial<GuestCartItem> = {}): GuestCartItem {
  return {
    slug: 'listing-1',
    listingHash: 'QmListing1',
    quantity: 1,
    vendorPeerID: 'QmSellerA',
    ...overrides,
  } as GuestCartItem;
}

describe('guest checkout buildOrderRequest', () => {
  it('does not add an affiliate referral field for a normal checkout', () => {
    const req = buildOrderRequest([item()], null, null, 'buyer@example.com', 'BTC');
    expect(req.affiliateReferralSessionID).toBeUndefined();
  });

  it('carries a same-seller referral session id, trimmed', () => {
    const req = buildOrderRequest(
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
    const req = buildOrderRequest([item()], null, null, 'buyer@example.com', 'BTC', '   ');
    expect(req.affiliateReferralSessionID).toBeUndefined();
  });
});
