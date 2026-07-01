/**
 * Marketplace API Tests
 * 社区集市 API 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the apiClient
vi.mock('../../../services/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../services/api/helpers', () => ({
  hostingGet: vi.fn(),
  hostingPost: vi.fn(),
  hostingPut: vi.fn(),
  hostingDel: vi.fn(),
}));

import { hostingDel, hostingGet, hostingPost, hostingPut } from '../../../services/api/helpers';
import * as marketplaceApi from '../../../services/api/marketplace';

const mockHostingGet = hostingGet as ReturnType<typeof vi.fn>;
const mockHostingPost = hostingPost as ReturnType<typeof vi.fn>;
const mockHostingPut = hostingPut as ReturnType<typeof vi.fn>;
const mockHostingDel = hostingDel as ReturnType<typeof vi.fn>;

// Import types after mock setup
import type { Marketplace } from '../../../types/marketplace';

describe('Marketplace API', () => {
  const mockNativeMarketplace = {
    id: 'mp1',
    platform: 'native',
    name: 'Crypto Collectibles',
    publicID: 'mp1',
    slug: 'crypto-collectibles',
    visibility: 'active',
    joinMode: 'approval',
    catalogMode: 'curated',
    discoverability: 'public',
    sellerEntryMode: 'operator_invited',
    vertical: 'collectibles',
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
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
        publicDescription: 'A marketplace for digital collectibles',
        joinMode: 'approval',
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
    it('should delete a marketplace', async () => {
      mockHostingDel.mockResolvedValueOnce({ deleted: true, id: 'mp1' });

      const result = await marketplaceApi.deleteMarketplace('mp1');

      expect(mockHostingDel).toHaveBeenCalledWith('/platform/v1/marketplaces/mp1');
      expect(result.deleted).toBe(true);
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

  describe('marketplace seller whitelist', () => {
    it('should manage seller whitelist entries', async () => {
      const mockSeller = {
        id: 1,
        tenantID: 'tenant1',
        marketplaceID: 'mp1',
        userID: 'user1',
        peerID: 'QmSeller1',
        status: 'approved',
        isVisible: true,
        appliedAt: '2024-01-15T00:00:00Z',
      };

      mockHostingGet.mockResolvedValueOnce([mockSeller]);
      await marketplaceApi.getMarketplaceSellers('mp1', { status: 'approved' });
      expect(mockHostingGet).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/sellers?status=approved'
      );

      mockHostingPost.mockResolvedValueOnce({ ...mockSeller, status: 'pending', isVisible: false });
      await marketplaceApi.inviteMarketplaceSeller('mp1', {
        peerID: 'QmSeller1',
      });
      expect(mockHostingPost).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/sellers/invite',
        expect.objectContaining({ peerID: 'QmSeller1' })
      );

      mockHostingPut.mockResolvedValueOnce(mockSeller);
      await marketplaceApi.updateMarketplaceSeller('mp1', 'QmSeller1', {
        status: 'approved',
        visible: true,
      });
      expect(mockHostingPut).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/sellers/QmSeller1',
        { status: 'approved', visible: true }
      );

      mockHostingDel.mockResolvedValueOnce({ removed: true, peerID: 'QmSeller1' });
      await marketplaceApi.removeMarketplaceSeller('mp1', 'QmSeller1');
      expect(mockHostingDel).toHaveBeenCalledWith(
        '/platform/v1/marketplaces/mp1/sellers/QmSeller1'
      );
    });
  });

  describe('marketplace curation config', () => {
    it('should fetch config and share link', async () => {
      const mockConfig = {
        id: 'mp1',
        vertical: 'collectibles',
        joinMode: 'approval',
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
