/**
 * 商品 API 服务
 */

import type { Product, ProductListItem, RatingIndex, RatingDetail } from '../../types';
import { getImageUrl } from './config';
import type { Image } from '../../types';
import { NODE_API, SEARCH_API } from '../../config/apiPaths';
import {
  authPost,
  authPut,
  authDel,
  publicGet,
  publicSafeGet,
  publicPost,
  searchSafeGet,
  searchPost,
} from './helpers';

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
  category?: string;
  type?: string;
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

// 用户/店铺搜索结果项
interface ProfileSearchResultItem {
  data: {
    peerID: string;
    name: string;
    handle?: string;
    avatarHashes?: {
      tiny?: string;
      small?: string;
      medium?: string;
      large?: string;
      original?: string;
    };
    shortDescription?: string;
    location?: string;
    stats?: {
      listingCount?: number;
      followerCount?: number;
      followingCount?: number;
      ratingCount?: number;
      averageRating?: number;
    };
  };
}

// 用户搜索 API 响应
interface ProfileSearchApiResponse {
  results?: {
    results?: ProfileSearchResultItem[];
    total?: number;
    morePages?: boolean;
  };
  total?: number;
  morePages?: boolean;
}

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
  shortDescription?: string;
  location?: string;
  listingCount: number;
  rating: number;
  reviewCount: number;
}

/**
 * 将 Image 对象中的 IPFS hash 转换为完整 URL
 */
function transformImageUrls(image: Image | undefined | null): Image | undefined {
  if (!image) return undefined;
  return {
    tiny: getImageUrl(image.tiny) ?? '',
    small: getImageUrl(image.small) ?? '',
    medium: getImageUrl(image.medium) ?? '',
    large: getImageUrl(image.large) ?? '',
    original: getImageUrl(image.original) ?? '',
    filename: image.filename,
  };
}

/**
 * 转换搜索 API 返回的数据为 ProductListItem 数组
 */
function parseSearchResults(response: SearchApiResponse): ProductListItem[] {
  const items = response?.results?.results ?? [];
  return items.map(item => {
    const thumbnail = transformImageUrls(item.data.thumbnail);
    const vendor = item.relationships?.vendor?.data;
    const vendorAvatarHashes = vendor?.avatarHashes
      ? transformImageUrls(vendor.avatarHashes as Image)
      : undefined;

    // 从 relationships 中获取 moderators
    const moderators = item.relationships?.moderators ?? undefined;

    return {
      ...item.data,
      vendorPeerID: vendor?.peerID ?? item.data.vendorPeerID,
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
 * 获取店铺商品列表
 */
export async function fetchStoreListings(
  storePeerID: string,
  pageSize = 9
): Promise<ProductListItem[]> {
  return searchSafeGet<ProductListItem[]>(
    `${SEARCH_API.PROFILE_LISTINGS}?peerId=${storePeerID}&pageSize=${pageSize}`,
    []
  );
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

/**
 * 获取商品详情
 */
export async function getListing(slug: string, peerID?: string): Promise<Product | null> {
  const timestamp = Date.now();
  const path = !peerID
    ? `${NODE_API.LISTING(slug)}?`
    : `${NODE_API.LISTING_PEER(peerID, slug)}?usecache=true&${timestamp}`;

  try {
    return await publicGet<Product>(path);
  } catch {
    return null;
  }
}

/**
 * 获取公开商品详情（无需认证）
 * 注意：移除了时间戳参数以支持请求去重缓存
 */
export async function getPublicListing(slug: string, peerID?: string): Promise<Product | null> {
  const path = !peerID
    ? NODE_API.LISTING(slug)
    : `${NODE_API.LISTING_PEER(peerID, slug)}?usecache=true`;

  try {
    const data = await publicGet<{ listing?: Product } & Product>(path);
    const listing = data.listing ?? data;

    // 转换数据格式以适配前端
    if (listing?.item?.images?.length) {
      return {
        ...listing,
        thumbnail: listing.item.images[0],
        title: listing.item.title,
        slug: listing.slug ?? slug,
        vendorPeerID: listing.vendorID?.peerID ?? peerID,
      } as Product;
    }
    return listing;
  } catch {
    return null;
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
    category,
    type,
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
  if (category && category !== 'all') {
    queryParams.append('category', category);
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
    const response = await searchSafeGet<SearchApiResponse>(
      `${SEARCH_API.SEARCH}?${queryParams.toString()}`,
      {}
    );

    const products = parseSearchResults(response);
    const total = response?.results?.total ?? response?.total ?? products.length;
    const hasMore = response?.results?.morePages ?? response?.morePages ?? false;

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
}): Promise<SearchProfilesResponse> {
  const { query, page = 0, pageSize = 20 } = params;

  // 构建查询参数
  const searchQuery = query.trim() === '' ? '*' : query;
  const queryParams = new URLSearchParams({
    q: searchQuery,
    p: String(page),
    pageSize: String(pageSize),
  });

  try {
    const response = await searchSafeGet<ProfileSearchApiResponse>(
      `${SEARCH_API.SEARCH_PROFILES}?${queryParams.toString()}`,
      {}
    );

    const items = response?.results?.results ?? [];
    const users: SearchedUser[] = items.map(item => ({
      peerID: item.data.peerID,
      name: item.data.name || item.data.handle || 'Unknown',
      handle: item.data.handle,
      avatar: item.data.avatarHashes?.medium
        ? getImageUrl(item.data.avatarHashes.medium)
        : undefined,
      shortDescription: item.data.shortDescription,
      location: item.data.location,
      listingCount: item.data.stats?.listingCount ?? 0,
      rating: item.data.stats?.averageRating ?? 0,
      reviewCount: item.data.stats?.ratingCount ?? 0,
    }));

    const total = response?.results?.total ?? response?.total ?? users.length;
    const hasMore = response?.results?.morePages ?? response?.morePages ?? false;

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
