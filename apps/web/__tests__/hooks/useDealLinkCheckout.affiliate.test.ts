// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, useDealLinkCheckout } from '@mobazha/core';
import type { DealLinkAcceptanceRequest, DealLinkFeeQuote, PublicDealLink } from '@mobazha/core';

const getPublicDealLinkMock = vi.fn<() => Promise<PublicDealLink>>();
const createDealLinkFeeQuoteMock = vi.fn<() => Promise<DealLinkFeeQuote>>();
const acceptPublicDealLinkMock =
  vi.fn<
    (
      token: string,
      payload: DealLinkAcceptanceRequest,
      idempotencyKey: string
    ) => Promise<{ orderID: string }>
  >();

vi.mock('@mobazha/core/services/api/dealLink', () => ({
  getPublicDealLink: () => getPublicDealLinkMock(),
  createDealLinkFeeQuote: () => createDealLinkFeeQuoteMock(),
  acceptPublicDealLink: (
    token: string,
    payload: DealLinkAcceptanceRequest,
    idempotencyKey: string
  ) => acceptPublicDealLinkMock(token, payload, idempotencyKey),
}));

const SELLER_A = 'QmSellerAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const SELLER_B = 'QmSellerBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

function deal(sellerPeerID: string): PublicDealLink {
  return {
    token: 'abc123',
    status: 'active',
    title: 'Private offer',
    deliveryType: 'digital_file',
    priceAmount: '49.00',
    priceCurrency: 'USD',
    sellerPeerID,
    expiresAt: '2099-12-31T00:00:00Z',
    terms: {},
    purchaseTemplate: {
      listingHash: 'QmListing',
      quantity: '1',
      options: [],
      optionalFeatures: [],
    },
  };
}

function quote(): DealLinkFeeQuote {
  return {
    id: 'quote-1',
    dealLinkID: 'deal-1',
    dealRevision: 1,
    termsHash: 'hash',
    schemaVersion: 1,
    policyVersion: '2026-01-01',
    priceCurrency: 'USD',
    itemOrServiceAmount: '49.00',
    buyerServiceCharge: '0',
    paymentOrNetworkCost: '0',
    taxOrExternalCost: '0',
    buyerTotal: '49.00',
    grossOrderAmount: '49.00',
    discount: '0',
    sellerServiceCharge: '0',
    sellerPaymentCost: '0',
    sellerDistributionBudget: '49.00',
    estimatedSellerNet: '49.00',
    expiresAt: '2099-12-31T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useDealLinkCheckout affiliate referral scoping', () => {
  beforeEach(() => {
    getPublicDealLinkMock.mockReset().mockResolvedValue(deal(SELLER_A));
    createDealLinkFeeQuoteMock.mockReset().mockResolvedValue(quote());
    acceptPublicDealLinkMock.mockReset().mockResolvedValue({ orderID: 'order-1' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('attaches the referral session when it belongs to the same seller', async () => {
    const { result } = renderHook(() =>
      useDealLinkCheckout('abc123', {
        isAuthenticated: true,
        affiliateReferral: {
          referralSessionID: 'referral-1',
          sellerPeerID: SELLER_A,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      })
    );

    await flush();
    await act(async () => {
      await result.current.acceptDeal();
    });

    expect(acceptPublicDealLinkMock).toHaveBeenCalledWith(
      'abc123',
      expect.objectContaining({ affiliateReferralSessionID: 'referral-1' }),
      expect.any(String)
    );
  });

  it('does not attach a referral session captured for a different seller', async () => {
    const { result } = renderHook(() =>
      useDealLinkCheckout('abc123', {
        isAuthenticated: true,
        affiliateReferral: {
          referralSessionID: 'referral-1',
          sellerPeerID: SELLER_B,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      })
    );

    await flush();
    await act(async () => {
      await result.current.acceptDeal();
    });

    const [, payload] = acceptPublicDealLinkMock.mock.calls[0] ?? [];
    expect(payload).not.toHaveProperty('affiliateReferralSessionID');
  });

  it('does not add a referral field to a normal checkout with no captured session', async () => {
    const { result } = renderHook(() =>
      useDealLinkCheckout('abc123', { isAuthenticated: true, affiliateReferral: null })
    );

    await flush();
    await act(async () => {
      await result.current.acceptDeal();
    });

    const [, payload] = acceptPublicDealLinkMock.mock.calls[0] ?? [];
    expect(payload).not.toHaveProperty('affiliateReferralSessionID');
  });

  it('clears the referral session after an affiliate/referral-related acceptance error', async () => {
    acceptPublicDealLinkMock.mockRejectedValueOnce(
      new ApiError('unknown referral session', 410, 'REFERRAL_EXPIRED')
    );
    const onClearAffiliateReferral = vi.fn();

    const { result } = renderHook(() =>
      useDealLinkCheckout('abc123', {
        isAuthenticated: true,
        affiliateReferral: {
          referralSessionID: 'referral-1',
          sellerPeerID: SELLER_A,
          expiresAt: '2099-01-01T00:00:00Z',
        },
        onClearAffiliateReferral,
      })
    );

    await flush();
    await act(async () => {
      await result.current.acceptDeal();
    });

    expect(onClearAffiliateReferral).toHaveBeenCalledTimes(1);
  });

  it('does not clear the referral session for an unrelated acceptance error', async () => {
    acceptPublicDealLinkMock.mockRejectedValueOnce(
      new ApiError('fee quote expired', 410, 'QUOTE_EXPIRED')
    );
    const onClearAffiliateReferral = vi.fn();

    const { result } = renderHook(() =>
      useDealLinkCheckout('abc123', {
        isAuthenticated: true,
        affiliateReferral: {
          referralSessionID: 'referral-1',
          sellerPeerID: SELLER_A,
          expiresAt: '2099-01-01T00:00:00Z',
        },
        onClearAffiliateReferral,
      })
    );

    await flush();
    await act(async () => {
      await result.current.acceptDeal();
    });

    expect(onClearAffiliateReferral).not.toHaveBeenCalled();
  });
});
