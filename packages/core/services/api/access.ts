/**
 * Access Control API Service
 * 权限控制 API 服务
 */

import { apiClient } from './client';
import type {
  UserGroup,
  ProductGroup,
  UserGroupMember,
  ProductGroupItem,
  StoreAccessRequest,
  StorePrivacySettings,
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
  CreateProductGroupRequest,
  UpdateProductGroupRequest,
  ReviewAccessRequestData,
} from '../../types/access';

// ============ 用户分组 API ============

/**
 * 获取店铺的用户分组列表
 */
export async function getUserGroups(storeId: string): Promise<UserGroup[]> {
  return apiClient.get<UserGroup[]>(`/api/v1/stores/${storeId}/user-groups`);
}

/**
 * 获取单个用户分组
 */
export async function getUserGroup(storeId: string, groupId: string): Promise<UserGroup> {
  return apiClient.get<UserGroup>(`/api/v1/stores/${storeId}/user-groups/${groupId}`);
}

/**
 * 创建用户分组
 */
export async function createUserGroup(
  storeId: string,
  data: CreateUserGroupRequest
): Promise<UserGroup> {
  return apiClient.post<UserGroup>(`/api/v1/stores/${storeId}/user-groups`, data);
}

/**
 * 更新用户分组
 */
export async function updateUserGroup(
  storeId: string,
  groupId: string,
  data: UpdateUserGroupRequest
): Promise<UserGroup> {
  return apiClient.put<UserGroup>(`/api/v1/stores/${storeId}/user-groups/${groupId}`, data);
}

/**
 * 删除用户分组
 */
export async function deleteUserGroup(storeId: string, groupId: string): Promise<void> {
  return apiClient.delete(`/api/v1/stores/${storeId}/user-groups/${groupId}`);
}

/**
 * 获取用户分组成员
 */
