/**
 * Marketplace API Service
 * 社区集市 API 服务
 */

import { apiClient } from './client';
import { hostingDel, hostingGet, hostingPost, hostingPut } from './helpers';
import type {
  CreateNativeMarketplaceRequest,
  InviteMarketplaceSellerRequest,
  MarketplaceCurationConfig,
  MarketplaceShareLink,
  MarketplaceStoreMembership,
  MyMarketplaceMembershipEntry,
  NativeMarketplace,
  PublicGroupMarketplaceDetail,
  PublicGroupMarketplaceListResponse,
  PublicMarketplaceSellerApplication,
  UpdateMarketplaceSellerRequest,
  UpdateNativeMarketplaceRequest,
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
    `${HOSTING_API.COMMUNITY_MARKETPLACE_GROUPS}${query ? `?${query}` : ''}`
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
    `${HOSTING_API.COMMUNITY_MARKETPLACE_PUBLIC_DETAIL(identifier)}${query ? `?${query}` : ''}`
  );
}

/**
 * 获取当前租户在公开社区市场的卖家申请状态（通过 slug 或 publicID，不暴露 chatID）。
 */
export async function getPublicMarketplaceSellerApplication(
  identifier: string
): Promise<PublicMarketplaceSellerApplication> {
  return hostingGet<PublicMarketplaceSellerApplication>(
    HOSTING_API.COMMUNITY_MARKETPLACE_PUBLIC_SELLER_APPLICATION(identifier)
  );
}

/**
 * 向公开社区市场提交卖家申请（通过 slug 或 publicID）。
 */
export async function applyAsPublicMarketplaceSeller(
  identifier: string,
  productGroupIDs: number[]
): Promise<unknown> {
  return hostingPost(HOSTING_API.COMMUNITY_MARKETPLACE_PUBLIC_SELLER_APPLY(identifier), {
    productGroupIDs,
  });
}

/**
 * 获取单个集市详情
 */
export async function getMarketplace(marketplaceId: string): Promise<NativeMarketplace> {
  return hostingGet<NativeMarketplace>(HOSTING_API.MARKETPLACE(marketplaceId));
}

/**
 * 创建集市
 */
export async function createMarketplace(
  data: CreateNativeMarketplaceRequest
): Promise<NativeMarketplace> {
  return hostingPost<NativeMarketplace>(HOSTING_API.MARKETPLACES, data);
}

/**
 * 更新集市
 */
export async function updateMarketplace(
  marketplaceId: string,
  data: UpdateNativeMarketplaceRequest
): Promise<NativeMarketplace> {
  return hostingPut<NativeMarketplace>(HOSTING_API.MARKETPLACE(marketplaceId), data);
}

/**
 * 删除集市
 */
export async function deleteMarketplace(
  marketplaceId: string
): Promise<{ archived: boolean; id: string }> {
  return hostingDel<{ archived: boolean; id: string }>(HOSTING_API.MARKETPLACE(marketplaceId));
}

/**
 * 获取我创建/管理的集市
 */
export async function getMyMarketplaces(): Promise<NativeMarketplace[]> {
  return hostingGet<NativeMarketplace[]>(HOSTING_API.MARKETPLACES_MINE);
}

export async function getMyMarketplaceMemberships(): Promise<MyMarketplaceMembershipEntry[]> {
  return hostingGet<MyMarketplaceMembershipEntry[]>(HOSTING_API.MARKETPLACE_MEMBERSHIPS_MINE);
}

export async function getMarketplaceSellers(
  marketplaceId: string,
  params: { status?: string } = {}
): Promise<MarketplaceStoreMembership[]> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  const query = queryParams.toString();
  return hostingGet<MarketplaceStoreMembership[]>(
    `${HOSTING_API.MARKETPLACE_SELLERS(marketplaceId)}${query ? `?${query}` : ''}`
  );
}

export async function inviteMarketplaceSeller(
  marketplaceId: string,
  data: InviteMarketplaceSellerRequest
): Promise<MarketplaceStoreMembership> {
  return hostingPost<MarketplaceStoreMembership>(
    HOSTING_API.MARKETPLACE_SELLER_INVITE(marketplaceId),
    data
  );
}

export async function acceptMarketplaceSellerInvitation(
  marketplaceId: string,
  peerID: string
): Promise<MarketplaceStoreMembership> {
  return hostingPost<MarketplaceStoreMembership>(
    HOSTING_API.MARKETPLACE_SELLER_ACCEPT(marketplaceId, peerID),
    undefined
  );
}

export async function updateMarketplaceSeller(
  marketplaceId: string,
  peerID: string,
  data: UpdateMarketplaceSellerRequest
): Promise<MarketplaceStoreMembership> {
  return hostingPut<MarketplaceStoreMembership>(
    HOSTING_API.MARKETPLACE_SELLER(marketplaceId, peerID),
    data
  );
}

export async function removeMarketplaceSeller(
  marketplaceId: string,
  peerID: string
): Promise<{ removed: boolean; peerID: string }> {
  return hostingDel<{ removed: boolean; peerID: string }>(
    HOSTING_API.MARKETPLACE_SELLER(marketplaceId, peerID)
  );
}

export async function getMarketplaceConfig(
  marketplaceId: string,
  params: { domain?: string; subdomain?: string } = {}
): Promise<MarketplaceCurationConfig> {
  const queryParams = new URLSearchParams();
  if (params.domain) queryParams.set('domain', params.domain);
  if (params.subdomain) queryParams.set('subdomain', params.subdomain);
  const query = queryParams.toString();
  return hostingGet<MarketplaceCurationConfig>(
    `${HOSTING_API.MARKETPLACE_CONFIG(marketplaceId)}${query ? `?${query}` : ''}`
  );
}

export async function getCurrentMarketplaceConfig(
  params: { domain?: string; subdomain?: string } = {}
): Promise<MarketplaceCurationConfig> {
  return getMarketplaceConfig('current', params);
}

export async function getMarketplaceLink(marketplaceId: string): Promise<MarketplaceShareLink> {
  return hostingGet<MarketplaceShareLink>(HOSTING_API.MARKETPLACE_LINK(marketplaceId));
}
