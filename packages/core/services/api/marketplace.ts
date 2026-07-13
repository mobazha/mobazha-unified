/**
 * Marketplace API Service
 * 社区集市 API 服务
 */

import { apiClient } from './client';
import { hostingDel, hostingGet, hostingPost, hostingPut } from './helpers';
import type {
  CreateMarketplaceCurationItemRequest,
  CreateNativeMarketplaceRequest,
  MarketplaceCurationCandidates,
  MarketplaceCurationCandidatesParams,
  MarketplaceCurationItem,
  InviteMarketplaceSellerRequest,
  MarketplaceAttributionSummary,
  MarketplaceCurationConfig,
  MarketplaceSellerResolveResponse,
  MarketplaceSellerReviewEvent,
  MarketplaceShareLink,
  MarketplaceStoreMembership,
  MyMarketplaceMembershipEntry,
  NativeMarketplace,
  PublicGroupMarketplaceDetail,
  PublicGroupMarketplaceListResponse,
  PublicNativeMarketplaceDetail,
  PublicNativeMarketplaceListParams,
  PublicNativeMarketplaceListResponse,
  ReorderMarketplaceCurationRequest,
  NativeMarketplaceSellerApplication,
  SubmitMarketplaceAttributionEventRequest,
  SubmitMarketplaceAttributionEventResponse,
  UpdateMarketplaceCurationItemRequest,
  VerifyMarketplaceCustomDomainResponse,
  UpdateMarketplaceSellerRequest,
  UpdateNativeMarketplaceRequest,
} from '../../types/marketplace';
import { HOSTING_API } from '../../config/apiPaths';
import { getHostingUrl } from './config';

// ============ 集市基础 API ============

/**
 * 获取原生 MaaS 公开市场目录。
 */
export async function getPublicMarketplaces(
  params: PublicNativeMarketplaceListParams = {}
): Promise<PublicNativeMarketplaceListResponse> {
  const queryParams = new URLSearchParams();
  if (params.q) queryParams.set('q', params.q);
  if (params.vertical) queryParams.set('vertical', params.vertical);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  const query = queryParams.toString();
  return apiClient.get<PublicNativeMarketplaceListResponse>(
    `${HOSTING_API.PUBLIC_MARKETPLACES}${query ? `?${query}` : ''}`
  );
}

/**
 * 通过 slug 或 id 获取原生 MaaS 公开市场详情。
 */
export async function getPublicMarketplaceDetail(
  identifier: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<PublicNativeMarketplaceDetail> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  const query = queryParams.toString();
  return apiClient.get<PublicNativeMarketplaceDetail>(
    `${HOSTING_API.PUBLIC_MARKETPLACE_DETAIL(identifier)}${query ? `?${query}` : ''}`
  );
}

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
 * Get the current store's native MaaS seller application for a public marketplace.
 */
export async function getNativeMarketplaceSellerApplication(
  identifier: string
): Promise<NativeMarketplaceSellerApplication> {
  return hostingGet<NativeMarketplaceSellerApplication>(
    HOSTING_API.PUBLIC_MARKETPLACE_SELLER_APPLICATION_MINE(identifier)
  );
}

/**
 * Submit a native MaaS seller application for the current store.
 */
export async function applyToNativeMarketplace(
  identifier: string,
  productGroupIDs: number[]
): Promise<NativeMarketplaceSellerApplication> {
  return hostingPost<NativeMarketplaceSellerApplication>(
    HOSTING_API.PUBLIC_MARKETPLACE_SELLER_APPLICATIONS(identifier),
    { productGroupIDs }
  );
}

/**
 * Withdraw the current store's pending native MaaS seller application.
 */
export async function withdrawNativeMarketplaceSellerApplication(
  identifier: string
): Promise<NativeMarketplaceSellerApplication> {
  return hostingDel<NativeMarketplaceSellerApplication>(
    HOSTING_API.PUBLIC_MARKETPLACE_SELLER_APPLICATION_MINE(identifier)
  );
}

/**
 * Submit a best-effort attribution event for a public native marketplace.
 */
export async function submitPublicMarketplaceAttributionEvent(
  identifier: string,
  data: SubmitMarketplaceAttributionEventRequest
): Promise<SubmitMarketplaceAttributionEventResponse> {
  return apiClient.request<SubmitMarketplaceAttributionEventResponse>(
    `${getHostingUrl()}${HOSTING_API.PUBLIC_MARKETPLACE_ATTRIBUTION_EVENTS(identifier)}`,
    {
      method: 'POST',
      body: data,
      keepalive: true,
    }
  );
}

/**
 * 获取单个集市详情
 */
export async function getMarketplace(marketplaceId: string): Promise<NativeMarketplace> {
  return hostingGet<NativeMarketplace>(HOSTING_API.MARKETPLACE(marketplaceId));
}

/**
 * 获取运营侧市场草稿预览详情
 */
