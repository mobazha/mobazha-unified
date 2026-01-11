/**
 * Access Control API Service
 * 权限控制 API 服务
 *
 * 与 mobazha_hosting 后端 API 对齐
 * 所有 API 调用都通过 baseUrl（hosting_server）
 */

import { getEnvConfig } from '../../config/env';
import type {
  UserGroup,
  UserGroupMember,
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
  ProductGroup,
  ProductGroupItem,
  CreateProductGroupRequest,
  UpdateProductGroupRequest,
  ProductGroupAuthorization,
  AddProductGroupAuthorizationRequest,
  StoreAccessRequest,
  SubmitAccessRequestData,
  ReviewAccessRequestData,
  StoreAccessSettings,
  StoreAccessCheckResult,
  StoreAccessListItem,
  GroupSeller,
  ApplyAsSellerRequest,
  ReviewSellerRequest,
} from '../../types/access';

/**
 * 获取 API 基础 URL
 */
function getBaseUrl(): string {
  return getEnvConfig().api.baseUrl;
}

/**
 * 获取认证 headers
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 获取 token（兼容浏览器和 Node 环境）
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // 获取当前用户的 peerID（如果有）
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        if (profile.peerID) {
          headers['X-Requestor-PeerID'] = profile.peerID;
        }
      } catch {
        // ignore parse error
      }
    }

    // 获取群组上下文（如果有）
    const groupContext = localStorage.getItem('current_group_context');
    if (groupContext) {
      try {
        const ctx = JSON.parse(groupContext);
        if (ctx.platform) {
          headers['X-Group-Platform'] = ctx.platform;
        }
        if (ctx.chatId) {
          headers['X-Group-ChatID'] = ctx.chatId;
        }
      } catch {
        // ignore parse error
      }
    }
  }

  return headers;
}

// ============ 用户组管理 API ============

/**
 * 获取用户组列表
 * @param peerID - 用户的 peerID
 */
export async function getUserGroups(peerID: string): Promise<UserGroup[]> {
  const response = await fetch(`${getBaseUrl()}/api/v1/user-groups?peerID=${peerID}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get user groups');
  }
  return data.groups || data || [];
}

/**
 * 创建用户组
 */
export async function createUserGroup(data: CreateUserGroupRequest): Promise<UserGroup> {
  const response = await fetch(`${getBaseUrl()}/api/v1/user-groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to create user group');
  }
  return result;
}

/**
 * 更新用户组
 */
export async function updateUserGroup(
  groupId: number,
  data: UpdateUserGroupRequest
): Promise<UserGroup> {
  const response = await fetch(`${getBaseUrl()}/api/v1/user-groups/${groupId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to update user group');
  }
  return result;
}

/**
 * 删除用户组
 */
export async function deleteUserGroup(groupId: number): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/v1/user-groups/${groupId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || result.message || 'Failed to delete user group');
  }
}

// ============ 用户组成员管理 API ============

/**
 * 获取用户组成员列表
 */
export async function getUserGroupMembers(groupId: number): Promise<UserGroupMember[]> {
  const response = await fetch(`${getBaseUrl()}/api/v1/user-groups/${groupId}/members`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get members');
  }
  return data.members || data || [];
}

/**
 * 添加成员到用户组
 */
export async function addUserGroupMember(
  groupId: number,
  peerID: string
): Promise<UserGroupMember> {
  const response = await fetch(`${getBaseUrl()}/api/v1/user-groups/${groupId}/members`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ peerID }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to add member');
  }
  return result;
}

/**
 * 批量添加成员到用户组
 */
export async function addUserGroupMembersBatch(
  groupId: number,
  peerIDs: string[]
): Promise<{ added: number; failed: number }> {
  const response = await fetch(`${getBaseUrl()}/api/v1/user-groups/${groupId}/members/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ peerIDs }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to add members');
  }
  return result;
}

/**
 * 从用户组移除成员
 */
export async function removeUserGroupMember(groupId: number, memberId: number): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/user-groups/${groupId}/members/${memberId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || result.message || 'Failed to remove member');
  }
}

// ============ 产品组管理 API ============

/**
 * 获取产品组列表
 * @param userID - 用户 ID（Telegram User ID 等）
 */
