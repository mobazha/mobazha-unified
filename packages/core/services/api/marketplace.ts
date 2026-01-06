/**
 * Marketplace API Service
 * 社区集市 API 服务
 */

import { apiClient } from './client';
import type {
  Marketplace,
  MarketplaceListParams,
  MarketplaceListResponse,
  MarketplaceMember,
  MarketplaceMemberListParams,
  MarketplaceProduct,
  MarketplaceProductListParams,
  MarketplaceApplication,
  MarketplaceAnnouncement,
  MarketplaceActivityLog,
  CreateMarketplaceRequest,
  UpdateMarketplaceRequest,
  SellerApplicationRequest,
  ListProductRequest,
  ProductApprovalStatus,
  SellerStatus,
  MarketplaceRole,
} from '../../types/marketplace';

// ============ 集市基础 API ============

/**
 * 获取集市列表
 */
export async function getMarketplaces(
  params: MarketplaceListParams = {}
): Promise<MarketplaceListResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params.status) queryParams.set('status', params.status);
  if (params.category) queryParams.set('category', params.category);
  if (params.search) queryParams.set('search', params.search);
  if (params.featured !== undefined) queryParams.set('featured', params.featured.toString());

  const query = queryParams.toString();
  return apiClient.get<MarketplaceListResponse>(`/api/v1/marketplaces${query ? `?${query}` : ''}`);
}

/**
 * 获取单个集市详情
 */
export async function getMarketplace(marketplaceId: string): Promise<Marketplace> {
  return apiClient.get<Marketplace>(`/api/v1/marketplaces/${marketplaceId}`);
}

/**
 * 通过 slug 获取集市
 */
export async function getMarketplaceBySlug(slug: string): Promise<Marketplace> {
  return apiClient.get<Marketplace>(`/api/v1/marketplaces/slug/${slug}`);
}

/**
 * 创建集市
 */
export async function createMarketplace(data: CreateMarketplaceRequest): Promise<Marketplace> {
  return apiClient.post<Marketplace>('/api/v1/marketplaces', data);
}

/**
 * 更新集市
 */
export async function updateMarketplace(
  marketplaceId: string,
  data: UpdateMarketplaceRequest
): Promise<Marketplace> {
  return apiClient.put<Marketplace>(`/api/v1/marketplaces/${marketplaceId}`, data);
}

/**
 * 删除集市
 */
export async function deleteMarketplace(marketplaceId: string): Promise<void> {
  return apiClient.delete(`/api/v1/marketplaces/${marketplaceId}`);
}

/**
 * 获取我创建/管理的集市
 */
export async function getMyMarketplaces(): Promise<Marketplace[]> {
  return apiClient.get<Marketplace[]>('/api/v1/marketplaces/me/owned');
}

/**
 * 获取我加入的集市
 */
export async function getJoinedMarketplaces(): Promise<Marketplace[]> {
  return apiClient.get<Marketplace[]>('/api/v1/marketplaces/me/joined');
}

/**
 * 搜索集市
 */
export async function searchMarketplaces(
  query: string,
  params: Omit<MarketplaceListParams, 'search'> = {}
): Promise<MarketplaceListResponse> {
  return getMarketplaces({ ...params, search: query });
}

/**
 * 获取推荐集市
 */
export async function getFeaturedMarketplaces(limit: number = 6): Promise<Marketplace[]> {
  return apiClient.get<Marketplace[]>(`/api/v1/marketplaces/featured?limit=${limit}`);
}

// ============ 成员管理 API ============

/**
 * 获取集市成员列表
 */
export async function getMarketplaceMembers(
  params: MarketplaceMemberListParams
): Promise<{ members: MarketplaceMember[]; total: number }> {
  const { marketplaceId, ...rest } = params;
  const queryParams = new URLSearchParams();

  if (rest.page) queryParams.set('page', rest.page.toString());
  if (rest.limit) queryParams.set('limit', rest.limit.toString());
  if (rest.role) queryParams.set('role', rest.role);
  if (rest.sellerStatus) queryParams.set('sellerStatus', rest.sellerStatus);
  if (rest.search) queryParams.set('search', rest.search);

  const query = queryParams.toString();
  return apiClient.get<{ members: MarketplaceMember[]; total: number }>(
    `/api/v1/marketplaces/${marketplaceId}/members${query ? `?${query}` : ''}`
  );
}

/**
 * 加入集市
 */
export async function joinMarketplace(marketplaceId: string): Promise<MarketplaceMember> {
  return apiClient.post<MarketplaceMember>(`/api/v1/marketplaces/${marketplaceId}/join`, {});
}

/**
 * 离开集市
 */
export async function leaveMarketplace(marketplaceId: string): Promise<void> {
  return apiClient.post(`/api/v1/marketplaces/${marketplaceId}/leave`, {});
}

/**
 * 更新成员角色
 */
export async function updateMemberRole(
  marketplaceId: string,
  memberId: string,
  role: MarketplaceRole
): Promise<MarketplaceMember> {
  return apiClient.put<MarketplaceMember>(
    `/api/v1/marketplaces/${marketplaceId}/members/${memberId}/role`,
    { role }
  );
}

/**
 * 移除成员
 */
export async function removeMember(marketplaceId: string, memberId: string): Promise<void> {
  return apiClient.delete(`/api/v1/marketplaces/${marketplaceId}/members/${memberId}`);
}

// ============ 卖家申请 API ============

/**
 * 申请成为卖家
 */
export async function applyAsSeller(
  data: SellerApplicationRequest
): Promise<MarketplaceApplication> {
  return apiClient.post<MarketplaceApplication>(
    `/api/v1/marketplaces/${data.marketplaceId}/seller-applications`,
    data
  );
}

