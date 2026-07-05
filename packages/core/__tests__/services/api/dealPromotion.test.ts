import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createDealPromotionLink,
  getPublicDealPromotionLink,
  issueDealAttributionClaim,
  listDealPromotionPrograms,
} from '../../../services/api/dealPromotion';

vi.mock('../../../services/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  request: vi.fn(),
}));

vi.mock('../../../services/api/helpers', () => ({
  hostingGet: vi.fn(),
  hostingPost: vi.fn(),
}));

vi.mock('../../../services/api/config', () => ({
  getHostingUrl: () => 'https://host.test',
  getAuthHeaders: () => ({ Authorization: 'Bearer token' }),
}));

import { get, post } from '../../../services/api/client';
import { hostingGet, hostingPost } from '../../../services/api/helpers';

describe('dealPromotion API service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists seller promotion programs', async () => {
    vi.mocked(hostingGet).mockResolvedValue([
      {
        id: 'prog-1',
        dealLinkID: 'deal-1',
        name: 'Creators',
        status: 'active',
        commissionRateBPS: 500,
        attributionWindowSeconds: 604800,
        declaredFundingSource: 'seller_manual_budget',
        settlementMode: 'manual_review_only',
        currency: 'USD',
        createdAt: '2026-07-05T00:00:00Z',
        updatedAt: '2026-07-05T00:00:00Z',
      },
    ]);

    const programs = await listDealPromotionPrograms();
    expect(hostingGet).toHaveBeenCalledWith('/platform/v1/deal-promotion-programs');
    expect(programs[0]?.settlementMode).toBe('manual_review_only');
  });

  it('resolves a public promotion link anonymously', async () => {
    vi.mocked(get).mockResolvedValue({
      programID: 'prog-1',
      programName: 'Creators',
      dealLinkID: 'deal-1',
      dealPublicPath: '/platform/v1/public/deal-links/deal-token',
      dealRevision: 1,
      termsHash: 'hash',
      currency: 'USD',
      commissionRateBPS: 500,
      attributionWindowSeconds: 604800,
      settlementMode: 'manual_review_only',
    });

    const link = await getPublicDealPromotionLink('promo-token');
    expect(get).toHaveBeenCalledWith(
      'https://host.test/platform/v1/public/deal-promotion-links/promo-token'
    );
    expect(link.dealPublicPath).toContain('deal-token');
  });

  it('issues a short-lived attribution claim', async () => {
    vi.mocked(post).mockResolvedValue({
      claimToken: 'claim-token',
      expiresAt: '2026-07-05T01:00:00Z',
      dealLinkID: 'deal-1',
      dealRevision: 1,
      termsHash: 'hash',
      programPolicyVersion: 'single-level-direct-v1',
      commissionRateBPS: 500,
      calculationBase: 'gross_order_amount',
      currency: 'USD',
      settlementMode: 'manual_review_only',
    });

    const claim = await issueDealAttributionClaim('promo-token');
    expect(post).toHaveBeenCalledWith(
      'https://host.test/platform/v1/public/deal-promotion-links/promo-token/claims',
      undefined
    );
    expect(claim.claimToken).toBe('claim-token');
  });

  it('creates or reuses a promoter direct link', async () => {
    vi.mocked(hostingPost).mockResolvedValue({
      id: 'link-1',
      programID: 'prog-1',
      status: 'active',
      publicToken: 'promo-token',
      publicPath: '/platform/v1/public/deal-promotion-links/promo-token',
      createdAt: '2026-07-05T00:00:00Z',
    });

    const link = await createDealPromotionLink('prog-1');
    expect(hostingPost).toHaveBeenCalledWith(
      '/platform/v1/deal-promotion-programs/prog-1/links',
      undefined
    );
    expect(link.publicToken).toBe('promo-token');
  });
});
