/**
 * Access Control API Service
 * 权限控制 API 服务
 *
 * 与 mobazha_hosting 后端 API 对齐
 * 所有 API 调用都通过 baseUrl（hosting_server）
 */

import { getEnvConfig } from '../../config/env';
import { getStoredToken } from '../auth/token';
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
import { HOSTING_API } from '../../config/apiPaths';

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

  // 获取 token（使用统一的 token 存储）
  const token = getStoredToken();
  if (token) {
    // 处理不同的 token 格式
    if (token.startsWith('basic:')) {
      // Basic Auth 格式: "basic:base64encoded"
      const base64Credentials = token.slice(6); // 移除 "basic:" 前缀
      headers.Authorization = `Basic ${base64Credentials}`;
    } else {
      // JWT/OAuth token
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // 获取当前用户的 peerID 和群组上下文（仅浏览器环境）
  if (typeof window !== 'undefined') {
    // 获取当前用户的 peerID
    let peerID: string | undefined;

    // 1. 从 Zustand persist 存储读取 (userStore)
    const zustandStorage = localStorage.getItem('mobazha-user-storage');
    if (zustandStorage) {
      try {
        const data = JSON.parse(zustandStorage);
        if (data?.state?.profile?.peerID) {
          peerID = data.state.profile.peerID;
        }
      } catch {
        // ignore parse error
      }
    }

    // 2. 从 token.ts 的 user 存储读取
    if (!peerID) {
      const authUser = localStorage.getItem('mobazha_auth_user');
      if (authUser) {
        try {
          const user = JSON.parse(authUser);
          if (user?.id) {
            peerID = user.id;
          }
        } catch {
          // ignore parse error
        }
      }
    }

    if (peerID) {
      headers['X-Requestor-PeerID'] = peerID;
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

/**
 * Unwrap {data: T} envelope from backend JSON responses.
 */
function unwrapData<T>(json: unknown): T {
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return (json as Record<string, unknown>).data as T;
  }
  return json as T;
}

/**
 * Extract error message from error response body.
 * Supports both old format {error: string} and new format {error: {code, message}}.
 */
function extractErrorMessage(errBody: unknown): string {
  if (errBody == null || typeof errBody !== 'object') return 'Request failed';
  const o = errBody as Record<string, unknown>;
  const err = o.error;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as Record<string, unknown>).message;
    return typeof msg === 'string' ? msg : 'Request failed';
  }
  if (typeof o.message === 'string') return o.message;
  return 'Request failed';
}

// ============ 用户组管理 API ============

/**
 * 获取用户组列表
 * @param peerID - 用户的 peerID
 */
export async function getUserGroups(peerID: string): Promise<UserGroup[]> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.USER_GROUPS}?peerID=${peerID}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  const data = unwrapData<{ groups?: UserGroup[] } | UserGroup[] | null>(raw);
  if (data == null) return [];
  if (Array.isArray((data as { groups?: UserGroup[] }).groups)) {
    return (data as { groups: UserGroup[] }).groups;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

/**
 * 创建用户组
 */
export async function createUserGroup(data: CreateUserGroupRequest): Promise<UserGroup> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.USER_GROUPS}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<UserGroup>(raw);
}

/**
 * 更新用户组
 */
export async function updateUserGroup(
  groupId: number,
  data: UpdateUserGroupRequest
): Promise<UserGroup> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.USER_GROUP(String(groupId))}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<UserGroup>(raw);
}

/**
 * 删除用户组
 */
export async function deleteUserGroup(groupId: number): Promise<void> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.USER_GROUP(String(groupId))}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(raw));
  }
}

// ============ 用户组成员管理 API ============

/**
 * 获取用户组成员列表
 */
export async function getUserGroupMembers(groupId: number): Promise<UserGroupMember[]> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.USER_GROUP_MEMBERS(String(groupId))}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  const data = unwrapData<{ members?: UserGroupMember[] } | UserGroupMember[] | null>(raw);
  if (data == null) return [];
  return Array.isArray((data as { members?: UserGroupMember[] }).members)
    ? (data as { members: UserGroupMember[] }).members
    : Array.isArray(data)
      ? data
      : [];
}

/**
 * 添加成员到用户组
 */
export async function addUserGroupMember(
  groupId: number,
  peerID: string
): Promise<UserGroupMember> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.USER_GROUP_MEMBERS(String(groupId))}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ peerID }),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<UserGroupMember>(raw);
}