/**
 * 获取卖家申请列表（管理员）
 */
export async function getSellerApplications(
  marketplaceId: string,
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<{ applications: MarketplaceApplication[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiClient.get<{ applications: MarketplaceApplication[]; total: number }>(
    `/api/v1/marketplaces/${marketplaceId}/seller-applications${query ? `?${query}` : ''}`
  );
}

/**
 * 审核卖家申请
 */
export async function reviewSellerApplication(
  marketplaceId: string,
  applicationId: string,
  data: { approved: boolean; note?: string }
): Promise<MarketplaceApplication> {
  return apiClient.post<MarketplaceApplication>(
    `/api/v1/marketplaces/${marketplaceId}/seller-applications/${applicationId}/review`,
    data
  );
}

/**
 * 更新卖家状态
 */
export async function updateSellerStatus(
  marketplaceId: string,
  sellerId: string,
  status: SellerStatus
): Promise<MarketplaceMember> {
  return apiClient.put<MarketplaceMember>(
    `/api/v1/marketplaces/${marketplaceId}/sellers/${sellerId}/status`,
    { status }
  );
}

// ============ 商品管理 API ============

/**
 * 获取集市商品列表
 */
export async function getMarketplaceProducts(
  params: MarketplaceProductListParams
): Promise<{ products: MarketplaceProduct[]; total: number }> {
  const { marketplaceId, ...rest } = params;
  const queryParams = new URLSearchParams();

  if (rest.page) queryParams.set('page', rest.page.toString());
  if (rest.limit) queryParams.set('limit', rest.limit.toString());
  if (rest.sortBy) queryParams.set('sortBy', rest.sortBy);
  if (rest.sortOrder) queryParams.set('sortOrder', rest.sortOrder);
  if (rest.category) queryParams.set('category', rest.category);
  if (rest.sellerId) queryParams.set('sellerId', rest.sellerId);
  if (rest.minPrice) queryParams.set('minPrice', rest.minPrice.toString());
  if (rest.maxPrice) queryParams.set('maxPrice', rest.maxPrice.toString());
  if (rest.search) queryParams.set('search', rest.search);
  if (rest.approvalStatus) queryParams.set('approvalStatus', rest.approvalStatus);

  const query = queryParams.toString();
  return apiClient.get<{ products: MarketplaceProduct[]; total: number }>(
    `/api/v1/marketplaces/${marketplaceId}/products${query ? `?${query}` : ''}`
  );
}

/**
 * 上架商品到集市
 */
export async function listProductInMarketplace(
  data: ListProductRequest
): Promise<MarketplaceProduct> {
  return apiClient.post<MarketplaceProduct>(
    `/api/v1/marketplaces/${data.marketplaceId}/products`,
    data
  );
}

/**
 * 下架商品
 */
export async function unlistProductFromMarketplace(
  marketplaceId: string,
  productId: string
): Promise<void> {
  return apiClient.delete(`/api/v1/marketplaces/${marketplaceId}/products/${productId}`);
}

/**
 * 审核商品（管理员）
 */
export async function reviewProduct(
  marketplaceId: string,
  productId: string,
  data: { status: ProductApprovalStatus; reason?: string }
): Promise<MarketplaceProduct> {
  return apiClient.post<MarketplaceProduct>(
    `/api/v1/marketplaces/${marketplaceId}/products/${productId}/review`,
    data
  );
}

/**
 * 设置商品为精选
 */
export async function setProductFeatured(
  marketplaceId: string,
  productId: string,
  featured: boolean,
  featuredUntil?: string
): Promise<MarketplaceProduct> {
  return apiClient.put<MarketplaceProduct>(
    `/api/v1/marketplaces/${marketplaceId}/products/${productId}/featured`,
    { featured, featuredUntil }
  );
}

// ============ 公告 API ============

/**
 * 获取公告列表
 */
export async function getAnnouncements(
  marketplaceId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ announcements: MarketplaceAnnouncement[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiClient.get<{ announcements: MarketplaceAnnouncement[]; total: number }>(
    `/api/v1/marketplaces/${marketplaceId}/announcements${query ? `?${query}` : ''}`
  );
}

/**
 * 创建公告
 */
export async function createAnnouncement(
  marketplaceId: string,
  data: { title: string; content: string; pinned?: boolean }
): Promise<MarketplaceAnnouncement> {
  return apiClient.post<MarketplaceAnnouncement>(
    `/api/v1/marketplaces/${marketplaceId}/announcements`,
    data
  );
}

/**
 * 更新公告
 */
export async function updateAnnouncement(
  marketplaceId: string,
  announcementId: string,
  data: { title?: string; content?: string; pinned?: boolean }
): Promise<MarketplaceAnnouncement> {
  return apiClient.put<MarketplaceAnnouncement>(
    `/api/v1/marketplaces/${marketplaceId}/announcements/${announcementId}`,
    data
  );
}

/**
 * 删除公告
 */
export async function deleteAnnouncement(
  marketplaceId: string,
  announcementId: string
): Promise<void> {
  return apiClient.delete(`/api/v1/marketplaces/${marketplaceId}/announcements/${announcementId}`);
}

// ============ 活动日志 API ============

/**
 * 获取活动日志
 */
export async function getActivityLogs(
  marketplaceId: string,
  params: { page?: number; limit?: number; action?: string } = {}
): Promise<{ logs: MarketplaceActivityLog[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.action) queryParams.set('action', params.action);

  const query = queryParams.toString();
  return apiClient.get<{ logs: MarketplaceActivityLog[]; total: number }>(
    `/api/v1/marketplaces/${marketplaceId}/activity${query ? `?${query}` : ''}`
  );
}
