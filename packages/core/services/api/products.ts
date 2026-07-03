/**
 * 商品 API 服务
 */

import type {
  ListingSupplySummaryRequest,
  ListingSupplySummaryResponse,
  Product,
  ProductListItem,
  RatingDetail,
  RatingIndex,
} from '../../types';
import { getImageUrl } from './config';
import type { Image } from '../../types';
import { NODE_API, SEARCH_API } from '../../config/apiPaths';
import { minimalAmountAsNumber, parsePriceFields } from '../../utils/transforms/priceTransform';
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
import {
  computeFeaturedStoreScore,
  countUniqueVendors,
  diversifyListingsByVendor,
  homepageFeedFetchLimit,
  HOMEPAGE_FEED_FETCH_BATCHES,
  HOMEPAGE_MIN_VENDORS_FOR_HOT,
} from '../../utils/homepageFeeds';
import {
  excludeListingBySlug,
  filterListingsByScopeTag,
  filterStoreOwnedListings,
} from '../../utils/storeRelatedListings';
import { slugToSearchQuery } from '../../utils/productUrl';

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
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  shipping?: string;
  nsfw?: boolean;
  /** discover (default) | all — only applies to q=* browse */
  browse?: 'discover' | 'all';
  /** Restrict results to these vendor peer IDs (search `id` param). */
  peerIDs?: string[];
}

// 搜索商品的响应
export interface SearchListingsResponse {
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  vendorCount?: number;
  catalogTotal?: number;
  browseMode?: 'discover' | 'all';
}

export interface GetListingIndexOptions {
  includeSupplySummary?: boolean;
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
 * Adaptive over-fetch; returns the best candidate pool (may still be single-vendor).
 */
async function fetchListingPoolWithBatches(
  load: (fetchLimit: number) => Promise<ProductListItem[]>
): Promise<ProductListItem[]> {
  const batches = [...new Set([homepageFeedFetchLimit(12), ...HOMEPAGE_FEED_FETCH_BATCHES])].sort(
    (a, b) => a - b
  );

  let items: ProductListItem[] = [];
  for (const fetchLimit of batches) {
    items = await load(fetchLimit);
    if (countUniqueVendors(items) > 1 || items.length < fetchLimit) {
      break;
    }
  }
  return items;
}

/**
 * Fetch listing feed with adaptive over-fetch when one vendor monopolizes fresh/hot windows.
 */
async function fetchAndDiversifyListingFeed(
  load: (fetchLimit: number) => Promise<ProductListItem[]>,
  limit: number,
  maxPerVendor = 2
): Promise<ProductListItem[]> {
  const batches = [
    ...new Set([homepageFeedFetchLimit(limit), ...HOMEPAGE_FEED_FETCH_BATCHES]),
  ].sort((a, b) => a - b);

  let diversified: ProductListItem[] = [];

  for (const fetchLimit of batches) {
    const items = await load(fetchLimit);
    diversified = diversifyListingsByVendor(items, { limit, maxPerVendor });
    if (countUniqueVendors(items) > 1 || items.length < fetchLimit) {
      return diversified;
    }
  }

  return diversified;
}

/**
 * 获取精选商品列表（SaaS 首页 Popular Products）
 *
 * Primary: hot listings (rating_count across all stores, no time window).
 * Fallback: when hot pool has too few vendors (bulk-import skew), use fresh with max 1/store.
 */
export async function fetchFeaturedListings(limit = 8): Promise<ProductListItem[]> {
  try {
    const hotPool = await fetchListingPoolWithBatches(async fetchLimit => {
      const response = await searchSafeGet<SearchApiResponse>(
        SEARCH_API.LISTINGS_HOT(fetchLimit),
        {}
      );
      return parseSearchResults(response);
    });

    if (countUniqueVendors(hotPool) >= HOMEPAGE_MIN_VENDORS_FOR_HOT) {
      return diversifyListingsByVendor(hotPool, { limit, maxPerVendor: 1 });
    }

    return fetchAndDiversifyListingFeed(
      async fetchLimit => {
        const response = await searchSafeGet<SearchApiResponse>(
          SEARCH_API.LISTINGS_FRESH(fetchLimit),
          {}
        );
        return parseSearchResults(response);
      },
      limit,
      1
    );
  } catch (error) {
    console.error('Failed to fetch featured listings:', error);
    return [];
  }
}

export async function getListingSupplySummary(
  req: ListingSupplySummaryRequest
): Promise<ListingSupplySummaryResponse> {
  return authPost<ListingSupplySummaryResponse>(NODE_API.LISTINGS_SUPPLY_SUMMARY, req);
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

function toListItemPrice(priceSource: unknown): ProductListItem['price'] | undefined {
  if (typeof priceSource !== 'object' || priceSource === null) return undefined;
  const { amountString, currencyCode, divisibility } = parsePriceFields(
    priceSource as ProductListItem['price']
  );
  if (!currencyCode) {
    return { amount: amountString, currency: { code: '', divisibility: divisibility ?? 2 } };
  }
  return {
    amount: amountString,
    currency: { code: currencyCode, divisibility: divisibility ?? 2 },
  };
}

function mapSearchListingItem(item: ProfileListingItem, storePeerID: string): ProductListItem {
  const price = toListItemPrice(item.price) ?? {
    amount: 0,
    currency: { code: '', divisibility: 2 },
  };
  const mapped: ProductListItem = {
    slug: item.slug,
    title: item.title,
    thumbnail:
      transformImageUrls(
        hasImageHash(item.thumbnail) ? item.thumbnail : imageFromCid(item.image),
        storePeerID
      ) ?? ({} as Image),
    price,
    vendorPeerID: item.vendorPeerID ?? item.peerID ?? storePeerID,
    cid: item.cid ?? item.hash,
    contractType: item.contractType as ProductListItem['contractType'],
    nsfw: item.nsfw?.status,
  };
  const basePrice = toListItemPrice(item.basePrice);
  const priceMax = toListItemPrice(item.priceMax);
  if (basePrice) mapped.basePrice = basePrice;
  if (priceMax) mapped.priceMax = priceMax;
  if (typeof item.priceHasRange === 'boolean') mapped.priceHasRange = item.priceHasRange;
  if (Array.isArray(item.tags)) {
    const tags = item.tags.filter(
      (tag): tag is string => typeof tag === 'string' && tag.trim().length > 0
    );
    if (tags.length > 0) mapped.tags = tags;
  }
  return mapped;
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
    const mapped = mapSearchListingItem(item, storePeerID);
    return mapped;
  });
}