export async function getMarketplacePreview(
  marketplaceId: string
): Promise<PublicNativeMarketplaceDetail> {
  return hostingGet<PublicNativeMarketplaceDetail>(HOSTING_API.MARKETPLACE_PREVIEW(marketplaceId));
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

/** Validate the current draft and publish an immutable marketplace release. */
export async function publishMarketplace(marketplaceId: string): Promise<NativeMarketplace> {
  return hostingPost<NativeMarketplace>(HOSTING_API.MARKETPLACE_PUBLISH(marketplaceId), undefined);
}

/** Suspend the published marketplace without mutating its draft. */
export async function suspendMarketplace(marketplaceId: string): Promise<NativeMarketplace> {
  return hostingPost<NativeMarketplace>(HOSTING_API.MARKETPLACE_SUSPEND(marketplaceId), undefined);
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

export async function getMarketplaceSellerReviewEvents(
  marketplaceId: string,
  params: { peerID?: string; limit?: number } = {}
): Promise<MarketplaceSellerReviewEvent[]> {
  const queryParams = new URLSearchParams();
  if (params.peerID) queryParams.set('peerID', params.peerID);
  if (typeof params.limit === 'number') queryParams.set('limit', params.limit.toString());
  const query = queryParams.toString();
  return hostingGet<MarketplaceSellerReviewEvent[]>(
    `${HOSTING_API.MARKETPLACE_SELLER_REVIEW_EVENTS(marketplaceId)}${query ? `?${query}` : ''}`
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

export async function resolveMarketplaceSellers(
  marketplaceId: string,
  data: { query: string }
): Promise<MarketplaceSellerResolveResponse> {
  return hostingPost<MarketplaceSellerResolveResponse>(
    HOSTING_API.MARKETPLACE_SELLER_RESOLVE(marketplaceId),
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

export async function declineMarketplaceSellerInvitation(
  marketplaceId: string
): Promise<MarketplaceStoreMembership> {
  return hostingPost<MarketplaceStoreMembership>(
    HOSTING_API.MARKETPLACE_MEMBERSHIP_DECLINE(marketplaceId),
    undefined
  );
}

export async function leaveMarketplaceMembership(
  marketplaceId: string
): Promise<MarketplaceStoreMembership> {
  return hostingPost<MarketplaceStoreMembership>(
    HOSTING_API.MARKETPLACE_MEMBERSHIP_LEAVE(marketplaceId),
    undefined
  );
}

export async function getMarketplaceMembershipReviewEvents(
  marketplaceId: string,
  params: { limit?: number } = {}
): Promise<MarketplaceSellerReviewEvent[]> {
  const queryParams = new URLSearchParams();
  if (typeof params.limit === 'number') queryParams.set('limit', params.limit.toString());
  const query = queryParams.toString();
  return hostingGet<MarketplaceSellerReviewEvent[]>(
    `${HOSTING_API.MARKETPLACE_MEMBERSHIP_REVIEW_EVENTS(marketplaceId)}${query ? `?${query}` : ''}`
  );
}

export async function markMarketplaceReviewEventRead(
  marketplaceId: string,
  eventId: string | number
): Promise<MarketplaceSellerReviewEvent> {
  return hostingPost<MarketplaceSellerReviewEvent>(
    HOSTING_API.MARKETPLACE_MEMBERSHIP_REVIEW_EVENT_READ(marketplaceId, eventId),
    undefined
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

export async function verifyMarketplaceCustomDomain(
  marketplaceId: string
): Promise<VerifyMarketplaceCustomDomainResponse> {
  return hostingPost<VerifyMarketplaceCustomDomainResponse>(
    HOSTING_API.MARKETPLACE_CUSTOM_DOMAIN_VERIFY(marketplaceId),
    undefined
  );
}

export async function getMarketplaceAttributionSummary(
  marketplaceId: string,
  params: { from?: string; to?: string } = {}
): Promise<MarketplaceAttributionSummary> {
  const queryParams = new URLSearchParams();
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);
  const query = queryParams.toString();
  return hostingGet<MarketplaceAttributionSummary>(
    `${HOSTING_API.MARKETPLACE_ATTRIBUTION_SUMMARY(marketplaceId)}${query ? `?${query}` : ''}`
  );
}

export async function getMarketplaceCuration(
  marketplaceId: string
): Promise<MarketplaceCurationItem[]> {
  return hostingGet<MarketplaceCurationItem[]>(HOSTING_API.MARKETPLACE_CURATION(marketplaceId));
}

export async function getMarketplaceCurationCandidates(
  marketplaceId: string,
  params: MarketplaceCurationCandidatesParams = {}
): Promise<MarketplaceCurationCandidates> {
  const queryParams = new URLSearchParams();
  if (params.q) queryParams.set('q', params.q);
  if (typeof params.page === 'number') queryParams.set('page', params.page.toString());
  if (typeof params.pageSize === 'number') queryParams.set('pageSize', params.pageSize.toString());
  const query = queryParams.toString();
  return hostingGet<MarketplaceCurationCandidates>(
    `${HOSTING_API.MARKETPLACE_CURATION_CANDIDATES(marketplaceId)}${query ? `?${query}` : ''}`
  );
}

export async function createMarketplaceCurationItem(
  marketplaceId: string,
  data: CreateMarketplaceCurationItemRequest
): Promise<MarketplaceCurationItem> {
  return hostingPost<MarketplaceCurationItem>(
    HOSTING_API.MARKETPLACE_CURATION(marketplaceId),
    data
  );
}

export async function reorderMarketplaceCuration(
  marketplaceId: string,
  data: ReorderMarketplaceCurationRequest
): Promise<MarketplaceCurationItem[]> {
  return hostingPut<MarketplaceCurationItem[]>(
    HOSTING_API.MARKETPLACE_CURATION_REORDER(marketplaceId),
    data
  );
}

export async function updateMarketplaceCurationItem(
  marketplaceId: string,
  itemID: number,
  data: UpdateMarketplaceCurationItemRequest
): Promise<MarketplaceCurationItem> {
  return hostingPut<MarketplaceCurationItem>(
    HOSTING_API.MARKETPLACE_CURATION_ITEM(marketplaceId, itemID),
    data
  );
}

export async function deleteMarketplaceCurationItem(
  marketplaceId: string,
  itemID: number
): Promise<{ deleted: boolean; id: number }> {
  return hostingDel<{ deleted: boolean; id: number }>(
    HOSTING_API.MARKETPLACE_CURATION_ITEM(marketplaceId, itemID)
  );
}
