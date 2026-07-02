/**
 * 商品 API 服务
 */

import type { Product, ProductListItem, RatingIndex, RatingDetail } from '../../types';
import { getImageUrl } from './config';
import type { Image } from '../../types';
import { NODE_API, SEARCH_API } from '../../config/apiPaths';
import { parsePriceFields } from '../../utils/transforms/priceTransform';
import { isStoreUnavailableError } from './client';
import {
  authPost,
  authPut,
  authDel,
  publicGet,
  publicSafeGet,
  publicPost,
  searchSafeGet,
  searchRawGet,
  searchPost,
} from './helpers';
import { isStoreKnownOffline, markStoreOffline, markStoreOnline } from './storeStatusCache';

// API 返回的搜索结果格式
interface SearchResultItem {
  data: ProductListItem;
  relationships?: {
    /** 商品的仲裁员列表 */
    moderators?: string[] | null;
    vendor?: {
      data?: {
        peerID?: string;
        name?: string;
        handle?: string;
        avatarHashes?: {
          tiny?: string;
          small?: string;
          medium?: string;
          large?: string;
          original?: string;
        };
      };
    };
  };
}

interface SearchApiResponse {
  results?: {
    results?: SearchResultItem[];
    total?: number;
    morePages?: boolean;
  };
  total?: number;
  morePages?: boolean;
}

// 搜索商品的参数
export interface SearchListingsParams {
  query: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  type?: string;
  productType?: string;
  rating?: number;
  shipping?: string;
  nsfw?: boolean;
}

