/**
 * Access Control API Tests
 * 专卖店访问控制 API 测试
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
import * as accessApi from '../../../services/api/access';

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Import types after mock setup
import type {
  UserGroup,
  ProductGroup,
  StoreAccessRequest,
  StorePrivacySettings,
} from '../../../types/access';

describe('Access Control API', () => {
  const storeId = 'store1';

  const mockUserGroup: UserGroup = {
    id: 'group1',
    storeId: 'store1',
    name: 'VIP Customers',
    description: 'Special access group',
    color: '#ff0000',
    memberCount: 50,
    permissions: {
      canViewStore: true,
      canViewProducts: true,
      canViewPrices: true,
      canPurchase: true,
      canAccessChat: true,
      canViewDiscounts: true,
      productGroupAccess: ['pgroup1'],
    },
    isDefault: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  };

  const mockProductGroup: ProductGroup = {
    id: 'pgroup1',
    storeId: 'store1',
    name: 'Premium Products',
    description: 'High-end items',
    productCount: 15,
    visibility: 'group_only' as const,
    accessUserGroups: ['group1'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============ User Groups Tests ============

  describe('getUserGroups', () => {
    it('should fetch user groups', async () => {
      mockApiClient.get.mockResolvedValueOnce([mockUserGroup]);

      const result = await accessApi.getUserGroups(storeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/stores/${storeId}/user-groups`);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe('VIP Customers');
    });
  });

  describe('getUserGroup', () => {
    it('should fetch a single user group', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockUserGroup);

      const result = await accessApi.getUserGroup(storeId, 'group1');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/user-groups/group1`
      );
      expect(result.id).toBe('group1');
    });
  });

  describe('createUserGroup', () => {
    it('should create a new user group', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockUserGroup);

      const result = await accessApi.createUserGroup(storeId, {
        name: 'VIP Customers',
        description: 'Special access group',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/user-groups`,
        expect.any(Object)
      );
      expect(result.name).toBe('VIP Customers');
    });
  });

  describe('updateUserGroup', () => {
    it('should update a user group', async () => {
      const updatedGroup = { ...mockUserGroup, name: 'Super VIP' };
      mockApiClient.put.mockResolvedValueOnce(updatedGroup);

      const result = await accessApi.updateUserGroup(storeId, 'group1', {
        name: 'Super VIP',
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/user-groups/group1`,
        { name: 'Super VIP' }
      );
      expect(result.name).toBe('Super VIP');
    });
  });

  describe('deleteUserGroup', () => {
    it('should delete a user group', async () => {
      mockApiClient.delete.mockResolvedValueOnce(undefined);

      await accessApi.deleteUserGroup(storeId, 'group1');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/user-groups/group1`
      );
    });
  });

  describe('addUserToGroup', () => {
    it('should add a user to a group', async () => {
      const mockMember = {
        id: 'mem1',
        groupId: 'group1',
        userId: 'QmUser1',
        addedAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockMember);

      const result = await accessApi.addUserToGroup(storeId, 'group1', 'QmUser1');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/user-groups/group1/members`,
        { userId: 'QmUser1', expiresAt: undefined }
      );
      expect(result.userId).toBe('QmUser1');
    });
  });

  describe('removeUserFromGroup', () => {
    it('should remove a user from a group', async () => {
      mockApiClient.delete.mockResolvedValueOnce(undefined);

      await accessApi.removeUserFromGroup(storeId, 'group1', 'mem1');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/user-groups/group1/members/mem1`
      );
    });
  });

  // ============ Product Groups Tests ============

  describe('getProductGroups', () => {
    it('should fetch product groups', async () => {
      mockApiClient.get.mockResolvedValueOnce([mockProductGroup]);

      const result = await accessApi.getProductGroups(storeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/stores/${storeId}/product-groups`);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe('Premium Products');
    });
  });

  describe('createProductGroup', () => {
    it('should create a new product group', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockProductGroup);

      const result = await accessApi.createProductGroup(storeId, {
        name: 'Premium Products',
        isPublic: false,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/product-groups`,
        expect.any(Object)
      );
      expect(result.name).toBe('Premium Products');
    });
  });

  describe('addProductToGroup', () => {
    it('should add a product to a group', async () => {
      const mockItem = {
        id: 'item1',
        productGroupId: 'pgroup1',
        productId: 'prod1',
        addedAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockItem);

      const result = await accessApi.addProductToGroup(storeId, 'pgroup1', 'prod1');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/product-groups/pgroup1/items`,
        { productId: 'prod1' }
      );
      expect(result.productId).toBe('prod1');
    });
  });

  // ============ Access Requests Tests ============

  describe('getAccessRequests', () => {
    it('should fetch access requests', async () => {
      const mockRequests: StoreAccessRequest[] = [
        {
          id: 'req1',
          storeId: 'store1',
          requesterPeerID: 'QmUser1',
          requesterName: 'John',
          message: 'Please grant me access',
          status: 'pending',
          createdAt: '2024-01-15T00:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({
        requests: mockRequests,
        total: 1,
      });

      const result = await accessApi.getAccessRequests(storeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/stores/${storeId}/access-requests`);
      expect(result.requests).toHaveLength(1);
    });

    it('should pass status filter', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        requests: [],
        total: 0,
      });

      await accessApi.getAccessRequests(storeId, { status: 'pending' });

      expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('status=pending'));
    });
  });

  describe('submitAccessRequest', () => {
    it('should submit an access request', async () => {
      const mockRequest: StoreAccessRequest = {
        id: 'req1',
        storeId: 'store1',
        requesterPeerID: 'QmUser1',
        requesterName: 'John',
        message: 'I want to access your store',
        status: 'pending',
        createdAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockRequest);

      const result = await accessApi.submitAccessRequest(storeId, 'I want to access your store');

      expect(mockApiClient.post).toHaveBeenCalledWith(`/api/v1/stores/${storeId}/access-requests`, {
        message: 'I want to access your store',
      });
      expect(result.status).toBe('pending');
    });
  });

  describe('reviewAccessRequest', () => {
    it('should approve an access request', async () => {
      const approvedRequest: StoreAccessRequest = {
        id: 'req1',
        storeId: 'store1',
        requesterPeerID: 'QmUser1',
        requesterName: 'John',
        message: 'I want access',
        status: 'approved',
        createdAt: '2024-01-15T00:00:00Z',
        reviewedAt: '2024-01-16T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(approvedRequest);

      const result = await accessApi.reviewAccessRequest(storeId, 'req1', {
        approved: true,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/access-requests/req1/review`,
        { approved: true }
      );
      expect(result.status).toBe('approved');
    });

    it('should reject an access request with note', async () => {
      const rejectedRequest: StoreAccessRequest = {
        id: 'req1',
        storeId: 'store1',
        requesterPeerID: 'QmUser1',
        requesterName: 'John',
        message: 'I want access',
        status: 'rejected',
        createdAt: '2024-01-15T00:00:00Z',
        reviewedAt: '2024-01-16T00:00:00Z',
        reviewNote: 'Not eligible',
      };

      mockApiClient.post.mockResolvedValueOnce(rejectedRequest);

      const result = await accessApi.reviewAccessRequest(storeId, 'req1', {
        approved: false,
        note: 'Not eligible',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/access-requests/req1/review`,
        { approved: false, note: 'Not eligible' }
      );
      expect(result.status).toBe('rejected');
    });
  });

  // ============ Privacy Settings Tests ============

  describe('getPrivacySettings', () => {
    it('should fetch privacy settings', async () => {
      const mockSettings: StorePrivacySettings = {
        storeId: 'store1',
        isPrivate: true,
        requireApproval: true,
        blockedUsers: [],
      };

      mockApiClient.get.mockResolvedValueOnce(mockSettings);

      const result = await accessApi.getPrivacySettings(storeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/stores/${storeId}/privacy`);
      expect(result.isPrivate).toBe(true);
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update privacy settings', async () => {
      const updatedSettings: StorePrivacySettings = {
        storeId: 'store1',
        isPrivate: false,
        requireApproval: false,
        blockedUsers: [],
      };

      mockApiClient.put.mockResolvedValueOnce(updatedSettings);

      const result = await accessApi.updatePrivacySettings(storeId, {
        isPrivate: false,
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(`/api/v1/stores/${storeId}/privacy`, {
        isPrivate: false,
      });
      expect(result.isPrivate).toBe(false);
    });
  });

  // ============ Access Check Tests ============

  describe('checkStoreAccess', () => {
    it('should check store access', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        canAccess: true,
        canPurchase: true,
        userGroups: ['group1'],
        accessibleProductGroups: ['pgroup1'],
      });

      const result = await accessApi.checkStoreAccess(storeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/stores/${storeId}/access-check`);
      expect(result.canAccess).toBe(true);
    });

    it('should check access for specific user', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        canAccess: true,
        canPurchase: false,
        userGroups: [],
        accessibleProductGroups: [],
      });

      await accessApi.checkStoreAccess(storeId, 'QmUser1');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/access-check?userId=QmUser1`
      );
    });
  });

  describe('checkProductAccess', () => {
    it('should check product access', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        canView: true,
        canViewPrice: true,
        canPurchase: true,
      });

      const result = await accessApi.checkProductAccess(storeId, 'prod1');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/api/v1/stores/${storeId}/products/prod1/access-check`
      );
      expect(result.canPurchase).toBe(true);
    });
  });
});

describe('Access Control Type Validation', () => {
  it('should have correct structure for UserGroup', () => {
    const userGroup: UserGroup = {
      id: 'test-group',
      storeId: 'store1',
      name: 'Test Group',
      memberCount: 5,
      permissions: {
        canViewStore: true,
        canViewProducts: true,
        canViewPrices: true,
        canPurchase: true,
        canAccessChat: false,
        canViewDiscounts: false,
        productGroupAccess: [],
      },
      isDefault: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(userGroup.id).toBeTruthy();
    expect(userGroup.name).toBeTruthy();
    expect(typeof userGroup.memberCount).toBe('number');
    expect(Array.isArray(userGroup.permissions.productGroupAccess)).toBe(true);
  });

  it('should have correct structure for ProductGroup', () => {
    const productGroup: ProductGroup = {
      id: 'test-pgroup',
      storeId: 'store1',
      name: 'Test Product Group',
      productCount: 10,
      visibility: 'group_only' as const,
      accessUserGroups: ['group1'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(productGroup.id).toBeTruthy();
    expect(productGroup.name).toBeTruthy();
    expect(typeof productGroup.productCount).toBe('number');
    expect(productGroup.visibility).toBe('group_only');
  });

  it('should have correct structure for StorePrivacySettings', () => {
    const settings: StorePrivacySettings = {
      storeId: 'store1',
      isPrivate: true,
      requireApproval: true,
      blockedUsers: [],
    };

    expect(typeof settings.isPrivate).toBe('boolean');
    expect(typeof settings.requireApproval).toBe('boolean');
  });
});
