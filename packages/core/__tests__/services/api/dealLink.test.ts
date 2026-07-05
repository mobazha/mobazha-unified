import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  acceptPublicDealLink,
  createDealLinkFeeQuote,
  getPublicDealLink,
} from '../../../services/api/dealLink';

vi.mock('../../../services/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  request: vi.fn(),
}));

vi.mock('../../../services/api/config', () => ({
  getHostingUrl: () => 'https://host.test',
  getAuthHeaders: () => ({ Authorization: 'Bearer token' }),
}));

import { get, post } from '../../../services/api/client';

describe('dealLink API service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a public deal link anonymously', async () => {
    vi.mocked(get).mockResolvedValue({
      token: 'tok',
      status: 'active',
      title: 'Offer',
      deliveryType: 'digital_file',
      priceAmount: '10',
      priceCurrency: 'USD',
      sellerPeerID: 'QmSeller',
      terms: {},
      purchaseTemplate: {
        listingHash: 'hash',
        quantity: '1',
        options: [],
        optionalFeatures: [],
      },
    });

    const deal = await getPublicDealLink('tok');
    expect(get).toHaveBeenCalledWith('https://host.test/platform/v1/public/deal-links/tok');
    expect(deal.sellerPeerID).toBe('QmSeller');
  });

  it('creates an immutable fee quote', async () => {
    vi.mocked(post).mockResolvedValue({
      id: 'quote-1',
      dealLinkID: 'deal-1',
      dealRevision: 1,
      termsHash: 'hash',
      schemaVersion: 1,
      policyVersion: '1',
      priceCurrency: 'USD',
      itemOrServiceAmount: '10',
      buyerServiceCharge: '0',
      paymentOrNetworkCost: '0',
      taxOrExternalCost: '0',
      buyerTotal: '10',
      grossOrderAmount: '10',
      discount: '0',
      sellerServiceCharge: '0',
      sellerPaymentCost: '0',
      sellerDistributionBudget: '10',
      estimatedSellerNet: '10',
      expiresAt: '2026-12-31T00:00:00Z',
      createdAt: '2026-07-05T00:00:00Z',
    });

    const quote = await createDealLinkFeeQuote('tok');
    expect(post).toHaveBeenCalledWith(
      'https://host.test/platform/v1/public/deal-links/tok/fee-quotes',
      undefined
    );
    expect(quote.buyerTotal).toBe('10');
    expect(quote.dealRevision).toBe(1);
    expect(quote.schemaVersion).toBe(1);
  });

  it('accepts a deal with auth and idempotency key', async () => {
    vi.mocked(post).mockResolvedValue({
      orderID: 'order-1',
      paymentSessionPath: '/v1/orders/order-1/payment-session',
      status: 'completed',
      feeQuoteID: 'quote-1',
    });

    const result = await acceptPublicDealLink('tok', { feeQuoteID: 'quote-1' }, 'idem-1');

    expect(post).toHaveBeenCalledWith(
      'https://host.test/platform/v1/public/deal-links/tok/accept',
      { feeQuoteID: 'quote-1' },
      { Authorization: 'Bearer token', 'Idempotency-Key': 'idem-1' }
    );
    expect(result.orderID).toBe('order-1');
  });
});
