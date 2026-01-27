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

// Mock global fetch for getStoreModerators
const mockFetch = vi.fn();

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
    // 使用 stubGlobal 正确 mock fetch
    vi.stubGlobal('fetch', mockFetch);
    // Mock fetch 默认返回空的 storeModerators
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ storeModerators: [] }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getModerators', () => {
    it('should fetch list of moderators', async () => {
      // Mock: 先返回 preferences（含 storeModerators），再返回 fetchprofiles 结果
      const mockStoreModerators = ['QmMod1'];
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

      // 第一次调用返回 preferences
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ storeModerators: mockStoreModerators }),
      });
      // 第二次调用返回 fetchprofiles 结果
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'id1', peerID: 'QmMod1', profile: mockProfile }]),
      });

      const result = await moderatorsApi.getModerators();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.moderators).toHaveLength(1);
      expect(result.moderators[0].peerID).toBe('QmMod1');
    });

    it('should return empty when no store moderators configured', async () => {
      // Mock: 返回空的 storeModerators
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ storeModerators: [] }),
      });

      const result = await moderatorsApi.getModerators();

      expect(result.moderators).toHaveLength(0);
      expect(result.total).toBe(0);
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
    it('should search moderators (delegates to getModerators)', async () => {
      // searchModerators 内部调用 getModerators，需要 mock 完整流程
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ storeModerators: [] }),
      });

      const result = await moderatorsApi.searchModerators('trusted');

      // searchModerators 返回 getModerators 的结果
      expect(result.moderators).toBeDefined();
      expect(result.total).toBe(0);
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
