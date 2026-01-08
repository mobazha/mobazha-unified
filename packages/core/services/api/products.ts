/**
 * 商品 API 服务
 */

import type { Product, ProductListItem, ProductRating } from '../../types';
import { get, post, put, del, safeRequest } from './client';
import {
  getGatewayUrl,
  getSearchUrl,
  getHeadersWithContext,
  getAuthHeaders,
  getImageUrl,
} from './config';
import type { Image } from '../../types';

// API 返回的搜索结果格式
interface SearchResultItem {
  data: ProductListItem;
  relationships?: {
    vendor?: {
      data?: {
        peerID?: string;
      };
    };
  };
}

interface SearchApiResponse {
  results?: {
    results?: SearchResultItem[];
  };
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
    return {
      ...item.data,
      vendorPeerID: item.relationships?.vendor?.data?.peerID ?? item.data.vendorPeerID,
      // 转换缩略图 IPFS hash 为完整 URL，保持原始值作为后备
      thumbnail: thumbnail ?? item.data.thumbnail,
    };
  });
}

/**
 * 获取热门商品列表
 */
export async function fetchTrendingListings(): Promise<ProductListItem[]> {
  const url = `${getSearchUrl()}/api/listings/fresh/10`;
  console.log('🔍 Fetching trending listings from:', url);
  try {
    const response = await safeRequest<SearchApiResponse>(
      url,
      { headers: getHeadersWithContext() },
      {}
    );
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
  const url = `${getSearchUrl()}/api/listings/hot/24/10`;
  console.log('🔍 Fetching featured listings from:', url);
  try {
    const response = await safeRequest<SearchApiResponse>(
      url,
      { headers: getHeadersWithContext() },
      {}
    );
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
  const url = `${getSearchUrl()}/profile/listings?peerId=${storePeerID}&pageSize=${pageSize}`;
  return safeRequest<ProductListItem[]>(url, { headers: getHeadersWithContext() }, []);
}

/**
 * 获取商品索引（自己的商品）
 */
export async function getListingIndex(
  username?: string,
  password?: string
): Promise<ProductListItem[]> {
  const url = `${getGatewayUrl()}/ob/listingindex`;
  const data = await safeRequest<ProductListItem[] | { success: false }>(
    url,
    { headers: getHeadersWithContext(username, password) },
    []
  );

  if (!data || (data as { success: false }).success === false) {
    return [];
  }
  return data as ProductListItem[];
}

/**
 * 获取其他店铺的商品索引
 */
export async function getStoreListingIndex(
  peerID: string,
  username?: string,
  password?: string
): Promise<ProductListItem[]> {
  const url = `${getGatewayUrl()}/ob/listingindex/${peerID}`;
  const data = await safeRequest<ProductListItem[] | { success: false }>(
    url,
    { headers: getHeadersWithContext(username, password) },
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
export async function getListing(
  slug: string,
  peerID?: string,
  username?: string,
  password?: string
): Promise<Product | null> {
  const timestamp = Date.now();
  let url: string;

  if (!peerID) {
    url = `${getGatewayUrl()}/ob/listing/${slug}?`;
  } else {
    url = `${getGatewayUrl()}/ob/listing/${peerID}/${slug}?usecache=true&${timestamp}`;
  }

  try {
    return await get<Product>(url, getHeadersWithContext(username, password));
  } catch {
    return null;
  }
}

/**
 * 获取公开商品详情（无需认证）
 */
export async function getPublicListing(slug: string, peerID?: string): Promise<Product | null> {
  const timestamp = Date.now();
  let url: string;

  if (!peerID) {
    url = `${getGatewayUrl()}/ob/listing/${slug}?`;
  } else {
    url = `${getGatewayUrl()}/ob/listing/${peerID}/${slug}?usecache=true&${timestamp}`;
  }

  try {
    const data = await get<{ listing?: Product } & Product>(url, getHeadersWithContext());
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
  productDetails: Partial<Product>,
  username?: string,
  password?: string
): Promise<{ slug: string } | { error: string }> {
  const url = `${getGatewayUrl()}/ob/listing`;
  return post(url, productDetails, getAuthHeaders(username, password));
}

/**
 * 更新商品
 */
export async function updateListing(
  productDetails: Partial<Product>,
  username?: string,
  password?: string
): Promise<{ success: boolean } | { error: string }> {
  const url = `${getGatewayUrl()}/ob/listing`;
  return put(url, productDetails, getAuthHeaders(username, password));
}

/**
 * 删除商品
 */
export async function deleteListing(
  slug: string,
  username?: string,
  password?: string
): Promise<{ success: boolean }> {
  const url = `${getGatewayUrl()}/ob/listing/${slug}`;
  return del(url, getAuthHeaders(username, password));
}

/**
 * 获取商品评价索引
 */
export async function getRatingIndex(
  peerID?: string,
  slug?: string,
  username?: string,
  password?: string
): Promise<ProductRating[]> {
  const timestamp = Date.now();
  let url: string;

  if (peerID && slug) {
    url = `${getGatewayUrl()}/ob/ratingindex/${peerID}/${slug}?usecache=true&${timestamp}`;
  } else if (peerID) {
    url = `${getGatewayUrl()}/ob/ratingindex/${peerID}?usecache=true&${timestamp}`;
  } else if (slug) {
    url = `${getGatewayUrl()}/ob/ratingindex/${slug}`;
  } else {
    url = `${getGatewayUrl()}/ob/ratingindex`;
  }

  return safeRequest<ProductRating[]>(
    url,
    { headers: getHeadersWithContext(username, password) },
    []
  );
}

/**
 * 举报商品
 */
export async function reportListing(
  peerID: string,
  slug: string,
  reason: string
): Promise<{ success: boolean }> {
  const url = `${getSearchUrl()}/api/reports`;
  return post(url, { peerID, slug, reason, report_type: 'listing' }, getHeadersWithContext());
}