/**
 * 批量添加成员到用户组
 */
export async function addUserGroupMembersBatch(
  groupId: number,
  peerIDs: string[]
): Promise<{ added: number; failed: number }> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.USER_GROUP_MEMBERS_BATCH(String(groupId))}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ peerIDs }),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<{ added: number; failed: number }>(raw);
}

/**
 * 从用户组移除成员
 */
export async function removeUserGroupMember(groupId: number, memberId: number): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.USER_GROUP_MEMBER(String(groupId), String(memberId))}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(raw));
  }
}

// ============ 产品组管理 API ============

/**
 * 获取产品组列表
 * @param userID - 用户 ID（Telegram User ID 等）
 */
export async function getProductGroups(userID: string): Promise<ProductGroup[]> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.PRODUCT_GROUPS}?userID=${userID}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  const data = unwrapData<{ productGroups?: ProductGroup[] } | ProductGroup[] | null>(raw);
  if (data == null) return [];
  return Array.isArray((data as { productGroups?: ProductGroup[] }).productGroups)
    ? (data as { productGroups: ProductGroup[] }).productGroups
    : Array.isArray(data)
      ? data
      : [];
}

/**
 * 创建产品组
 */
export async function createProductGroup(data: CreateProductGroupRequest): Promise<ProductGroup> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.PRODUCT_GROUPS}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<ProductGroup>(raw);
}

/**
 * 更新产品组
 */
export async function updateProductGroup(
  groupId: number,
  data: UpdateProductGroupRequest
): Promise<ProductGroup> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.PRODUCT_GROUP(String(groupId))}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<ProductGroup>(raw);
}

/**
 * 删除产品组
 */
export async function deleteProductGroup(groupId: number): Promise<void> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.PRODUCT_GROUP(String(groupId))}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(raw));
  }
}

/**
 * 获取产品组中的商品列表
 */
export async function getProductGroupItems(groupId: number): Promise<ProductGroupItem[]> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.PRODUCT_GROUP_ITEMS(String(groupId))}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  const data = unwrapData<{ data?: ProductGroupItem[] } | ProductGroupItem[] | null>(raw);
  if (data == null) return [];
  return Array.isArray((data as { data?: ProductGroupItem[] }).data)
    ? (data as { data: ProductGroupItem[] }).data
    : Array.isArray(data)
      ? data
      : [];
}

/**
 * 添加商品到产品组
 */
export async function addProductToGroup(
  groupId: number,
  listingSlug: string,
  peerID: string
): Promise<ProductGroupItem> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.PRODUCT_GROUP_ITEMS(String(groupId))}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ listingSlug, peerID }),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<ProductGroupItem>(raw);
}

/**
 * 从产品组移除商品
 */
export async function removeProductFromGroup(groupId: number, slug: string): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.PRODUCT_GROUP_ITEM(String(groupId), slug)}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(raw));
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
    `${getBaseUrl()}${HOSTING_API.PRODUCT_GROUP_AUTHORIZATIONS(String(productGroupId))}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  const data = unwrapData<
    { authorizations?: ProductGroupAuthorization[] } | ProductGroupAuthorization[]
  >(raw);
  return Array.isArray((data as { authorizations?: ProductGroupAuthorization[] }).authorizations)
    ? (data as { authorizations: ProductGroupAuthorization[] }).authorizations
    : Array.isArray(data)
      ? data
      : [];
}

/**
 * 添加产品组授权规则
 */
export async function addProductGroupAuthorization(
  productGroupId: number,
  data: AddProductGroupAuthorizationRequest
): Promise<ProductGroupAuthorization> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.PRODUCT_GROUP_AUTHORIZATIONS(String(productGroupId))}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<ProductGroupAuthorization>(raw);
}

/**
 * 删除产品组授权规则
 */
export async function deleteProductGroupAuthorization(
  productGroupId: number,
  authId: number
): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.PRODUCT_GROUP_AUTHORIZATION(String(productGroupId), String(authId))}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(raw));
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
  let url = `${getBaseUrl()}${HOSTING_API.STORE_ACCESS_REQUESTS}?storePeerID=${storePeerID}`;
  if (status) {
    url += `&status=${status}`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  const data = unwrapData<{ requests?: StoreAccessRequest[] } | StoreAccessRequest[] | null>(raw);
  if (data == null) return [];
  return Array.isArray((data as { requests?: StoreAccessRequest[] }).requests)
    ? (data as { requests: StoreAccessRequest[] }).requests
    : Array.isArray(data)
      ? data
      : [];
}

/**
 * 提交店铺访问申请
 */
export async function submitStoreAccessRequest(
  data: SubmitAccessRequestData
): Promise<StoreAccessRequest> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_ACCESS_REQUESTS}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreAccessRequest>(raw);
}

/**
 * 审核访问申请
 */
export async function reviewAccessRequest(
  requestId: number,
  data: ReviewAccessRequestData
): Promise<StoreAccessRequest> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.STORE_ACCESS_REQUEST(String(requestId))}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreAccessRequest>(raw);
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
  let url = `${getBaseUrl()}${HOSTING_API.STORE_ACCESS_CHECK}?storePeerID=${storePeerID}&requestorPeerID=${requestorPeerID}`;

  // 添加群组上下文参数（如果有）
  if (groupPlatform && groupChatID) {
    url += `&groupPlatform=${encodeURIComponent(groupPlatform)}&groupChatID=${encodeURIComponent(groupChatID)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreAccessCheckResult>(raw);
}