export async function getUserGroupMembers(
  storeId: string,
  groupId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ members: UserGroupMember[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiClient.get<{ members: UserGroupMember[]; total: number }>(
    `/api/v1/stores/${storeId}/user-groups/${groupId}/members${query ? `?${query}` : ''}`
  );
}

/**
 * 添加成员到用户分组
 */
export async function addUserToGroup(
  storeId: string,
  groupId: string,
  userId: string,
  expiresAt?: string
): Promise<UserGroupMember> {
  return apiClient.post<UserGroupMember>(
    `/api/v1/stores/${storeId}/user-groups/${groupId}/members`,
    { userId, expiresAt }
  );
}

/**
 * 从用户分组移除成员
 */
export async function removeUserFromGroup(
  storeId: string,
  groupId: string,
  memberId: string
): Promise<void> {
  return apiClient.delete(`/api/v1/stores/${storeId}/user-groups/${groupId}/members/${memberId}`);
}

/**
 * 获取用户所属的分组
 */
export async function getUserGroupsForUser(storeId: string, userId: string): Promise<UserGroup[]> {
  return apiClient.get<UserGroup[]>(`/api/v1/stores/${storeId}/users/${userId}/groups`);
}

// ============ 商品分组 API ============

/**
 * 获取店铺的商品分组列表
 */
export async function getProductGroups(storeId: string): Promise<ProductGroup[]> {
  return apiClient.get<ProductGroup[]>(`/api/v1/stores/${storeId}/product-groups`);
}

/**
 * 获取单个商品分组
 */
export async function getProductGroup(storeId: string, groupId: string): Promise<ProductGroup> {
  return apiClient.get<ProductGroup>(`/api/v1/stores/${storeId}/product-groups/${groupId}`);
}

/**
 * 创建商品分组
 */
export async function createProductGroup(
  storeId: string,
  data: CreateProductGroupRequest
): Promise<ProductGroup> {
  return apiClient.post<ProductGroup>(`/api/v1/stores/${storeId}/product-groups`, data);
}

/**
 * 更新商品分组
 */
export async function updateProductGroup(
  storeId: string,
  groupId: string,
  data: UpdateProductGroupRequest
): Promise<ProductGroup> {
  return apiClient.put<ProductGroup>(`/api/v1/stores/${storeId}/product-groups/${groupId}`, data);
}

/**
 * 删除商品分组
 */
export async function deleteProductGroup(storeId: string, groupId: string): Promise<void> {
  return apiClient.delete(`/api/v1/stores/${storeId}/product-groups/${groupId}`);
}

/**
 * 获取商品分组中的商品
 */
export async function getProductGroupItems(
  storeId: string,
  groupId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ items: ProductGroupItem[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiClient.get<{ items: ProductGroupItem[]; total: number }>(
    `/api/v1/stores/${storeId}/product-groups/${groupId}/items${query ? `?${query}` : ''}`
  );
}

/**
 * 添加商品到分组
 */
export async function addProductToGroup(
  storeId: string,
  groupId: string,
  productId: string
): Promise<ProductGroupItem> {
  return apiClient.post<ProductGroupItem>(
    `/api/v1/stores/${storeId}/product-groups/${groupId}/items`,
    { productId }
  );
}

/**
 * 从分组移除商品
 */
export async function removeProductFromGroup(
  storeId: string,
  groupId: string,
  productId: string
): Promise<void> {
  return apiClient.delete(`/api/v1/stores/${storeId}/product-groups/${groupId}/items/${productId}`);
}

/**
 * 批量添加商品到分组
 */
export async function addProductsToGroup(
  storeId: string,
  groupId: string,
  productIds: string[]
): Promise<ProductGroupItem[]> {
  return apiClient.post<ProductGroupItem[]>(
    `/api/v1/stores/${storeId}/product-groups/${groupId}/items/batch`,
    { productIds }
  );
}

// ============ 访问请求 API ============

/**
 * 获取店铺的访问请求列表
 */
export async function getAccessRequests(
  storeId: string,
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<{ requests: StoreAccessRequest[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiClient.get<{ requests: StoreAccessRequest[]; total: number }>(
    `/api/v1/stores/${storeId}/access-requests${query ? `?${query}` : ''}`
  );
}

/**
 * 提交访问请求
 */
export async function submitAccessRequest(
  storeId: string,
  message?: string
): Promise<StoreAccessRequest> {
  return apiClient.post<StoreAccessRequest>(`/api/v1/stores/${storeId}/access-requests`, {
    message,
  });
}

/**
 * 审核访问请求
 */
export async function reviewAccessRequest(
  storeId: string,
  requestId: string,
  data: ReviewAccessRequestData
): Promise<StoreAccessRequest> {
  return apiClient.post<StoreAccessRequest>(
    `/api/v1/stores/${storeId}/access-requests/${requestId}/review`,
    data
  );
}

/**
 * 取消访问请求
 */
export async function cancelAccessRequest(storeId: string, requestId: string): Promise<void> {
  return apiClient.delete(`/api/v1/stores/${storeId}/access-requests/${requestId}`);
}

// ============ 隐私设置 API ============

/**
 * 获取店铺隐私设置
 */
export async function getPrivacySettings(storeId: string): Promise<StorePrivacySettings> {
  return apiClient.get<StorePrivacySettings>(`/api/v1/stores/${storeId}/privacy`);
}

/**
 * 更新店铺隐私设置
 */
export async function updatePrivacySettings(
  storeId: string,
  data: Partial<StorePrivacySettings>
): Promise<StorePrivacySettings> {
  return apiClient.put<StorePrivacySettings>(`/api/v1/stores/${storeId}/privacy`, data);
}

/**
 * 屏蔽用户
 */
export async function blockUser(storeId: string, userId: string): Promise<void> {
  return apiClient.post(`/api/v1/stores/${storeId}/blocked-users`, { userId });
}

/**
 * 解除屏蔽用户
 */
export async function unblockUser(storeId: string, userId: string): Promise<void> {
  return apiClient.delete(`/api/v1/stores/${storeId}/blocked-users/${userId}`);
}

/**
 * 获取屏蔽用户列表
 */
export async function getBlockedUsers(
  storeId: string
): Promise<{ userId: string; blockedAt: string }[]> {
  return apiClient.get(`/api/v1/stores/${storeId}/blocked-users`);
}

// ============ 权限检查 API ============

/**
 * 检查用户对店铺的访问权限
 */
export async function checkStoreAccess(
  storeId: string,
  userId?: string
): Promise<{
  canAccess: boolean;
  canPurchase: boolean;
  userGroups: string[];
  accessibleProductGroups: string[];
}> {
  const url = userId
    ? `/api/v1/stores/${storeId}/access-check?userId=${userId}`
    : `/api/v1/stores/${storeId}/access-check`;
  return apiClient.get(url);
}

/**
 * 检查用户对商品的访问权限
 */
export async function checkProductAccess(
  storeId: string,
  productId: string,
  userId?: string
): Promise<{
  canView: boolean;
  canViewPrice: boolean;
  canPurchase: boolean;
  specialPrice?: number;
}> {
  const url = userId
    ? `/api/v1/stores/${storeId}/products/${productId}/access-check?userId=${userId}`
    : `/api/v1/stores/${storeId}/products/${productId}/access-check`;
  return apiClient.get(url);
}
