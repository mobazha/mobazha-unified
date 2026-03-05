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

// Mock helpers used by getModerators and setAsModerator/unsetAsModerator
const mockAuthGet = vi.fn();
const mockAuthPost = vi.fn();
const mockAuthDel = vi.fn();
const mockPublicPost = vi.fn();
vi.mock('../../../services/api/helpers', () => ({
  authGet: (...args: unknown[]) => mockAuthGet(...args),
  authPost: (...args: unknown[]) => mockAuthPost(...args),
  authDel: (...args: unknown[]) => mockAuthDel(...args),
  publicPost: (...args: unknown[]) => mockPublicPost(...args),
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
    // Default: authGet returns empty storeModerators
    mockAuthGet.mockResolvedValue({ storeModerators: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getModerators', () => {
    it('should fetch list of moderators', async () => {
      const mockProfile = {
        peerID: 'QmMod1',
        name: 'Trusted Moderator',
        handle: '@trusted',
        shortDescription: 'Experienced mediator',
        about: 'Full description here',
        moderator: true,
        moderatorInfo: {
          description: 'Moderator info',
          termsAndConditions: 'Fair resolution guaranteed',
          languages: ['en', 'zh'],
          acceptedCurrencies: ['BTC', 'ETH'],
          fee: {
            percentage: 1.5,
            feeType: 'PERCENTAGE',
          },
        },
      };

      // authGet → preferences with storeModerators
      mockAuthGet.mockResolvedValueOnce({ storeModerators: ['QmMod1'] });
      // publicPost → fetchProfiles result
      mockPublicPost.mockResolvedValueOnce([{ id: 'id1', peerID: 'QmMod1', profile: mockProfile }]);

      const result = await moderatorsApi.getModerators();

      expect(mockAuthGet).toHaveBeenCalledTimes(1);
      expect(mockPublicPost).toHaveBeenCalledTimes(1);
      expect(result.moderators).toHaveLength(1);
      expect(result.moderators[0].peerID).toBe('QmMod1');
    });

    it('should return empty when no store moderators configured', async () => {
      mockAuthGet.mockResolvedValueOnce({ storeModerators: [] });

      const result = await moderatorsApi.getModerators();

      expect(result.moderators).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getModerator', () => {
    it('should fetch moderator details by id', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockModerator);

      const result = await moderatorsApi.getModerator('mod1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/platform/v1/moderators/mod1');
      expect(result.id).toBe('mod1');
    });
  });

  describe('getModeratorByPeerId', () => {
    it('should fetch moderator details by peer ID', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockModerator);

      const result = await moderatorsApi.getModeratorByPeerId('QmMod1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/platform/v1/moderators/peer/QmMod1');
      expect(result.peerID).toBe('QmMod1');
    });
  });

  describe('searchModerators', () => {
    it('should search moderators (delegates to getModerators)', async () => {
      mockAuthGet.mockResolvedValueOnce({ storeModerators: [] });

      const result = await moderatorsApi.searchModerators('trusted');

      expect(result.moderators).toBeDefined();
      expect(result.total).toBe(0);
    });
  });

  describe('getRecommendedModerators', () => {
    it('should fetch recommended moderators', async () => {
      mockApiClient.get.mockResolvedValueOnce([mockModerator]);

      const result = await moderatorsApi.getRecommendedModerators(3);

      expect(mockApiClient.get).toHaveBeenCalledWith('/platform/v1/moderators/recommended?limit=3');
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

      expect(mockApiClient.post).toHaveBeenCalledWith('/platform/v1/disputes', {
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

      expect(mockApiClient.post).toHaveBeenCalledWith('/platform/v1/disputes/disp1/resolve', {
        decision: 'buyer',
        buyerPercentage: 100,
        sellerPercentage: 0,
        reason: 'Seller did not respond',
      });
      expect(result.status).toBe('resolved');
    });
  });

  describe('setAsModerator', () => {
    it('should set self as moderator via Node API', async () => {
      mockAuthPost.mockResolvedValueOnce(undefined);

      await moderatorsApi.setAsModerator({
        description: 'Full description',
        languages: ['en'],
        fee: { percentage: 1, feeType: 'PERCENTAGE' },
        termsAndConditions: 'Fair resolution',
        acceptedCurrencies: ['BTC'],
      });

      expect(mockAuthPost).toHaveBeenCalledWith('/moderators', expect.any(Object));
    });
  });

  describe('unsetAsModerator', () => {
    it('should unset self as moderator via Node API', async () => {
      mockAuthDel.mockResolvedValueOnce(undefined);

      await moderatorsApi.unsetAsModerator();

      expect(mockAuthDel).toHaveBeenCalledWith('/moderators');
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
