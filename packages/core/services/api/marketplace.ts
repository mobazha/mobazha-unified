/**
 * Marketplace API Service
 * 社区集市 API 服务
 */

import { apiClient } from './client';
import { hostingGet, hostingPost } from './helpers';
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
  PublicGroupMarketplaceDetail,
  PublicGroupMarketplaceListResponse,
  PublicMarketplaceSellerApplication,
  CreateMarketplaceRequest,
  UpdateMarketplaceRequest,
  SellerApplicationRequest,
  ListProductRequest,
  ProductApprovalStatus,
  SellerStatus,
  MarketplaceRole,
} from '../../types/marketplace';
import { HOSTING_API } from '../../config/apiPaths';

// ============ 集市基础 API ============

/**
 * 获取真实群组社区市场公开目录。
 */
export async function getPublicGroupMarketplaces(
  params: {
    platform?: string;
  } = {}
): Promise<PublicGroupMarketplaceListResponse> {
  const queryParams = new URLSearchParams();
  if (params.platform) queryParams.set('platform', params.platform);
  const query = queryParams.toString();
  return apiClient.get<PublicGroupMarketplaceListResponse>(
    `${HOSTING_API.GROUP_MARKETPLACE_GROUPS}${query ? `?${query}` : ''}`
  );
}

/**
 * 通过 slug 或 publicID 获取真实群组社区市场公开详情。
 */
export async function getPublicGroupMarketplaceDetail(
  identifier: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<PublicGroupMarketplaceDetail> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  const query = queryParams.toString();
  return apiClient.get<PublicGroupMarketplaceDetail>(
    `${HOSTING_API.GROUP_MARKETPLACE_PUBLIC_DETAIL(identifier)}${query ? `?${query}` : ''}`
  );
}

/**
 * 获取当前租户在公开社区市场的卖家申请状态（通过 slug 或 publicID，不暴露 chatID）。
 */
export async function getPublicMarketplaceSellerApplication(
  identifier: string
): Promise<PublicMarketplaceSellerApplication> {
  return hostingGet<PublicMarketplaceSellerApplication>(
    HOSTING_API.GROUP_MARKETPLACE_PUBLIC_SELLER_APPLICATION(identifier)
  );
}

/**
 * 向公开社区市场提交卖家申请（通过 slug 或 publicID）。
 */
export async function applyAsPublicMarketplaceSeller(
  identifier: string,
  productGroupIDs: number[]
): Promise<unknown> {
  return hostingPost(HOSTING_API.GROUP_MARKETPLACE_PUBLIC_SELLER_APPLY(identifier), {
    productGroupIDs,
  });
}

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
  return apiClient.get<MarketplaceListResponse>(
    `${HOSTING_API.MARKETPLACES}${query ? `?${query}` : ''}`
  );
}

/**
 * 获取单个集市详情
 */
export async function getMarketplace(marketplaceId: string): Promise<Marketplace> {
  return apiClient.get<Marketplace>(HOSTING_API.MARKETPLACE(marketplaceId));
}

/**
 * 通过 slug 获取集市
 */
export async function getMarketplaceBySlug(slug: string): Promise<Marketplace> {
  return apiClient.get<Marketplace>(HOSTING_API.MARKETPLACE_BY_SLUG(slug));
}

/**
 * 创建集市
 */
export async function createMarketplace(data: CreateMarketplaceRequest): Promise<Marketplace> {
  return apiClient.post<Marketplace>(HOSTING_API.MARKETPLACES, data);
}

/**
 * 更新集市
 */
export async function updateMarketplace(
  marketplaceId: string,
  data: UpdateMarketplaceRequest
): Promise<Marketplace> {
  return apiClient.put<Marketplace>(HOSTING_API.MARKETPLACE(marketplaceId), data);
}

/**
 * 删除集市
 */
export async function deleteMarketplace(marketplaceId: string): Promise<void> {
  return apiClient.delete(HOSTING_API.MARKETPLACE(marketplaceId));
}

/**
 * 获取我创建/管理的集市
 */
export async function getMyMarketplaces(): Promise<Marketplace[]> {
  return apiClient.get<Marketplace[]>(HOSTING_API.MARKETPLACES_ME_OWNED);
}

/**
 * 获取我加入的集市
 */
export async function getJoinedMarketplaces(): Promise<Marketplace[]> {
  return apiClient.get<Marketplace[]>(HOSTING_API.MARKETPLACES_ME_JOINED);
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
  return apiClient.get<Marketplace[]>(`${HOSTING_API.MARKETPLACES_FEATURED}?limit=${limit}`);
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
    `${HOSTING_API.MARKETPLACE_MEMBERS(marketplaceId)}${query ? `?${query}` : ''}`
  );
}

/**
 * 加入集市
 */
export async function joinMarketplace(marketplaceId: string): Promise<MarketplaceMember> {
  return apiClient.post<MarketplaceMember>(HOSTING_API.MARKETPLACE_JOIN(marketplaceId), {});
}

/**
 * 离开集市
 */
export async function leaveMarketplace(marketplaceId: string): Promise<void> {
  return apiClient.post(HOSTING_API.MARKETPLACE_LEAVE(marketplaceId), {});
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
    HOSTING_API.MARKETPLACE_MEMBER_ROLE(marketplaceId, memberId),
    { role }
  );
}

/**
 * 移除成员
 */
export async function removeMember(marketplaceId: string, memberId: string): Promise<void> {
  return apiClient.delete(HOSTING_API.MARKETPLACE_MEMBER(marketplaceId, memberId));
}

// ============ 卖家申请 API ============

/**
 * 申请成为卖家
 */
export async function applyAsSeller(
  data: SellerApplicationRequest
): Promise<MarketplaceApplication> {
  return apiClient.post<MarketplaceApplication>(
    HOSTING_API.MARKETPLACE_SELLER_APPLICATIONS(data.marketplaceId),
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
    `${HOSTING_API.MARKETPLACE_SELLER_APPLICATIONS(marketplaceId)}${query ? `?${query}` : ''}`
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
    HOSTING_API.MARKETPLACE_SELLER_APPLICATION_REVIEW(marketplaceId, applicationId),
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
    HOSTING_API.MARKETPLACE_SELLER_STATUS(marketplaceId, sellerId),
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
    `${HOSTING_API.MARKETPLACE_PRODUCTS(marketplaceId)}${query ? `?${query}` : ''}`
  );
}

/**
 * 上架商品到集市
 */
export async function listProductInMarketplace(
  data: ListProductRequest
): Promise<MarketplaceProduct> {
  return apiClient.post<MarketplaceProduct>(
    HOSTING_API.MARKETPLACE_PRODUCTS(data.marketplaceId),
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
  return apiClient.delete(HOSTING_API.MARKETPLACE_PRODUCT(marketplaceId, productId));
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
    HOSTING_API.MARKETPLACE_PRODUCT_REVIEW(marketplaceId, productId),
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
    HOSTING_API.MARKETPLACE_PRODUCT_FEATURED(marketplaceId, productId),
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
    `${HOSTING_API.MARKETPLACE_ANNOUNCEMENTS(marketplaceId)}${query ? `?${query}` : ''}`
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
    HOSTING_API.MARKETPLACE_ANNOUNCEMENTS(marketplaceId),
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
    HOSTING_API.MARKETPLACE_ANNOUNCEMENT(marketplaceId, announcementId),
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
  return apiClient.delete(HOSTING_API.MARKETPLACE_ANNOUNCEMENT(marketplaceId, announcementId));
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
    `${HOSTING_API.MARKETPLACE_ACTIVITY(marketplaceId)}${query ? `?${query}` : ''}`
  );
}