export async function getProductGroups(userID: string): Promise<ProductGroup[]> {
  const response = await fetch(`${getBaseUrl()}/api/v1/product-groups?userID=${userID}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get product groups');
  }
  return data.productGroups || data || [];
}

/**
 * 创建产品组
 */
export async function createProductGroup(data: CreateProductGroupRequest): Promise<ProductGroup> {
  const response = await fetch(`${getBaseUrl()}/api/v1/product-groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to create product group');
  }
  return result;
}

/**
 * 更新产品组
 */
export async function updateProductGroup(
  groupId: number,
  data: UpdateProductGroupRequest
): Promise<ProductGroup> {
  const response = await fetch(`${getBaseUrl()}/api/v1/product-groups/${groupId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to update product group');
  }
  return result;
}

/**
 * 删除产品组
 */
export async function deleteProductGroup(groupId: number): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/v1/product-groups/${groupId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || result.message || 'Failed to delete product group');
  }
}

/**
 * 获取产品组中的商品列表
 */
export async function getProductGroupItems(groupId: number): Promise<ProductGroupItem[]> {
  const response = await fetch(`${getBaseUrl()}/api/v1/product-groups/${groupId}/items`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get items');
  }
  return data.data || data || [];
}

/**
 * 添加商品到产品组
 */
export async function addProductToGroup(
  groupId: number,
  listingSlug: string,
  peerID: string
): Promise<ProductGroupItem> {
  const response = await fetch(`${getBaseUrl()}/api/v1/product-groups/${groupId}/items`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ listingSlug, peerID }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to add product');
  }
  return result;
}

/**
 * 从产品组移除商品
 */
export async function removeProductFromGroup(groupId: number, slug: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/v1/product-groups/${groupId}/items/${slug}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || result.message || 'Failed to remove product');
  }
}

// ============ 产品组授权管理 API ============

/**
 * 获取产品组的授权规则
 */
export async function getProductGroupAuthorizations(
  productGroupId: number
): Promise<ProductGroupAuthorization[]> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/product-groups/${productGroupId}/authorizations`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get authorizations');
  }
  return data.authorizations || data || [];
}

/**
 * 添加产品组授权规则
 */
export async function addProductGroupAuthorization(
  productGroupId: number,
  data: AddProductGroupAuthorizationRequest
): Promise<ProductGroupAuthorization> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/product-groups/${productGroupId}/authorizations`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to add authorization');
  }
  return result;
}

/**
 * 删除产品组授权规则
 */
export async function deleteProductGroupAuthorization(
  productGroupId: number,
  authId: number
): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/product-groups/${productGroupId}/authorizations/${authId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || result.message || 'Failed to delete authorization');
  }
}

// ============ 店铺访问申请管理 API ============

/**
 * 获取店铺的访问申请列表
 */
export async function getStoreAccessRequests(
  storePeerID: string,
  status?: string
): Promise<StoreAccessRequest[]> {
  let url = `${getBaseUrl()}/api/v1/store-access-requests?storePeerID=${storePeerID}`;
  if (status) {
    url += `&status=${status}`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get access requests');
  }
  return data.requests || data || [];
}

/**
 * 提交店铺访问申请
 */
export async function submitStoreAccessRequest(
  data: SubmitAccessRequestData
): Promise<StoreAccessRequest> {
  const response = await fetch(`${getBaseUrl()}/api/v1/store-access-requests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to submit request');
  }
  return result;
}

/**
 * 审核访问申请
 */
export async function reviewAccessRequest(
  requestId: number,
  data: ReviewAccessRequestData
): Promise<StoreAccessRequest> {
  const response = await fetch(`${getBaseUrl()}/api/v1/store-access-requests/${requestId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to review request');
  }
  return result;
}

// ============ 店铺访问检查 API ============

/**
 * 检查用户对店铺的访问权限
 */
export async function checkStoreAccess(
  storePeerID: string,
  requestorPeerID: string,
  groupPlatform?: string,
  groupChatID?: string
): Promise<StoreAccessCheckResult> {
  let url = `${getBaseUrl()}/api/v1/store-access/check?storePeerID=${storePeerID}&requestorPeerID=${requestorPeerID}`;

  // 添加群组上下文参数（如果有）
  if (groupPlatform && groupChatID) {
    url += `&groupPlatform=${encodeURIComponent(groupPlatform)}&groupChatID=${encodeURIComponent(groupChatID)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to check access');
  }
  return data;
}

// ============ 店铺访问设置 API ============

/**
 * 获取店铺访问设置
 */
export async function getStoreAccessSettings(peerID: string): Promise<StoreAccessSettings> {
  const response = await fetch(`${getBaseUrl()}/api/v1/store-access-settings?peerID=${peerID}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get settings');
  }
  return data;
}

/**
 * 更新店铺访问设置
 */
export async function updateStoreAccessSettings(
  peerID: string,
  data: Partial<StoreAccessSettings>
): Promise<StoreAccessSettings> {
  const response = await fetch(`${getBaseUrl()}/api/v1/store-access-settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ peerID, ...data }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to update settings');
  }
  return result;
}