// ============ 店铺访问设置 API ============

/**
 * 获取店铺访问设置
 */
export async function getStoreAccessSettings(peerID: string): Promise<StoreAccessSettings> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.STORE_ACCESS_SETTINGS}?peerID=${peerID}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreAccessSettings>(raw);
}

/**
 * 更新店铺访问设置
 */
export async function updateStoreAccessSettings(
  peerID: string,
  data: Partial<StoreAccessSettings>
): Promise<StoreAccessSettings> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_ACCESS_SETTINGS}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ peerID, ...data }),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreAccessSettings>(raw);
}

// ============ 店铺访问白名单 API ============

/**
 * 获取店铺访问白名单
 */
export async function getStoreAccessList(storePeerID: string): Promise<StoreAccessListItem[]> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.STORE_ACCESS_LIST}?storePeerID=${storePeerID}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  const data = unwrapData<{ accessList?: StoreAccessListItem[] } | StoreAccessListItem[] | null>(
    raw
  );
  if (data == null) return [];
  return Array.isArray((data as { accessList?: StoreAccessListItem[] }).accessList)
    ? (data as { accessList: StoreAccessListItem[] }).accessList
    : Array.isArray(data)
      ? data
      : [];
}

/**
 * 直接添加用户到白名单
 */
export async function addToStoreAccessList(
  storePeerID: string,
  requestorPeerID: string
): Promise<StoreAccessListItem> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_ACCESS_LIST}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storePeerID, requestorPeerID }),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreAccessListItem>(raw);
}

/**
 * 从白名单移除用户
 */
export async function removeFromStoreAccessList(
  storePeerID: string,
  requestorPeerID: string
): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.STORE_ACCESS_LIST}?storePeerID=${storePeerID}&requestorPeerID=${requestorPeerID}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(raw));
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
    `${getBaseUrl()}${HOSTING_API.GROUP_MARKETPLACE_LISTINGS(platform, chatId)}?${queryParams}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<{ listings: unknown[]; total: number }>(raw);
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
    `${getBaseUrl()}${HOSTING_API.GROUP_MARKETPLACE_SELLERS(platform, chatId)}?${queryParams}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  const data = unwrapData<{ sellers?: GroupSeller[] } | GroupSeller[] | null>(raw);
  if (data == null) return [];
  return Array.isArray((data as { sellers?: GroupSeller[] }).sellers)
    ? (data as { sellers: GroupSeller[] }).sellers
    : Array.isArray(data)
      ? data
      : [];
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
    `${getBaseUrl()}${HOSTING_API.GROUP_MARKETPLACE_SELLERS_APPLY(platform, chatId)}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<GroupSeller>(raw);
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
    `${getBaseUrl()}${HOSTING_API.GROUP_MARKETPLACE_SELLER_REVIEW(platform, chatId, String(sellerId))}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<GroupSeller>(raw);
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
    `${getBaseUrl()}${HOSTING_API.GROUP_MARKETPLACE_CHECK_ADMIN(platform, chatId)}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ platformUserID }),
    }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<{ isAdmin: boolean }>(raw);
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
