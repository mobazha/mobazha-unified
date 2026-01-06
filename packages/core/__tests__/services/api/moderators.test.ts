/**
 * Moderators API Tests
 * 仲裁员 API 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Moderator, ModeratorListResponse, Dispute } from '../../../services/api/moderators';

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
import * as moderatorsApi from '../../../services/api/moderators';

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('Moderators API', () => {
  const mockModerator: Moderator = {
    id: 'mod1',
    peerID: 'QmMod1',
    name: 'Trusted Moderator',
    handle: '@trusted',
    shortDescription: 'Experienced mediator',
    description: 'Full description here',
    languages: ['en', 'zh'],
    fee: {
      percentage: 1.5,
      feeType: 'percentage',
    },
    termsAndConditions: 'Fair resolution guaranteed',
    acceptedCurrencies: ['BTC', 'ETH'],
    verified: true,
    stats: {
      rating: 4.8,
      ratingCount: 100,
      disputesHandled: 50,
      averageResolutionTime: 24,
      successRate: 98,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getModerators', () => {
    it('should fetch list of moderators', async () => {
      const mockResponse: ModeratorListResponse = {
        moderators: [mockModerator],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await moderatorsApi.getModerators();

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/moderators');
      expect(result.moderators).toHaveLength(1);
      expect(result.moderators[0].peerID).toBe('QmMod1');
    });

    it('should pass query parameters correctly', async () => {
      const mockResponse: ModeratorListResponse = {
        moderators: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      await moderatorsApi.getModerators({
        page: 1,
        limit: 10,
        verified: true,
        language: 'en',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/moderators?')
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
      expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('verified=true'));
      expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('language=en'));
    });
  });

  describe('getModerator', () => {
    it('should fetch moderator details by id', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockModerator);

      const result = await moderatorsApi.getModerator('mod1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/moderators/mod1');
      expect(result.id).toBe('mod1');
    });
  });

  describe('getModeratorByPeerId', () => {
    it('should fetch moderator details by peer ID', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockModerator);

      const result = await moderatorsApi.getModeratorByPeerId('QmMod1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/moderators/peer/QmMod1');
      expect(result.peerID).toBe('QmMod1');
    });
  });

  describe('searchModerators', () => {
    it('should search moderators', async () => {
      const mockResponse: ModeratorListResponse = {
        moderators: [mockModerator],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      await moderatorsApi.searchModerators('trusted');

      expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('search=trusted'));
    });
  });

  describe('getRecommendedModerators', () => {
    it('should fetch recommended moderators', async () => {
      mockApiClient.get.mockResolvedValueOnce([mockModerator]);

      const result = await moderatorsApi.getRecommendedModerators(3);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/moderators/recommended?limit=3');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('submitDispute', () => {
    it('should submit a dispute', async () => {
      const mockDispute: Dispute = {
        id: 'disp1',
        orderId: 'ord1',
        moderatorId: 'mod1',
        buyerId: 'buyer1',
        sellerId: 'seller1',
        claim: 'Item not as described',
        evidence: [],
        status: 'open',
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
        expiresAt: '2024-02-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockDispute);

      const result = await moderatorsApi.submitDispute({
        orderId: 'ord1',
        claim: 'Item not as described',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/disputes', {
        orderId: 'ord1',
        claim: 'Item not as described',
      });
      expect(result.status).toBe('open');
    });
  });

  describe('resolveDispute', () => {
    it('should resolve a dispute', async () => {
      const mockResolved: Dispute = {
        id: 'disp1',
        orderId: 'ord1',
        moderatorId: 'mod1',
        buyerId: 'buyer1',
        sellerId: 'seller1',
        claim: 'Item not as described',
        evidence: [],
        status: 'resolved',
        resolution: {
          decision: 'buyer',
          buyerPercentage: 100,
          sellerPercentage: 0,
          reason: 'Seller did not respond',
          timestamp: '2024-01-20T00:00:00Z',
        },
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-20T00:00:00Z',
        expiresAt: '2024-02-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockResolved);

      const result = await moderatorsApi.resolveDispute({
        disputeId: 'disp1',
        decision: 'buyer',
        buyerPercentage: 100,
        sellerPercentage: 0,
        reason: 'Seller did not respond',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/disputes/disp1/resolve', {
        decision: 'buyer',
        buyerPercentage: 100,
        sellerPercentage: 0,
        reason: 'Seller did not respond',
      });
      expect(result.status).toBe('resolved');
    });
  });

  describe('registerAsModerator', () => {
    it('should register as moderator', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockModerator);

      await moderatorsApi.registerAsModerator({
        shortDescription: 'Fair mediator',
        description: 'Full description',
        languages: ['en'],
        fee: { percentage: 1, feeType: 'percentage' },
        termsAndConditions: 'Fair resolution',
        acceptedCurrencies: ['BTC'],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/moderators/register',
        expect.any(Object)
      );
    });
  });
});

describe('Moderator Type Validation', () => {
  it('should have correct structure for Moderator', () => {
    const moderator: Moderator = {
      id: 'test',
      peerID: 'QmTest',
      name: 'Test',
      languages: ['en'],
      fee: { percentage: 1, feeType: 'percentage' },
      acceptedCurrencies: ['BTC'],
      verified: false,
      stats: {
        rating: 4.5,
        ratingCount: 10,
        disputesHandled: 5,
        averageResolutionTime: 48,
        successRate: 90,
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    expect(moderator.peerID).toBeTruthy();
    expect(moderator.name).toBeTruthy();
    expect(typeof moderator.fee.percentage).toBe('number');
    expect(Array.isArray(moderator.languages)).toBe(true);
  });
});