/** Search fallback for related listings — requires explicit store ownership on each row. */
async function fetchStrictStoreListingsFromSearch(
  storePeerID: string,
  pageSize: number
): Promise<ProductListItem[]> {
  const raw = await searchSafeGet<ProfileListingItem[]>(
    `${SEARCH_API.PROFILE_LISTINGS(storePeerID)}?pageSize=${pageSize}`,
    []
  );

  return raw
    .filter(item => {
      const owner = (item.vendorPeerID ?? item.peerID)?.trim();
      return owner === storePeerID;
    })
    .map(item => mapSearchListingItem(item, storePeerID));
}

/**
 * 获取商品索引（自己的商品）
 * 超时时间增加到 60 秒，因为网关 API 有时响应较慢
 */
export async function getListingIndex(
  options: GetListingIndexOptions = {}
): Promise<ProductListItem[]> {
  const path = options.includeSupplySummary
    ? `${NODE_API.LISTINGS_INDEX}?includeSupplySummary=true`
    : NODE_API.LISTINGS_INDEX;
  const data = await publicSafeGet<ProductListItem[] | { success: false }>(path, []);

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

export interface StoreRelatedListingsOptions {
  /** Exclude the current product from recommendations */
  excludeSlug?: string;
  /** Maximum number of related listings to return */
  limit?: number;
  /** Page size when querying search fallback */
  pageSize?: number;
  /** When set, only return same-store listings carrying this tag (curated cohort scope). */
  scopeTag?: string;
}

/**
 * Store-scoped related listings for product detail "More from this store".
 *
 * Node index rows without vendorPeerID are untrusted (production can return
 * global demo catalog). Only explicit vendorPeerID matches are kept; strict
 * search fallback uses the same ownership rule. Mock mode stamps vendorPeerID
 * in dataService before this path runs.
 */
export async function getStoreRelatedListings(
  peerID: string,
  options: StoreRelatedListingsOptions = {}
): Promise<ProductListItem[]> {
  const storePeerID = peerID.trim();
  if (!storePeerID) return [];

  const limit = options.limit ?? 12;
  const pageSize = options.pageSize ?? Math.max(limit + 1, 12);

  let listings = filterStoreOwnedListings(await getStoreListingIndex(storePeerID), storePeerID);

  if (listings.length === 0) {
    listings = filterStoreOwnedListings(
      await fetchStrictStoreListingsFromSearch(storePeerID, pageSize),
      storePeerID
    );
  }

  listings = filterListingsByScopeTag(listings, options.scopeTag);

  return excludeListingBySlug(listings, options.excludeSlug).slice(0, limit);
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
 * Build a minimal Product from search-index summary data so the UI can
 * render a degraded product page when the seller node is offline.
 */
async function getListingFromSearchFallback(peerID: string, slug: string): Promise<Product | null> {
  try {
    const items = await fetchStoreListings(peerID, 100);
    const match = items.find(item => item.slug === slug);
    if (!match) return null;

    const thumbnail = match.thumbnail ?? ({} as Image);
    const currCode = match.price?.currency?.code || '';
    const divisibility = match.price?.currency?.divisibility ?? 2;

    return {
      slug: match.slug,
      vendorID: { peerID: match.vendorPeerID ?? peerID, name: match.vendorName },
      metadata: {
        version: 0,
        contractType: match.contractType ?? 'PHYSICAL_GOOD',
        format: 'FIXED_PRICE',
        expiry: '',
        acceptedCurrencies: [],
        pricingCurrency: { code: currCode, divisibility },
        escrowTimeoutHours: 0,
      },
      item: {
        title: match.title,
        description: '',
        processingTime: '',
        price: minimalAmountAsNumber(match.price?.amount),
        nsfw: match.nsfw ?? false,
        tags: [],
        images: [thumbnail],
        productType: match.productType,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Resolve vendor peerID for canonical /product/{slug} URLs via public search.
 * Hosted gateways require peerID for GET /listings/{peerID}/{slug}.
 */
export async function resolveListingVendorPeerFromSearch(
  slug: string
): Promise<string | undefined> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return undefined;

  try {
    const { products } = await searchListings({
      query: slugToSearchQuery(normalizedSlug),
      pageSize: 20,
      browse: 'all',
      sortBy: 'relevance',
    });
    const match = products.find(item => item.slug === normalizedSlug);
    const peerID = match?.vendorPeerID?.trim();
    return peerID || undefined;
  } catch {
    return undefined;
  }
}

async function fetchPublicListingWithPeer(
  slug: string,
  peerID: string
): Promise<PublicListingResult> {
  if (isStoreKnownOffline(peerID)) {
    const fallback = await getListingFromSearchFallback(peerID, slug);
    return { listing: fallback, isOffline: true };
  }

  const path = `${NODE_API.LISTING_PEER(peerID, slug)}?usecache=true`;

  try {
    const data = await publicGet<{ listing?: Product } & Product>(path);
    const listing = data.listing ?? data;
    markStoreOnline(peerID);

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
    if (isStoreUnavailableError(err)) {
      markStoreOffline(peerID);
      const fallback = await getListingFromSearchFallback(peerID, slug);
      return { listing: fallback, isOffline: true };
    }
    return { listing: null, isOffline: false };
  }
}

/**
 * 获取公开商品详情（无需认证）
 *
 * When the store is offline, falls back to search-index summary data so the
 * UI can render a degraded (read-only) product page with an offline banner
 * instead of showing a jarring "connection failed" modal.
 */
export async function getPublicListing(
  slug: string,
  peerID?: string
): Promise<PublicListingResult> {
  const explicitPeerID = peerID?.trim() || undefined;
  if (explicitPeerID) {
    return fetchPublicListingWithPeer(slug, explicitPeerID);
  }

  const resolvedPeerID = await resolveListingVendorPeerFromSearch(slug);
  if (resolvedPeerID) {
    return fetchPublicListingWithPeer(slug, resolvedPeerID);
  }

  // Legacy slug-only node path (local seller / contexts where it remains public).
  try {
    const data = await publicGet<{ listing?: Product } & Product>(NODE_API.LISTING(slug));
    const listing = data.listing ?? data;

    if (listing?.item?.images?.length) {
      return {
        listing: {
          ...listing,
          thumbnail: listing.item.images[0],
          title: listing.item.title,
          slug: listing.slug ?? slug,
          vendorPeerID: listing.vendorID?.peerID,
        } as Product,
        isOffline: false,
      };
    }
    return { listing, isOffline: false };
  } catch {
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
      .map(user => ({ ...user, _score: computeFeaturedStoreScore(user) }))
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
async function fetchSearchListingsRaw(queryString: string) {
  return searchRawGet<{
    data?: SearchResultItem[] | SearchApiResponse;
    meta?: {
      total?: number;
      hasMore?: boolean;
      vendorCount?: number;
      catalogTotal?: number;
      browseMode?: 'discover' | 'all';
    };
    results?: { total?: number; morePages?: boolean; results?: SearchResultItem[] };
    total?: number;
    morePages?: boolean;
  }>(`${SEARCH_API.SEARCH_LISTINGS}?${queryString}`, {});
}

function parseSearchListingsResponse(
  raw: Awaited<ReturnType<typeof fetchSearchListingsRaw>>,
  pageSize: number,
  page = 0
): Pick<
  SearchListingsResponse,
  'products' | 'total' | 'hasMore' | 'vendorCount' | 'catalogTotal' | 'browseMode'
> {
  const innerData = raw?.data ?? raw;
  const products = parseSearchResults(innerData);
  const meta = raw?.meta;
  const total =
    meta?.total ??
    (innerData as SearchApiResponse)?.results?.total ??
    raw?.total ??
    products.length;
  const hasMore =
    meta?.hasMore ??
    (innerData as SearchApiResponse)?.results?.morePages ??
    raw?.morePages ??
    (page + 1) * pageSize < total;
  return {
    products,
    total,
    hasMore,
    vendorCount: meta?.vendorCount,
    catalogTotal: meta?.catalogTotal,
    browseMode: meta?.browseMode,
  };
}

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
    minPrice,
    maxPrice,
    currency,
    shipping,
    nsfw = false,
    browse,
    peerIDs,
  } = params;

  // 构建查询参数
  const searchQuery = query.trim() === '' ? '*' : query;
  const queryParams = new URLSearchParams({
    q: searchQuery,
    p: String(page + 1),
    pageSize: String(pageSize),
    sortBy,
  });

  if (browse === 'all') {
    queryParams.append('browse', 'all');
  }

  // 添加可选过滤参数
  if (productType && productType !== 'all') {
    queryParams.append('productType', productType);
  }
  if (type && type !== 'all') {
    queryParams.append('type', type);
  }
  if (rating && rating > 0) {
    queryParams.append('pr', String(rating));
  }
  if (minPrice != null && minPrice >= 0) {
    queryParams.append('minPrice', String(minPrice));
  }
  if (maxPrice != null && maxPrice >= 0) {
    queryParams.append('maxPrice', String(maxPrice));
  }
  if (currency) {
    queryParams.append('currency', currency);
  }
  if (shipping && shipping !== 'any') {
    queryParams.append('shipping', shipping);
  }
  if (nsfw) {
    queryParams.append('nsfw', 'true');
  }
  if (peerIDs && peerIDs.length > 0) {
    queryParams.append('id', peerIDs.join('|'));
  }

  try {
    const raw = await fetchSearchListingsRaw(queryParams.toString());
    const { products, total, hasMore, vendorCount, catalogTotal, browseMode } =
      parseSearchListingsResponse(raw, pageSize, page);

    return {
      products,
      total,
      page,
      pageSize,
      hasMore,
      vendorCount,
      catalogTotal,
      browseMode,
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
  peerIDs?: string[];
}): Promise<SearchProfilesResponse> {
  const { query, page = 0, pageSize = 20, vendor, peerIDs } = params;

  const searchQuery = query.trim() === '' ? '*' : query;
  const queryParams = new URLSearchParams({
    q: searchQuery,
    p: String(page + 1),
    pageSize: String(pageSize),
  });
  if (vendor !== undefined) {
    queryParams.append('vendor', String(vendor));
  }
  if (peerIDs && peerIDs.length > 0) {
    queryParams.append('id', peerIDs.join('|'));
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
      meta?: { total?: number; hasMore?: boolean };
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
    const hasMore = raw?.meta?.hasMore ?? (page + 1) * pageSize < total;

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
