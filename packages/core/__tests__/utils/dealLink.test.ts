import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/client';
import {
  buildDealLinkAcceptanceRequest,
  buildDealLinkPaymentHref,
  classifyDealLinkError,
  computeDealLinkCanAccept,
  createDealLinkIdempotencyKey,
  getDealLinkFeeLineItems,
  isDealLinkFeeQuoteExpired,
  isPublicDealLinkExpired,
  normalizeDealLinkFeeQuote,
  normalizePublicDealLink,
  resolveDealLinkAcceptanceWindowDays,
  resolveDealLinkIdempotencyState,
} from '../../utils/dealLink';

const hostingDealResponse = {
  token: 'abc123',
  status: 'active',
  title: 'Private offer',
  description: 'One-time course access',
  deliveryType: 'digital_file',
  priceAmount: '49.00',
  priceCurrency: 'USD',
  sellerPeerID: 'QmSellerPeerID1234567890abcdefghijklmnop',
  expiresAt: '2026-12-31T00:00:00Z',
  terms: {
    acceptanceHours: 72,
    deliverables: ['course access', 'support call'],
    refund: 'before_download',
  },
  purchaseTemplate: {
    listingHash: 'QmListing',
    quantity: '1',
    options: [],
    optionalFeatures: [],
  },
};

const hostingQuoteResponse = {
  id: 'quote-1',
  dealLinkID: 'deal-1',
  dealRevision: 3,
  termsHash: 'hash-abc',
  schemaVersion: 1,
  policyVersion: '2026-03-01',
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
  expiresAt: '2026-12-31T00:00:00Z',
  createdAt: '2026-07-05T00:00:00Z',
};

describe('normalizePublicDealLink', () => {
  it('maps the current hosting public deal response without seller/listing objects', () => {
    const deal = normalizePublicDealLink(hostingDealResponse, 'fallback');

    expect(deal).toMatchObject({
      token: 'abc123',
      status: 'active',
      title: 'Private offer',
      deliveryType: 'digital_file',
      priceAmount: '49.00',
      priceCurrency: 'USD',
      sellerPeerID: 'QmSellerPeerID1234567890abcdefghijklmnop',
    });
    expect(deal).not.toHaveProperty('seller');
    expect(deal).not.toHaveProperty('listing');
    expect(deal.terms.deliverables).toEqual(['course access', 'support call']);
    expect(deal.terms.refund).toBe('before_download');
    expect(resolveDealLinkAcceptanceWindowDays(deal)).toBe(3);
  });
});

describe('normalizeDealLinkFeeQuote', () => {
  it('maps dealFeeQuoteResponse fields exactly', () => {
    const quote = normalizeDealLinkFeeQuote(hostingQuoteResponse);

    expect(quote).toEqual(hostingQuoteResponse);
  });

  it('always exposes explicit zero buyer costs in fee lines', () => {
    const quote = normalizeDealLinkFeeQuote(hostingQuoteResponse);
    const lines = getDealLinkFeeLineItems(quote);

    expect(lines).toHaveLength(5);
    expect(lines.map(line => line.key)).toEqual([
      'itemOrServiceAmount',
      'buyerServiceCharge',
      'paymentOrNetworkCost',
      'taxOrExternalCost',
      'discount',
    ]);
    expect(lines.find(line => line.key === 'paymentOrNetworkCost')?.amount).toBe('0');
    expect(lines.find(line => line.key === 'buyerServiceCharge')?.amount).toBe('0');
  });
});

describe('acceptance helpers', () => {
  it('submits feeQuoteID and optional attribution claim', () => {
    expect(buildDealLinkAcceptanceRequest('quote-1')).toEqual({ feeQuoteID: 'quote-1' });
    expect(buildDealLinkAcceptanceRequest('quote-1', 'claim-token')).toEqual({
      feeQuoteID: 'quote-1',
      attributionClaim: 'claim-token',
    });
  });

  it('creates payment redirect using the established orderID query contract', () => {
    expect(buildDealLinkPaymentHref('order-123')).toBe(
      '/payment?orderID=order-123&source=deal_link'
    );
  });

  it('generates idempotency keys', () => {
    expect(createDealLinkIdempotencyKey()).toMatch(/^([0-9a-f-]{36}|deal-\d+-[a-z0-9]+)$/);
  });
});

describe('classifyDealLinkError', () => {
  it('maps missing or expired fee quotes before generic deal expiry/not-found', () => {
    expect(classifyDealLinkError(new ApiError('fee quote expired', 410, 'QUOTE_EXPIRED'))).toBe(
      'quote_expired'
    );
    expect(classifyDealLinkError(new ApiError('fee quote not found', 404, 'NOT_FOUND'))).toBe(
      'quote_expired'
    );
    expect(classifyDealLinkError(new ApiError('deal link expired', 410, 'DEAL_EXPIRED'))).toBe(
      'expired'
    );
    expect(classifyDealLinkError(new ApiError('deal link not found', 404, 'NOT_FOUND'))).toBe(
      'not_found'
    );
  });
});

describe('expiry helpers', () => {
  const activeDeal = {
    token: 'x',
    status: 'active',
    title: 'Deal',
    deliveryType: 'digital_file',
    priceAmount: '1',
    priceCurrency: 'USD',
    sellerPeerID: 'QmSeller',
    terms: {},
    purchaseTemplate: {
      listingHash: 'hash',
      quantity: '1',
      options: [],
      optionalFeatures: [],
    },
  };

  it('detects expired deals and quotes', () => {
    expect(
      isPublicDealLinkExpired({
        ...activeDeal,
        expiresAt: '2000-01-01T00:00:00Z',
      })
    ).toBe(true);

    expect(
      isDealLinkFeeQuoteExpired({
        ...hostingQuoteResponse,
        expiresAt: '2000-01-01T00:00:00Z',
      })
    ).toBe(true);
  });

  it('disables acceptance when the quote expires at the current time', () => {
    const quote = {
      ...hostingQuoteResponse,
      expiresAt: '2026-07-05T12:00:02.000Z',
    };
    const deal = { ...activeDeal, expiresAt: '2026-12-31T00:00:00Z' };

    expect(
      computeDealLinkCanAccept(deal, quote, Date.parse('2026-07-05T12:00:00.000Z'), false)
    ).toBe(true);
    expect(
      computeDealLinkCanAccept(deal, quote, Date.parse('2026-07-05T12:00:03.000Z'), false)
    ).toBe(false);
  });
});

describe('idempotency helpers', () => {
  it('creates a fresh key when quote id changes and preserves key on retry', () => {
    const createKey = vi.fn().mockReturnValueOnce('idem-a').mockReturnValueOnce('idem-b');

    let state = resolveDealLinkIdempotencyState(
      'quote-a',
      { quoteId: null, idempotencyKey: '' },
      createKey
    );
    expect(state).toEqual({ quoteId: 'quote-a', idempotencyKey: 'idem-a' });

    state = resolveDealLinkIdempotencyState('quote-a', state, createKey);
    expect(state).toEqual({ quoteId: 'quote-a', idempotencyKey: 'idem-a' });

    state = resolveDealLinkIdempotencyState('quote-b', state, createKey);
    expect(state).toEqual({ quoteId: 'quote-b', idempotencyKey: 'idem-b' });

    state = resolveDealLinkIdempotencyState('quote-b', state, createKey);
    expect(state).toEqual({ quoteId: 'quote-b', idempotencyKey: 'idem-b' });

    expect(createKey).toHaveBeenCalledTimes(2);
  });
});