// 搜索商品的响应
export interface SearchListingsResponse {
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Profile search types are defined inline in searchProfiles()

// 搜索用户的响应
export interface SearchProfilesResponse {
  users: SearchedUser[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 搜索返回的用户类型
export interface SearchedUser {
  peerID: string;
  name: string;
  handle?: string;
  avatar?: string;
  headerImage?: string;
  shortDescription?: string;
  location?: string;
  listingCount: number;
  rating: number;
  reviewCount: number;
}

/**
 * 将 Image 对象中的 CID hash 转换为完整 URL。
 * @param storeHint - 跨店铺路由：传入 vendor peerID，让 gateway 能按需从独立站拉取
 */
function transformImageUrls(
  image: Image | undefined | null,
  storeHint?: string
): Image | undefined {
  if (!image) return undefined;
  return {
    tiny: getImageUrl(image.tiny, storeHint) ?? '',
    small: getImageUrl(image.small, storeHint) ?? '',
    medium: getImageUrl(image.medium, storeHint) ?? '',
    large: getImageUrl(image.large, storeHint) ?? '',
    original: getImageUrl(image.original, storeHint) ?? '',
    filename: image.filename,
  };
}

/**
 * 转换搜索 API 返回的数据为 ProductListItem 数组
 */
function parseSearchResults(response: SearchApiResponse | SearchResultItem[]): ProductListItem[] {
  const items: SearchResultItem[] = Array.isArray(response)
    ? response
    : (response?.results?.results ?? []);
  return items.map(item => {
    const vendor = item.relationships?.vendor?.data;
    const vendorPeerID = vendor?.peerID ?? item.data.vendorPeerID;
    const thumbnail = transformImageUrls(item.data.thumbnail, vendorPeerID);
    const vendorAvatarHashes = vendor?.avatarHashes
      ? transformImageUrls(vendor.avatarHashes as Image, vendorPeerID)
      : undefined;

    // 从 relationships 中获取 moderators
    const moderators = item.relationships?.moderators ?? undefined;

    return {
      ...item.data,
      vendorPeerID,
      vendorName: vendor?.name,
      vendorAvatarHashes,
      // 转换缩略图 IPFS hash 为完整 URL，保持原始值作为后备
      thumbnail: thumbnail ?? item.data.thumbnail,
      // 添加 moderators 字段
      moderators: moderators || undefined,
    };
  });
}

/**
 * 获取热门商品列表
 */
export async function fetchTrendingListings(): Promise<ProductListItem[]> {
  try {
    const response = await searchSafeGet<SearchApiResponse>(SEARCH_API.LISTINGS_FRESH(10), {});
    return parseSearchResults(response);
  } catch (error) {
    console.error('Failed to fetch trending listings:', error);
    return [];
  }
}

/**
 * 获取精选商品列表
 */
export async function fetchFeaturedListings(): Promise<ProductListItem[]> {
  try {
    const response = await searchSafeGet<SearchApiResponse>(SEARCH_API.LISTINGS_HOT(24, 10), {});
    return parseSearchResults(response);
  } catch (error) {
    console.error('Failed to fetch featured listings:', error);
    return [];
  }
}

/**
 * Search API profile-listings 返回的原始项格式
 */
interface ProfileListingItem {
  slug: string;
  title: string;
  image?: string;
  thumbnail?: Image;
  price?: string | number | Record<string, unknown>;
  peerID?: string;
  vendorPeerID?: string;
  cid?: string;
  hash?: string;
  contractType?: string;
  description?: string;
  available?: boolean;
  nsfw?: { status: boolean };
  [key: string]: unknown;
}

function hasImageHash(thumb: Image | undefined | null): thumb is Image {
  if (!thumb) return false;
  return !!(thumb.tiny || thumb.small || thumb.medium || thumb.large || thumb.original);
}

function imageFromCid(cid: string | undefined): Image | undefined {
  if (!cid) return undefined;
  const trimmed = cid.trim();
  if (!trimmed) return undefined;
  return { tiny: trimmed, small: trimmed, medium: trimmed, large: trimmed, original: trimmed };
}

/**
 * 获取店铺商品列表
 */
export async function fetchStoreListings(
  storePeerID: string,
  pageSize = 9
): Promise<ProductListItem[]> {
  const raw = await searchSafeGet<ProfileListingItem[]>(
    `${SEARCH_API.PROFILE_LISTINGS(storePeerID)}?pageSize=${pageSize}`,
    []
  );
  return raw.map(item => {
    const priceSource =
      typeof item.price === 'object' && item.price !== null
        ? (item.price as unknown as ProductListItem['price'])
        : undefined;
    const { amount, currencyCode, divisibility } = parsePriceFields(priceSource);
    return {
      slug: item.slug,
      title: item.title,
      thumbnail:
        transformImageUrls(
          hasImageHash(item.thumbnail) ? item.thumbnail : imageFromCid(item.image),
          storePeerID
        ) ?? ({} as Image),
      price: currencyCode
        ? { amount, currency: { code: currencyCode, divisibility: divisibility ?? 2 } }
        : { amount, currency: { code: '', divisibility: divisibility ?? 2 } },
      vendorPeerID: item.vendorPeerID ?? item.peerID ?? storePeerID,
      cid: item.cid ?? item.hash,
      contractType: item.contractType as ProductListItem['contractType'],
      nsfw: item.nsfw?.status,
    };
  });
}

/**
 * 获取商品索引（自己的商品）
 * 超时时间增加到 60 秒，因为网关 API 有时响应较慢
 */
export async function getListingIndex(): Promise<ProductListItem[]> {
  const data = await publicSafeGet<ProductListItem[] | { success: false }>(
    NODE_API.LISTINGS_INDEX,
    []
  );

  if (!data || (data as { success: false }).success === false) {
    return [];
  }
  return data as ProductListItem[];
}

/**
 * 获取其他店铺的商品索引
 * 超时时间增加到 60 秒，因为网关 API 有时响应较慢
 */
export async function getStoreListingIndex(peerID: string): Promise<ProductListItem[]> {
  const data = await publicSafeGet<ProductListItem[] | { success: false }>(
    NODE_API.LISTINGS_INDEX_PEER(peerID),
    []
  );

  if (!data || (data as { success: false }).success === false) {
    return [];
  }
  return data as ProductListItem[];
}

export interface StoreListingsResult {
  listings: ProductListItem[];
  isOffline: boolean;
}

/**
 * Fetch store listings with automatic fallback.
 *
 * Uses the shared storeStatusCache: if the store is already known offline,
 * skips the Node API attempt entirely and goes straight to Search.
 * On successful Node API response, marks the store as online.
 */
export async function getStoreListingsWithFallback(
  peerID: string,
  pageSize = 12
): Promise<StoreListingsResult> {
  if (isStoreKnownOffline(peerID)) {
    const fallback = await fetchStoreListings(peerID, pageSize);
    return { listings: fallback, isOffline: true };
  }

  try {
    const data = await publicGet<ProductListItem[] | { success: false }>(
      NODE_API.LISTINGS_INDEX_PEER(peerID)
    );
    if (!data || (data as { success: false }).success === false) {
      return { listings: [], isOffline: false };
    }
    markStoreOnline(peerID);
    return { listings: data as ProductListItem[], isOffline: false };
  } catch (err) {
    if (isStoreUnavailableError(err)) {
      markStoreOffline(peerID);
      const fallback = await fetchStoreListings(peerID, pageSize);
      return { listings: fallback, isOffline: true };
    }
    const fallback = await fetchStoreListings(peerID, pageSize);
    return { listings: fallback, isOffline: fallback.length > 0 };
  }
}

/**
 * 获取商品详情
 */
export async function getListing(slug: string, peerID?: string): Promise<Product | null> {
  const timestamp = Date.now();
  const path = !peerID
    ? `${NODE_API.LISTING(slug)}?`
    : `${NODE_API.LISTING_PEER(peerID, slug)}?usecache=true&${timestamp}`;

  try {
    const data = await publicGet<{ listing?: Product } & Product>(path);
    return data.listing ?? data;
  } catch {
    return null;
  }
}

export interface PublicListingResult {
  listing: Product | null;
  isOffline: boolean;
}

/**
 * 获取公开商品详情（无需认证）
 *
 * Uses the shared storeStatusCache: if the store is known offline and we
 * have a peerID, returns immediately with isOffline=true so the UI can
 * display an appropriate message instead of silently showing nothing.
 */
export async function getPublicListing(
  slug: string,
  peerID?: string
): Promise<PublicListingResult> {
  if (peerID && isStoreKnownOffline(peerID)) {
    return { listing: null, isOffline: true };
  }

  const path = !peerID
    ? NODE_API.LISTING(slug)
    : `${NODE_API.LISTING_PEER(peerID, slug)}?usecache=true`;

  try {
    const data = await publicGet<{ listing?: Product } & Product>(path);
    const listing = data.listing ?? data;
    if (peerID) markStoreOnline(peerID);

    if (listing?.item?.images?.length) {
      return {
        listing: {
          ...listing,
          thumbnail: listing.item.images[0],
          title: listing.item.title,
          slug: listing.slug ?? slug,
          vendorPeerID: listing.vendorID?.peerID ?? peerID,
        } as Product,
        isOffline: false,
      };
    }
    return { listing, isOffline: false };
  } catch (err) {
    if (peerID && isStoreUnavailableError(err)) {
      markStoreOffline(peerID);
      return { listing: null, isOffline: true };
    }
    return { listing: null, isOffline: false };
  }
}

/**
 * 创建商品
 */
export async function createListing(
  productDetails: Partial<Product>
): Promise<{ slug: string } | { error: string }> {
  return authPost(NODE_API.LISTINGS, productDetails);
}

/**
 * 更新商品
 */
export async function updateListing(
  productDetails: Partial<Product>
): Promise<{ success: boolean } | { error: string }> {
  return authPut(NODE_API.LISTINGS, productDetails);
}

/**
 * 删除商品
 */
export async function deleteListing(slug: string): Promise<{ success: boolean }> {
  return authDel(NODE_API.LISTING(slug));
}

/**
 * 获取商品评价索引
 * 注意：移除了时间戳参数以支持请求去重缓存
 * 返回评价统计信息和评价 ID 列表
 */
export async function getRatingIndex(peerID?: string, slug?: string): Promise<RatingIndex> {
  let path: string;

  if (peerID && slug) {
    path = `${NODE_API.RATINGS_INDEX_PEER_SLUG(peerID, slug)}?usecache=true`;
  } else if (peerID) {
    path = `${NODE_API.RATINGS_INDEX_PEER(peerID)}?usecache=true`;
  } else if (slug) {
    path = NODE_API.RATINGS_INDEX_SLUG(slug);
  } else {
    path = NODE_API.RATINGS_INDEX;
  }

  return publicSafeGet<RatingIndex>(path, { count: 0, average: 0, ratings: [] });
}

/**
 * 获取详细评价数据
 * 通过评价 ID 列表获取完整的评价信息
 * @param ratingIDs - 评价 CID 字符串数组
 */
export async function fetchRatings(ratingIDs: string[]): Promise<RatingDetail[]> {
  if (!ratingIDs || ratingIDs.length === 0) {
    return [];
  }

  try {
    const response = await publicPost<Array<{ id: string; rating: RatingDetail }>>(
      `${NODE_API.RATINGS_BATCH}?async=false`,
      ratingIDs
    );

    // API 返回格式: [{ id: "xxx", rating: {...} }, ...]
    if (Array.isArray(response)) {
      return response.map(item => ({
        ...item.rating,
        ratingID: item.id || item.rating?.ratingID,
      }));
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch ratings:', error);
    return [];
  }
}

/**
 * 获取最新商品列表（SaaS 首页 Network Activity）
 */
export async function fetchLatestListings(limit = 12): Promise<ProductListItem[]> {
  try {
    const response = await searchSafeGet<SearchApiResponse>(SEARCH_API.LISTINGS_FRESH(limit), {});
    return parseSearchResults(response);
  } catch (error) {
    console.error('Failed to fetch latest listings:', error);
    return [];
  }
}

/**
 * 获取精选店铺（SaaS 首页 Featured Stores）
 * 客户端排序：综合活跃度 + 品牌化完成度
 */
export async function fetchFeaturedStores(limit = 6): Promise<SearchedUser[]> {
  try {
    const result = await searchProfiles({ query: '*', pageSize: 20, vendor: true });
    return result.users
      .map(user => ({ ...user, _score: computeStoreScore(user) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score: _, ...user }) => user);
  } catch (error) {
    console.error('Failed to fetch featured stores:', error);
    return [];
  }
}

/**
 * 获取平台统计（SaaS 首页 Platform Stats）
 *
 * 商品数用 browse=all / catalogTotal：默认 discover 模式只返回精选子集（meta.total），
 * 批量导入后 catalogTotal 才是全网上架总量。
 */
export async function fetchPlatformStats(): Promise<{
  storeCount: number;
  listingCount: number;
}> {
  try {
    const [profilesResult, listingsResult] = await Promise.all([
      searchProfiles({ query: '*', pageSize: 1, vendor: true }),
      searchListings({ query: '*', pageSize: 1, browse: 'all' }),
    ]);
    return {
      storeCount: profilesResult.total,
      listingCount: listingsResult.catalogTotal ?? listingsResult.total,
    };
  } catch (error) {
    console.error('Failed to fetch platform stats:', error);
    return { storeCount: 0, listingCount: 0 };
  }
}

function computeStoreScore(user: SearchedUser): number {
  const activityScore = user.listingCount * 0.3 + user.reviewCount * 0.2;
  const qualityScore = user.rating * 0.2;
  const brandScore =
    (user.avatar ? 1 : 0) * 0.1 +
    (user.shortDescription ? 1 : 0) * 0.1 +
    (user.listingCount > 0 ? 1 : 0) * 0.1;
  return activityScore + qualityScore + brandScore;
}

/**
 * 举报商品
 */
export async function reportListing(
  peerID: string,
  slug: string,
  reason: string
): Promise<{ success: boolean }> {
  return searchPost(SEARCH_API.REPORTS, { peerID, slug, reason, report_type: 'listing' });
}

/**
 * 搜索商品
 * 参考移动端: mobazha-mobile/api/search.js
 */
export async function searchListings(
  params: SearchListingsParams
): Promise<SearchListingsResponse> {
  const {
    query,
    page = 0,
    pageSize = 20,
    sortBy = 'relevance',
    type,
    productType,
    rating,
    shipping,
    nsfw = false,
  } = params;

  // 构建查询参数
  const searchQuery = query.trim() === '' ? '*' : query;
  const queryParams = new URLSearchParams({
    q: searchQuery,
    p: String(page),
    pageSize: String(pageSize),
    sortBy,
  });

  // 添加可选过滤参数
  if (productType && productType !== 'all') {
    queryParams.append('productType', productType);
  }
  if (type && type !== 'all') {
    queryParams.append('type', type);
  }
  if (rating && rating > 0) {
    queryParams.append('rating', String(rating));
  }
  if (shipping && shipping !== 'any') {
    queryParams.append('shipping', shipping);
  }
  if (nsfw) {
    queryParams.append('nsfw', 'true');
  }

  try {
    const raw = await searchRawGet<{
      data?: SearchResultItem[] | SearchApiResponse;
      meta?: { total?: number };
      results?: { total?: number; morePages?: boolean; results?: SearchResultItem[] };
      total?: number;
      morePages?: boolean;
    }>(`${SEARCH_API.SEARCH_LISTINGS}?${queryParams.toString()}`, {});

    const innerData = raw?.data ?? raw;
    const products = parseSearchResults(innerData);

    const total =
      raw?.meta?.total ??
      (innerData as SearchApiResponse)?.results?.total ??
      raw?.total ??
      products.length;
    const hasMore = (innerData as SearchApiResponse)?.results?.morePages ?? raw?.morePages ?? false;

    return {
      products,
      total,
      page,
      pageSize,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to search listings:', error);
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    };
  }
}

/**
 * 搜索用户/店铺
 * 参考移动端: mobazha-mobile/api/search.js - searchProfile
 */
export async function searchProfiles(params: {
  query: string;
  page?: number;
  pageSize?: number;
  vendor?: boolean;
}): Promise<SearchProfilesResponse> {
  const { query, page = 0, pageSize = 20, vendor } = params;

  const searchQuery = query.trim() === '' ? '*' : query;
  const queryParams = new URLSearchParams({
    q: searchQuery,
    p: String(page),
    pageSize: String(pageSize),
  });
  if (vendor !== undefined) {
    queryParams.append('vendor', String(vendor));
  }

  try {
    interface RawProfileResponse {
      data?: Array<{
        peerId?: string;
        name?: string;
        handle?: string;
        avatar?: string;
        header?: string;
        shortDescription?: string;
        location?: string;
        ratingAvg?: number;
        ratingCount?: number;
        listingCount?: number;
      }>;
      meta?: { total?: number };
    }

    const raw = await searchRawGet<RawProfileResponse>(
      `${SEARCH_API.SEARCH_PROFILES}?${queryParams.toString()}`,
      {}
    );

    const items = raw?.data ?? [];
    const users: SearchedUser[] = items.map(item => ({
      peerID: item.peerId ?? '',
      name: item.name || item.handle || 'Unknown',
      handle: item.handle,
      avatar: item.avatar?.trim() ? getImageUrl(item.avatar.trim(), item.peerId) : undefined,
      headerImage: item.header?.trim() ? getImageUrl(item.header.trim(), item.peerId) : undefined,
      shortDescription: item.shortDescription,
      location: item.location,
      listingCount: item.listingCount ?? 0,
      rating: item.ratingAvg ?? 0,
      reviewCount: item.ratingCount ?? 0,
    }));

    const total = raw?.meta?.total ?? users.length;
    const hasMore = (page + 1) * pageSize < total;

    return {
      users,
      total,
      page,
      pageSize,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to search profiles:', error);
    return {
      users: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    };
  }
}
