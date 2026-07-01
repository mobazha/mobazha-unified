/**
 * Marketplace API Tests
 * 社区集市 API 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the apiClient
vi.mock('../../../services/api/client', () => ({
  apiClient: {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../services/api/config', () => ({
  getHostingUrl: vi.fn(() => 'https://hosting.test'),
}));

vi.mock('../../../services/api/helpers', () => ({
  hostingGet: vi.fn(),
  hostingPost: vi.fn(),
  hostingPut: vi.fn(),
  hostingDel: vi.fn(),
}));

import { hostingDel, hostingGet, hostingPost, hostingPut } from '../../../services/api/helpers';
import { apiClient } from '../../../services/api/client';
import { getHostingUrl } from '../../../services/api/config';
import { HOSTING_API } from '../../../config/apiPaths';
import * as marketplaceApi from '../../../services/api/marketplace';

const mockHostingGet = hostingGet as ReturnType<typeof vi.fn>;
const mockHostingPost = hostingPost as ReturnType<typeof vi.fn>;
const mockHostingPut = hostingPut as ReturnType<typeof vi.fn>;
const mockHostingDel = hostingDel as ReturnType<typeof vi.fn>;
const mockApiRequest = apiClient.request as ReturnType<typeof vi.fn>;
const mockGetHostingUrl = getHostingUrl as ReturnType<typeof vi.fn>;

// Import types after mock setup
import type { Marketplace } from '../../../types/marketplace';

describe('Marketplace API', () => {
  const mockNativeMarketplace = {
    id: 'mp1',
    name: 'Crypto Collectibles',
    slug: 'crypto-collectibles',
    status: 'published',
    ownerUserID: 'owner-1',
    buyerAccessMode: 'open',
    sellerReviewMode: 'manual',
    catalogMode: 'curated',
    discoverability: 'public',
    sellerEntryMode: 'operator_invited',
    vertical: 'collectibles',
    plan: 'free',
    domains: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHostingUrl.mockReturnValue('https://hosting.test');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMarketplace', () => {
    it('should fetch marketplace details', async () => {
      mockHostingGet.mockResolvedValueOnce(mockNativeMarketplace);

      const result = await marketplaceApi.getMarketplace('mp1');

      expect(mockHostingGet).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1');
      expect(result.id).toBe('mp1');
      expect(result.name).toBe('Crypto Collectibles');
    });
  });

  describe('createMarketplace', () => {
    it('should create a marketplace', async () => {
      mockHostingPost.mockResolvedValueOnce(mockNativeMarketplace);

      const result = await marketplaceApi.createMarketplace({
        name: 'Crypto Collectibles',
        description: 'A marketplace for digital collectibles',
        buyerAccessMode: 'open',
        sellerReviewMode: 'manual',
        catalogMode: 'curated',
      });

      expect(mockHostingPost).toHaveBeenCalledWith('/platform/v1/marketplaces', expect.any(Object));
      expect(result.name).toBe('Crypto Collectibles');
    });
  });

  describe('updateMarketplace', () => {
    it('should update a marketplace', async () => {
      mockHostingPut.mockResolvedValueOnce(mockNativeMarketplace);

      const result = await marketplaceApi.updateMarketplace('mp1', {
        name: 'Crypto Collectibles',
      });

      expect(mockHostingPut).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1', {
        name: 'Crypto Collectibles',
      });
      expect(result.id).toBe('mp1');
    });
  });

  describe('deleteMarketplace', () => {
    it('should archive a marketplace', async () => {
      mockHostingDel.mockResolvedValueOnce({ archived: true, id: 'mp1' });

      const result = await marketplaceApi.deleteMarketplace('mp1');

      expect(mockHostingDel).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1');
      expect(result.archived).toBe(true);
    });
  });

  describe('getMyMarketplaces', () => {
    it('should fetch marketplaces owned by the current user', async () => {
      mockHostingGet.mockResolvedValueOnce([mockNativeMarketplace]);

      const result = await marketplaceApi.getMyMarketplaces();

      expect(mockHostingGet).toHaveBeenCalledWith('/platform/v1/marketplaces/mine');
      expect(result).toHaveLength(1);
    });
  });

  describe('getMyMarketplaceMemberships', () => {
    it('should fetch store-side marketplace memberships', async () => {
      const entry = {
        membership: {
          id: 1,
          tenantID: 'tenant1',
          marketplaceID: 'mp1',
          userID: 'user1',
          peerID: 'QmSeller1',
          status: 'invited',
          unreadReviewCount: 0,
          isVisible: false,
          productGroupIDs: [],
          productGroups: [],
          invitedAt: '2024-01-15T00:00:00Z',
        },
        marketplace: {
          id: 'mp1',
          name: 'Crypto Collectibles',
          slug: 'crypto-collectibles',
          status: 'published',
        },
      };
      mockHostingGet.mockResolvedValueOnce([entry]);

      const result = await marketplaceApi.getMyMarketplaceMemberships();

      expect(mockHostingGet).toHaveBeenCalledWith('/platform/v1/marketplace-memberships/mine');
      expect(result).toHaveLength(1);
      expect(result[0].membership.isVisible).toBe(false);
    });
  });

  describe('marketplace store memberships', () => {
    it('should enforce invitation acceptance before operator review', async () => {
      const mockSeller = {
        id: 1,
        tenantID: 'tenant1',
        marketplaceID: 'mp1',
        userID: 'user1',
        peerID: 'QmSeller1',
        status: 'approved',
        unreadReviewCount: 0,
        isVisible: true,
        productGroupIDs: [],
        productGroups: [],
        appliedAt: '2024-01-15T00:00:00Z',
      };

      mockHostingGet.mockResolvedValueOnce([mockSeller]);
      await marketplaceApi.getMarketplaceSellers('mp1', { status: 'approved' });
      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/sellers?status=approved'
      );

      mockHostingPost.mockResolvedValueOnce({ ...mockSeller, status: 'invited', isVisible: false });
      await marketplaceApi.inviteMarketplaceSeller('mp1', {
        peerID: 'QmSeller1',
      });
      expect(mockHostingPost).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/sellers/invite',
        expect.objectContaining({ peerID: 'QmSeller1' })
      );

      mockHostingPost.mockResolvedValueOnce({
        ...mockSeller,
        status: 'accepted',
        isVisible: false,
      });
      await marketplaceApi.acceptMarketplaceSellerInvitation('mp1', 'QmSeller1');
      expect(mockHostingPost).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/sellers/QmSeller1/accept',
        undefined
      );

      mockHostingPut.mockResolvedValueOnce(mockSeller);
      await marketplaceApi.updateMarketplaceSeller('mp1', 'QmSeller1', {
        status: 'approved',
        visible: true,
        reason: 'compliance approved',
      });
      expect(mockHostingPut).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/sellers/QmSeller1',
        { status: 'approved', visible: true, reason: 'compliance approved' }
      );

      mockHostingPost.mockResolvedValueOnce({ ...mockSeller, status: 'rejected' });
      await marketplaceApi.declineMarketplaceSellerInvitation('mp1');
      expect(mockHostingPost).toHaveBeenCalledWith(
        '/platform/v1/marketplace-memberships/mp1/decline',
        undefined
      );

      mockHostingPost.mockResolvedValueOnce({ ...mockSeller, status: 'left' });
      await marketplaceApi.leaveMarketplaceMembership('mp1');
      expect(mockHostingPost).toHaveBeenCalledWith(
        '/platform/v1/marketplace-memberships/mp1/leave',
        undefined
      );
    });
  });

  describe('native public marketplace seller applications', () => {
    it('should fetch, submit, and withdraw native seller applications', async () => {
      const mockApplication = {
        hasApplication: true,
        productGroupIDs: [1, 2],
        autoApproved: false,
        membership: {
          id: 1,
          tenantID: 'tenant1',
          marketplaceID: 'mp1',
          peerID: 'QmSeller1',
          status: 'applied',
          unreadReviewCount: 0,
          isVisible: false,
          productGroupIDs: [1, 2],
          productGroups: [],
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      };

      mockHostingGet.mockResolvedValueOnce(mockApplication);
      await marketplaceApi.getNativeMarketplaceSellerApplication('collectibles');
      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/public-marketplaces/collectibles/seller-applications/mine'
      );

      mockHostingPost.mockResolvedValueOnce({ ...mockApplication, autoApproved: true });
      await marketplaceApi.applyToNativeMarketplace('collectibles', [1, 2]);
      expect(mockHostingPost).toHaveBeenCalledWith(
        '/platform/v1/public-marketplaces/collectibles/seller-applications',
        { productGroupIDs: [1, 2] }
      );

      mockHostingDel.mockResolvedValueOnce({
        ...mockApplication,
        membership: { ...mockApplication.membership, status: 'left' },
      });
      await marketplaceApi.withdrawNativeMarketplaceSellerApplication('collectibles');
      expect(mockHostingDel).toHaveBeenCalledWith(
        '/platform/v1/public-marketplaces/collectibles/seller-applications/mine'
      );
    });
  });

  describe('native marketplace attribution', () => {
    it('submits public marketplace attribution events', async () => {
      mockApiRequest.mockResolvedValueOnce({ accepted: true, duplicate: false });

      await marketplaceApi.submitPublicMarketplaceAttributionEvent('collectibles', {
        eventID: 'evt-1',
        journeyID: 'journey-1',
        eventType: 'listing_click',
        listingSlug: 'topps-2026',
        peerID: 'QmSeller1',
        source: 'newsletter',
      });

      expect(mockApiRequest).toHaveBeenCalledWith(
        'https://hosting.test/platform/v1/public-marketplaces/collectibles/attribution-events',
        expect.objectContaining({
          method: 'POST',
          keepalive: true,
          body: expect.objectContaining({
            eventID: 'evt-1',
            journeyID: 'journey-1',
            eventType: 'listing_click',
            listingSlug: 'topps-2026',
            peerID: 'QmSeller1',
            source: 'newsletter',
          }),
        })
      );
      expect(mockHostingPost).not.toHaveBeenCalled();
    });

    it('loads marketplace attribution summary with optional range query', async () => {
      mockHostingGet.mockResolvedValueOnce({
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-31T00:00:00Z',
        impressions: 100,
        listingClicks: 40,
        checkoutHandoffs: 12,
        listingClickRate: 0.4,
        checkoutHandoffRate: 0.3,
        hasData: true,
      });

      await marketplaceApi.getMarketplaceAttributionSummary('mp1', {
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-31T00:00:00Z',
      });

      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/attribution-summary?from=2026-01-01T00%3A00%3A00Z&to=2026-01-31T00%3A00%3A00Z'
      );
    });
  });

  describe('marketplace curation config', () => {
    it('should fetch config and share link', async () => {
      const mockConfig = {
        id: 'mp1',
        vertical: 'collectibles',
        buyerAccessMode: 'open',
        sellerReviewMode: 'manual',
        catalogMode: 'curated',
        discoverability: 'public',
        sellerEntryMode: 'operator_invited',
        allowedPeers: [],
        sellers: [],
        featured: [],
        brand: { name: 'Crypto Collectibles' },
        taxonomy: [],
        policy: {},
        attribution: { utmSource: 'mp1', marketplaceId: 'mp1' },
      };

      mockHostingGet.mockResolvedValueOnce(mockConfig);
      await marketplaceApi.getMarketplaceConfig('mp1', { subdomain: 'crypto' });
      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/config?subdomain=crypto'
      );

      mockHostingGet.mockResolvedValueOnce({ url: 'https://crypto.example.test', qrText: 'mp1' });
      await marketplaceApi.getMarketplaceLink('mp1');
      expect(mockHostingGet).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1/link');
    });
  });

  describe('verifyMarketplaceCustomDomain', () => {
    it('calls custom-domain verify endpoint and returns result payload', async () => {
      mockHostingPost.mockResolvedValueOnce({
        domain: {
          host: 'shop.example.com',
          kind: 'custom',
          verificationStatus: 'pending',
          verificationName: '_mobazha-marketplace.shop.example.com',
          verificationValue: 'mobazha-verification=token-123',
          isPrimary: false,
        },
        verified: false,
        result: 'record_not_found',
      });

      const result = await marketplaceApi.verifyMarketplaceCustomDomain('mp1');

      expect(mockHostingPost).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/domains/custom/verify',
        undefined
      );
      expect(result).toEqual({
        domain: {
          host: 'shop.example.com',
          kind: 'custom',
          verificationStatus: 'pending',
          verificationName: '_mobazha-marketplace.shop.example.com',
          verificationValue: 'mobazha-verification=token-123',
          isPrimary: false,
        },
        verified: false,
        result: 'record_not_found',
      });
    });
  });

  describe('marketplace seller review events', () => {
    it('loads operator review events with peer and limit query params', async () => {
      mockHostingGet.mockResolvedValueOnce([]);

      await marketplaceApi.getMarketplaceSellerReviewEvents('mp1', {
        peerID: 'QmSeller1',
        limit: 10,
      });

      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/seller-review-events?peerID=QmSeller1&limit=10'
      );
    });

    it('loads membership review events and marks event read', async () => {
      const mockEvent = {
        id: 11,
        marketplaceID: 'mp1',
        marketplaceStoreID: 3,
        peerID: 'QmSeller1',
        actorID: 'QmOperator1',
        previousStatus: 'applied',
        status: 'rejected',
        reason: 'Policy mismatch',
        readAt: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      };
      mockHostingGet.mockResolvedValueOnce([mockEvent]);
      mockHostingPost.mockResolvedValueOnce(mockEvent);

      await marketplaceApi.getMarketplaceMembershipReviewEvents('mp1', { limit: 5 });
      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/marketplace-memberships/mp1/review-events?limit=5'
      );

      await marketplaceApi.markMarketplaceReviewEventRead('mp1', 11);
      expect(mockHostingPost).toHaveBeenCalledWith(
        '/platform/v1/marketplace-memberships/mp1/review-events/11/read',
        undefined
      );
    });
  });

  describe('native marketplace curation', () => {
    it('serializes GET/POST/PUT/DELETE calls to native curation endpoints', async () => {
      const curationItem = {
        id: 101,
        kind: 'listing',
        listingSlug: 'topps-2026',
        sortOrder: 1,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const candidates = {
        sellers: [{ peerID: 'QmSeller1' }],
        listings: [{ slug: 'topps-2026', peerID: 'QmSeller1', title: 'Topps 2026' }],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPage: 1,
      };

      mockHostingGet.mockResolvedValueOnce([curationItem]);
      await marketplaceApi.getMarketplaceCuration('mp1');
      expect(mockHostingGet).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1/curation');

      mockHostingGet.mockResolvedValueOnce(candidates);
      await marketplaceApi.getMarketplaceCurationCandidates('mp1');
      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/curation/candidates'
      );

      mockHostingGet.mockResolvedValueOnce(candidates);
      await marketplaceApi.getMarketplaceCurationCandidates('mp1', {
        q: 'topps cards',
        page: 2,
        pageSize: 25,
      });
      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/curation/candidates?q=topps+cards&page=2&pageSize=25'
      );

      mockHostingPost.mockResolvedValueOnce(curationItem);
      await marketplaceApi.createMarketplaceCurationItem('mp1', {
        kind: 'listing',
        listingSlug: 'topps-2026',
      });
      expect(mockHostingPost).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1/curation', {
        kind: 'listing',
        listingSlug: 'topps-2026',
      });

      mockHostingPut.mockResolvedValueOnce([curationItem]);
      await marketplaceApi.reorderMarketplaceCuration('mp1', {
        kind: 'listing',
        itemIDs: [101],
      });
      expect(mockHostingPut).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/curation/reorder',
        {
          kind: 'listing',
          itemIDs: [101],
        }
      );

      mockHostingPut.mockResolvedValueOnce({ ...curationItem, isActive: false });
      await marketplaceApi.updateMarketplaceCurationItem('mp1', 101, { isActive: false });
      expect(mockHostingPut).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1/curation/101', {
        isActive: false,
      });

      mockHostingDel.mockResolvedValueOnce({ deleted: true, id: 101 });
      await marketplaceApi.deleteMarketplaceCurationItem('mp1', 101);
      expect(mockHostingDel).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1/curation/101');
    });
  });
});

describe('Marketplace curation api path helpers', () => {
  it('builds native marketplace curation paths with encoding', () => {
    expect(HOSTING_API.MARKETPLACE_CURATION('mp 1')).toBe(
      '/platform/v1/marketplaces/mp%201/curation'
    );
    expect(HOSTING_API.MARKETPLACE_CURATION_CANDIDATES('mp/1')).toBe(
      '/platform/v1/marketplaces/mp%2F1/curation/candidates'
    );
    expect(HOSTING_API.MARKETPLACE_CURATION_REORDER('mp:1')).toBe(
      '/platform/v1/marketplaces/mp%3A1/curation/reorder'
    );
    expect(HOSTING_API.MARKETPLACE_CURATION_ITEM('mp1', 'item/42')).toBe(
      '/platform/v1/marketplaces/mp1/curation/item%2F42'
    );
  });
});

describe('Marketplace Type Validation', () => {
  it('should have correct structure for Marketplace', () => {
    const marketplace: Marketplace = {
      id: 'test-mp',
      name: 'Test Marketplace',
      slug: 'test-mp',
      description: 'A test marketplace',
      owner: {
        id: 'owner1',
        peerID: 'QmTestOwner',
        name: 'Owner',
      },
      status: 'active' as const,
      settings: {
        requireSellerApproval: true,
        requireProductApproval: true,
        allowPublicJoin: true,
        showSellerInfo: true,
        showSellerRating: true,
      },
      stats: {
        memberCount: 10,
        sellerCount: 2,
        productCount: 5,
        orderCount: 3,
        totalVolume: { amount: 500, currency: 'USD' },
        averageRating: 4.0,
        reviewCount: 10,
      },
      categories: [],
      tags: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(marketplace.id).toBeTruthy();
    expect(marketplace.name).toBeTruthy();
    expect(typeof marketplace.stats.memberCount).toBe('number');
    expect(marketplace.status).toBe('active');
  });
});