// ============ 店铺访问白名单 API ============

/**
 * 获取店铺访问白名单
 */
export async function getStoreAccessList(storePeerID: string): Promise<StoreAccessListItem[]> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/store-access-list?storePeerID=${storePeerID}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get access list');
  }
  return data.list || data || [];
}

/**
 * 直接添加用户到白名单
 */
export async function addToStoreAccessList(
  storePeerID: string,
  requestorPeerID: string
): Promise<StoreAccessListItem> {
  const response = await fetch(`${getBaseUrl()}/api/v1/store-access-list`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storePeerID, requestorPeerID }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to add to list');
  }
  return result;
}

/**
 * 从白名单移除用户
 */
export async function removeFromStoreAccessList(
  storePeerID: string,
  requestorPeerID: string
): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/store-access-list?storePeerID=${storePeerID}&requestorPeerID=${requestorPeerID}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || result.message || 'Failed to remove from list');
  }
}

// ============ 群组集市 API ============

/**
 * 获取群组商品列表
 */
export async function getGroupListings(
  platform: string,
  chatId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<{ listings: unknown[]; total: number }> {
  const queryParams = new URLSearchParams({
    page: String(params.page || 1),
    pageSize: String(params.pageSize || 20),
  });

  const response = await fetch(
    `${getBaseUrl()}/api/v1/group-marketplace/${platform}/${chatId}/listings?${queryParams}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get listings');
  }
  return data;
}

/**
 * 获取群组卖家列表
 */
export async function getGroupSellers(
  platform: string,
  chatId: string,
  filters: { status?: string; userID?: string } = {}
): Promise<GroupSeller[]> {
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.userID) queryParams.set('userID', filters.userID);

  const response = await fetch(
    `${getBaseUrl()}/api/v1/group-marketplace/${platform}/${chatId}/sellers?${queryParams}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get sellers');
  }
  return data.sellers || data || [];
}

/**
 * 申请成为卖家
 */
export async function applyAsSeller(
  platform: string,
  chatId: string,
  data: ApplyAsSellerRequest
): Promise<GroupSeller> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/group-marketplace/${platform}/${chatId}/sellers/apply`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to apply');
  }
  return result;
}

/**
 * 审核卖家
 */
export async function reviewSeller(
  platform: string,
  chatId: string,
  sellerId: number,
  data: ReviewSellerRequest
): Promise<GroupSeller> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/group-marketplace/${platform}/${chatId}/sellers/${sellerId}/review`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to review');
  }
  return result;
}

/**
 * 检查管理员权限
 */
export async function checkGroupAdmin(
  platform: string,
  chatId: string,
  platformUserID: string
): Promise<{ isAdmin: boolean }> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/group-marketplace/${platform}/${chatId}/check-admin`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ platformUserID }),
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to check admin');
  }
  return result;
}

// ============ 导出 apiClient 兼容调用 ============

export const accessApi = {
  // 用户组
  getUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  getUserGroupMembers,
  addUserGroupMember,
  addUserGroupMembersBatch,
  removeUserGroupMember,

  // 产品组
  getProductGroups,
  createProductGroup,
  updateProductGroup,
  deleteProductGroup,
  getProductGroupItems,
  addProductToGroup,
  removeProductFromGroup,
  getProductGroupAuthorizations,
  addProductGroupAuthorization,
  deleteProductGroupAuthorization,

  // 访问申请
  getStoreAccessRequests,
  submitStoreAccessRequest,
  reviewAccessRequest,

  // 访问检查
  checkStoreAccess,

  // 访问设置
  getStoreAccessSettings,
  updateStoreAccessSettings,

  // 白名单
  getStoreAccessList,
  addToStoreAccessList,
  removeFromStoreAccessList,

  // 群组集市
  getGroupListings,
  getGroupSellers,
  applyAsSeller,
  reviewSeller,
  checkGroupAdmin,
};
