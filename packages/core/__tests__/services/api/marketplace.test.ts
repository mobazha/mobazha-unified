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

import { apiClient } from '../../../services/api/client';
import * as marketplaceApi from '../../../services/api/marketplace';

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Import types after mock setup
import type {
  Marketplace,
  MarketplaceMember,
  MarketplaceProduct,
} from '../../../types/marketplace';

describe('Marketplace API', () => {
  const mockMarketplace: Marketplace = {
    id: 'mp1',
    name: 'Crypto Collectibles',
    slug: 'crypto-collectibles',
    description: 'A marketplace for digital collectibles',
    owner: {
      id: 'owner1',
      peerID: 'QmOwner1',
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
      memberCount: 150,
      sellerCount: 30,
      productCount: 500,
      orderCount: 1000,
      totalVolume: { amount: 50000, currency: 'USD' },
      averageRating: 4.5,
      reviewCount: 200,
    },
    categories: ['digital', 'collectibles'],
    tags: ['crypto', 'nft'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMarketplaces', () => {
    it('should fetch list of marketplaces', async () => {
      const mockResponse = {
        marketplaces: [mockMarketplace],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await marketplaceApi.getMarketplaces();

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/marketplaces');
      expect(result.marketplaces).toHaveLength(1);
    });

    it('should pass query parameters correctly', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        marketplaces: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false,
      });

      await marketplaceApi.getMarketplaces({
        page: 1,
        limit: 10,
        featured: true,
        category: 'electronics',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/marketplaces?')
      );
    });
  });

  describe('getMarketplace', () => {
    it('should fetch marketplace details', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockMarketplace);

      const result = await marketplaceApi.getMarketplace('mp1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/marketplaces/mp1');
      expect(result.id).toBe('mp1');
      expect(result.name).toBe('Crypto Collectibles');
    });
  });

  describe('getMarketplaceBySlug', () => {
    it('should fetch marketplace by slug', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockMarketplace);

      const result = await marketplaceApi.getMarketplaceBySlug('crypto-collectibles');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/marketplaces/slug/crypto-collectibles'
      );
      expect(result.slug).toBe('crypto-collectibles');
    });
  });

  describe('createMarketplace', () => {
    it('should create a marketplace', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockMarketplace);

      const result = await marketplaceApi.createMarketplace({
        name: 'Crypto Collectibles',
        description: 'A marketplace for digital collectibles',
        settings: {
          requireSellerApproval: true,
          requireProductApproval: true,
          commissionPercentage: 2.5,
        },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/marketplaces', expect.any(Object));
      expect(result.name).toBe('Crypto Collectibles');
    });
  });

  describe('joinMarketplace', () => {
    it('should join a marketplace', async () => {
      const mockMember: MarketplaceMember = {
        id: 'mem1',
        marketplaceId: 'mp1',
        userId: 'user1',
        peerID: 'QmUser1',
        name: 'Test User',
        role: 'member' as const,
        joinedAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockMember);

      const result = await marketplaceApi.joinMarketplace('mp1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/marketplaces/mp1/join', {});
      expect(result.marketplaceId).toBe('mp1');
    });
  });

  describe('leaveMarketplace', () => {
    it('should leave a marketplace', async () => {
      mockApiClient.post.mockResolvedValueOnce(undefined);

      await marketplaceApi.leaveMarketplace('mp1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/marketplaces/mp1/leave', {});
    });
  });

  describe('applyAsSeller', () => {
    it('should apply as seller', async () => {
      const mockApplication = {
        id: 'app1',
        marketplaceId: 'mp1',
        applicantPeerID: 'QmUser1',
        status: 'pending' as const,
        message: 'I want to sell quality goods',
        createdAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockApplication);

      const result = await marketplaceApi.applyAsSeller({
        marketplaceId: 'mp1',
        message: 'I want to sell quality goods',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/marketplaces/mp1/seller-applications',
        expect.any(Object)
      );
      expect(result.status).toBe('pending');
    });
  });

  describe('getMarketplaceProducts', () => {
    it('should fetch marketplace products', async () => {
      const mockProducts: MarketplaceProduct[] = [
        {
          id: 'prod1',
          productId: 'ext-prod1',
          marketplaceId: 'mp1',
          sellerId: 'seller1',
          approvalStatus: 'approved' as const,
          featured: false,
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({
        products: mockProducts,
        total: 1,
      });

      const result = await marketplaceApi.getMarketplaceProducts({
        marketplaceId: 'mp1',
        page: 1,
        limit: 20,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/marketplaces/mp1/products')
      );
      expect(result.products).toHaveLength(1);
    });
  });

  describe('listProductInMarketplace', () => {
    it('should list a product in marketplace', async () => {
      const mockProduct: MarketplaceProduct = {
        id: 'prod1',
        productId: 'ext-prod1',
        marketplaceId: 'mp1',
        sellerId: 'seller1',
        approvalStatus: 'pending' as const,
        featured: false,
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockProduct);

      const result = await marketplaceApi.listProductInMarketplace({
        marketplaceId: 'mp1',
        productId: 'ext-prod1',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/marketplaces/mp1/products',
        expect.any(Object)
      );
      expect(result.approvalStatus).toBe('pending');
    });
  });

  describe('reviewProduct', () => {
    it('should review a product', async () => {
      const mockProduct: MarketplaceProduct = {
        id: 'prod1',
        productId: 'ext-prod1',
        marketplaceId: 'mp1',
        sellerId: 'seller1',
        approvalStatus: 'approved' as const,
        featured: false,
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockProduct);

      const result = await marketplaceApi.reviewProduct('mp1', 'prod1', {
        status: 'approved',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/marketplaces/mp1/products/prod1/review',
        { status: 'approved' }
      );
      expect(result.approvalStatus).toBe('approved');
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
