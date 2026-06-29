/**
 * Moderators API Tests
 * 仲裁员 API 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Moderator, ModeratorListResponse, Dispute } from '../../../services/api/moderators';

// Mock the apiClient; keep ApiError for instanceof checks in production code
vi.mock('../../../services/api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../services/api/client')>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('../../../services/verifiedModerators', () => ({
  fetchVerifiedModerators: vi.fn().mockResolvedValue(new Set<string>()),
}));

// Mock helpers used by getModerators and setAsModerator/unsetAsModerator
const mockAuthGet = vi.fn();
const mockAuthPost = vi.fn();
const mockAuthPut = vi.fn();
const mockAuthDel = vi.fn();
const mockPublicGet = vi.fn();
const mockPublicPost = vi.fn();
const mockNodeAuthGet = vi.fn();
const mockFetchStoreMetadata = vi.fn();
vi.mock('../../../services/api/helpers', () => ({
  authGet: (...args: unknown[]) => mockAuthGet(...args),
  authPost: (...args: unknown[]) => mockAuthPost(...args),
  authPut: (...args: unknown[]) => mockAuthPut(...args),
  authDel: (...args: unknown[]) => mockAuthDel(...args),
  publicGet: (...args: unknown[]) => mockPublicGet(...args),
  publicPost: (...args: unknown[]) => mockPublicPost(...args),
  nodeAuthGet: (...args: unknown[]) => mockNodeAuthGet(...args),
}));

vi.mock('../../../services/api/storeMetadata', () => ({
  fetchStoreMetadata: (...args: unknown[]) => mockFetchStoreMetadata(...args),
  getMetadataEntry: (
    resp: { metadata?: { metadataType: string; data: unknown }[] } | null,
    type: string
  ) => resp?.metadata?.find(m => m.metadataType === type)?.data ?? null,
}));

import { apiClient, ApiError } from '../../../services/api/client';
import * as moderatorsApi from '../../../services/api/moderators';
import { fetchVerifiedModerators } from '../../../services/verifiedModerators';

const mockFetchVerified = vi.mocked(fetchVerifiedModerators);

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
    mockFetchVerified.mockResolvedValue(new Set<string>());
    // Default: authGet returns empty StorePolicy moderators
    mockAuthGet.mockResolvedValue([]);
    mockFetchStoreMetadata.mockResolvedValue(null);
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

      // authGet -> StorePolicy moderators
      mockAuthGet.mockResolvedValueOnce([{ peerID: 'QmMod1', enabled: true, position: 0 }]);
      // publicPost -> fetchProfiles result
      mockPublicPost.mockResolvedValueOnce([{ id: 'id1', peerID: 'QmMod1', profile: mockProfile }]);

      const result = await moderatorsApi.getModerators();

      expect(mockAuthGet).toHaveBeenCalledTimes(1);
      expect(mockPublicPost).toHaveBeenCalledTimes(1);
      expect(result.moderators).toHaveLength(1);
      expect(result.moderators[0].peerID).toBe('QmMod1');
    });

    it('should return empty when no store moderators configured', async () => {
      mockAuthGet.mockResolvedValueOnce([]);

      const result = await moderatorsApi.getModerators();

      expect(result.moderators).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should fetch store moderators from seller public StorePolicy when vendorPeerID is provided', async () => {
      const mockProfile = {
        peerID: 'QmSellerMod',
        name: 'Seller Moderator',
        moderator: true,
        moderatorInfo: {
          languages: ['en'],
          fee: { percentage: 1, feeType: 'PERCENTAGE' },
        },
      };
      mockPublicGet.mockResolvedValueOnce({
        revision: 3,
        moderators: [{ peerID: 'QmSellerMod', enabled: true, position: 0 }],
      });
      mockPublicPost.mockResolvedValueOnce([
        { id: 'id1', peerID: 'QmSellerMod', profile: mockProfile },
      ]);

      const result = await moderatorsApi.getModerators({ vendorPeerID: 'QmSeller' });

      expect(mockPublicGet).toHaveBeenCalledWith('/store-policy/QmSeller/published');
      expect(mockAuthGet).not.toHaveBeenCalled();
      expect(result.moderators).toHaveLength(1);
      expect(result.moderators[0].peerID).toBe('QmSellerMod');
    });

    it('should return empty when seller public StorePolicy is unavailable', async () => {
      mockPublicGet.mockRejectedValueOnce(new Error('Store policy unavailable'));

      const result = await moderatorsApi.getModerators({ vendorPeerID: 'QmSeller' });

      expect(mockPublicGet).toHaveBeenCalledWith('/store-policy/QmSeller/published');
      expect(mockPublicPost).not.toHaveBeenCalled();
      expect(result.moderators).toHaveLength(0);
    });

    it('should silently return empty when seller public StorePolicy returns 401', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockPublicGet.mockRejectedValueOnce(new ApiError('Unauthorized', 401));
      mockFetchStoreMetadata.mockResolvedValueOnce(null);

      const result = await moderatorsApi.getModerators({ vendorPeerID: 'QmSeller' });

      expect(result.moderators).toHaveLength(0);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn when seller public StorePolicy returns non-401 ApiError', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const apiError = new ApiError('Internal Server Error', 500);
      mockPublicGet.mockRejectedValueOnce(apiError);
      mockFetchStoreMetadata.mockResolvedValueOnce(null);

      const result = await moderatorsApi.getModerators({ vendorPeerID: 'QmSeller' });

      expect(result.moderators).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith('Error fetching store policy moderators:', apiError);
      warnSpy.mockRestore();
    });

    it('should fallback to search store_policy metadata for seller public StorePolicy', async () => {
      const mockProfile = {
        peerID: 'QmSellerMod',
        name: 'Seller Moderator',
        moderator: true,
        moderatorInfo: {
          languages: ['en'],
          fee: { percentage: 1, feeType: 'PERCENTAGE' },
        },
      };
      mockPublicGet.mockRejectedValueOnce(new Error('Store policy unavailable'));
      mockFetchStoreMetadata.mockResolvedValueOnce({
        peerId: 'QmSeller',
        metadata: [
          {
            metadataType: 'store_policy',
            data: {
              revision: 4,
              moderators: [{ peerID: 'QmSellerMod', enabled: true, position: 0 }],
            },
            updatedAt: '2026-05-25T00:00:00Z',
          },
        ],
      });
      mockPublicPost.mockResolvedValueOnce([
        { id: 'id1', peerID: 'QmSellerMod', profile: mockProfile },
      ]);

      const result = await moderatorsApi.getModerators({ vendorPeerID: 'QmSeller' });

      expect(mockFetchStoreMetadata).toHaveBeenCalledWith('QmSeller', ['store_policy']);
      expect(mockPublicPost).toHaveBeenCalledWith('/profiles/batch', ['QmSellerMod']);
      expect(result.moderators).toHaveLength(1);
      expect(result.moderators[0].peerID).toBe('QmSellerMod');
    });

    it('should accept admin StorePolicy object responses for store moderators', async () => {
      const mockProfile = {
        peerID: 'QmMod1',
        name: 'Trusted Moderator',
        moderator: true,
        moderatorInfo: {
          languages: ['en'],
          fee: { percentage: 1, feeType: 'PERCENTAGE' },
        },
      };

      mockAuthGet.mockResolvedValueOnce({
        revision: 7,
        moderators: [{ peerID: 'QmMod1', enabled: true, position: 0 }],
      });
      mockPublicPost.mockResolvedValueOnce([{ id: 'id1', peerID: 'QmMod1', profile: mockProfile }]);

      const result = await moderatorsApi.getModerators();

      expect(result.moderators).toHaveLength(1);
      expect(result.moderators[0].peerID).toBe('QmMod1');
    });

    it('should filter out disabled public policy moderators before profile lookup', async () => {
      const mockProfile = {
        peerID: 'QmSellerMod',
        name: 'Seller Moderator',
        moderator: true,
        moderatorInfo: {
          languages: ['en'],
          fee: { percentage: 1, feeType: 'PERCENTAGE' },
        },
      };
      mockPublicGet.mockResolvedValueOnce({
        revision: 3,
        moderators: [
          { peerID: 'QmSellerMod', enabled: true, position: 0 },
          { peerID: 'QmDisabled', enabled: false, position: 1 },
        ],
      });
      mockPublicPost.mockResolvedValueOnce([
        { id: 'id1', peerID: 'QmSellerMod', profile: mockProfile },
      ]);

      const result = await moderatorsApi.getModerators({ vendorPeerID: 'QmSeller' });

      expect(mockPublicPost).toHaveBeenCalledWith('/profiles/batch', ['QmSellerMod']);
      expect(result.moderators).toHaveLength(1);
      expect(result.moderators[0].peerID).toBe('QmSellerMod');
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
      mockAuthGet.mockResolvedValueOnce([]);

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

    it('should not use raw peerID as display name', async () => {
      mockApiClient.get.mockResolvedValueOnce([
        {
          ...mockModerator,
          name: 'QmMod1',
          handle: '',
        },
      ]);

      const result = await moderatorsApi.getRecommendedModerators(1);

      expect(result[0]?.name).toBe('');
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

  describe('store moderators StorePolicy', () => {
    const mockProfile = {
      peerID: 'QmMod1',
      name: 'Trusted Moderator',
      moderator: true,
      moderatorInfo: {
        languages: ['en'],
        fee: { percentage: 1, feeType: 'PERCENTAGE' },
      },
    };

    it('should add store moderator after profile lookup', async () => {
      mockAuthGet.mockResolvedValueOnce([]);
      mockPublicPost.mockResolvedValueOnce([{ id: 'id1', peerID: 'QmMod1', profile: mockProfile }]);
      mockAuthPut.mockResolvedValueOnce(undefined);

      const result = await moderatorsApi.addStoreModerator('QmMod1');

      expect(result.success).toBe(true);
      expect(result.moderator?.peerID).toBe('QmMod1');
      expect(mockAuthPut).toHaveBeenCalledWith('/store-policy/moderators', {
        moderators: [{ peerID: 'QmMod1', enabled: true, position: 0 }],
      });
    });

    it('should reject duplicate store moderator', async () => {
      mockAuthGet.mockResolvedValueOnce([{ peerID: 'QmMod1', enabled: true, position: 0 }]);

      const result = await moderatorsApi.addStoreModerator('QmMod1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Moderator already added');
    });

    it('should remove store moderator', async () => {
      mockAuthDel.mockResolvedValueOnce(undefined);

      const result = await moderatorsApi.removeStoreModerator('QmMod1');

      expect(result.success).toBe(true);
      expect(mockAuthDel).toHaveBeenCalledWith('/store-policy/moderators/QmMod1');
    });

    it('should keep peerID placeholder when profile batch misses an entry', async () => {
      mockAuthGet.mockResolvedValueOnce([
        { peerID: 'QmMod1', enabled: true, position: 0 },
        { peerID: 'QmMissing', enabled: true, position: 1 },
      ]);
      mockPublicPost.mockResolvedValueOnce([{ id: 'id1', peerID: 'QmMod1', profile: mockProfile }]);

      const result = await moderatorsApi.getModerators();

      expect(result.moderators).toHaveLength(2);
      expect(result.moderators[1].peerID).toBe('QmMissing');
    });
  });

  describe('discoverModerators', () => {
    const mockProfile = {
      peerID: 'QmMod1',
      name: 'Network Moderator',
      moderator: true,
      moderatorInfo: {
        languages: ['en'],
        fee: { percentage: 1, feeType: 'PERCENTAGE' },
      },
    };

    it('should merge network scan and verified moderators', async () => {
      mockFetchVerified.mockResolvedValueOnce(new Set(['QmVerified']));
      mockNodeAuthGet.mockResolvedValueOnce([mockProfile]);
      mockPublicPost.mockResolvedValueOnce([
        {
          id: 'id2',
          peerID: 'QmVerified',
          profile: { ...mockProfile, peerID: 'QmVerified', name: 'Verified Mod' },
        },
      ]);

      const result = await moderatorsApi.discoverModerators();

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some(m => m.peerID === 'QmMod1')).toBe(true);
    });
  });

  describe('getModeratorDetail', () => {
    it('should load moderator from profiles batch', async () => {
      const mockProfile = {
        peerID: 'QmMod1',
        name: 'Detail Moderator',
        moderator: true,
        moderatorInfo: {
          description: 'Detail bio',
          languages: ['en'],
          fee: { percentage: 1.5, feeType: 'PERCENTAGE' },
        },
      };

      mockFetchVerified.mockResolvedValueOnce(new Set(['QmMod1']));
      mockPublicPost.mockResolvedValueOnce([{ id: 'id1', peerID: 'QmMod1', profile: mockProfile }]);

      const result = await moderatorsApi.getModeratorDetail('QmMod1');

      expect(result).not.toBeNull();
      expect(result?.peerID).toBe('QmMod1');
      expect(result?.verified).toBe(true);
    });

    it('should return null when profile not found', async () => {
      mockFetchVerified.mockResolvedValueOnce(new Set());
      mockPublicPost.mockResolvedValueOnce([]);
      mockApiClient.get.mockRejectedValueOnce(new Error('not found'));

      const result = await moderatorsApi.getModeratorDetail('QmMissing');

      expect(result).toBeNull();
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
