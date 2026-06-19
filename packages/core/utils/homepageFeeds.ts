/**
 * SaaS homepage feed helpers — vendor diversity + featured store scoring.
 */

import type { SearchedUser } from '../services/api/products';

export interface VendorPeerListing {
  vendorPeerID?: string;
}

export interface DiversifyByVendorOptions {
  /** Target number of items to return */
  limit: number;
  /** Max items from the same vendor (default 2) */
  maxPerVendor?: number;
}

/**
 * Round-robin selection with a per-vendor cap so bulk imports do not monopolize homepage grids.
 */
export function diversifyListingsByVendor<T extends VendorPeerListing>(
  items: T[],
  { limit, maxPerVendor = 2 }: DiversifyByVendorOptions
): T[] {
  if (limit <= 0 || items.length === 0) return [];

  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const vendor = item.vendorPeerID?.trim() || '_unknown';
    const bucket = buckets.get(vendor);
    if (bucket) bucket.push(item);
    else buckets.set(vendor, [item]);
  }

  const result: T[] = [];
  const counts = new Map<string, number>();

  while (result.length < limit) {
    let added = false;
    for (const [vendor, bucket] of buckets) {
      if (result.length >= limit) break;
      const used = counts.get(vendor) ?? 0;
      if (used >= maxPerVendor || bucket.length === 0) continue;
      const next = bucket.shift();
      if (!next) continue;
      result.push(next);
      counts.set(vendor, used + 1);
      added = true;
    }
    if (!added) break;
  }

  return result;
}

/** Over-fetch multiplier so diversify has enough candidates after per-vendor caps. */
export function homepageFeedFetchLimit(displayLimit: number): number {
  return Math.min(Math.max(displayLimit * 4, 32), 150);
}

/** Batch sizes when a single vendor monopolizes the fresh/hot window (bulk import). */
export const HOMEPAGE_FEED_FETCH_BATCHES = [48, 100, 120, 150] as const;

/** Below this vendor count, hot/trending feed is not meaningful — fall back to fresh. */
export const HOMEPAGE_MIN_VENDORS_FOR_HOT = 3;

export const BROWSE_ALL_QUERY = '*';

/** Sort modes where q=* browse is dominated by bulk-import time ordering. */
export const BROWSE_ALL_DIVERSITY_SORTS = new Set([
  'relevance',
  'newest',
  'added-desc',
  'rating',
  'price_low',
  'price_high',
  'price-asc',
  'price-desc',
]);

export function shouldDiversifyBrowseAllSearch(params: {
  query: string;
  page: number;
  sortBy: string;
  type?: string;
  productType?: string;
}): boolean {
  const q = params.query.trim() === '' ? BROWSE_ALL_QUERY : params.query.trim();
  if (q !== BROWSE_ALL_QUERY || params.page !== 0) return false;
  if (params.type && params.type !== 'all') return false;
  if (params.productType && params.productType !== 'all') return false;
  return BROWSE_ALL_DIVERSITY_SORTS.has(params.sortBy);
}

/** Over-fetch for browse-all search so per-vendor caps can reach past bulk-import blocks. */
export function browseAllSearchFetchLimit(pageSize: number): number {
  return Math.min(Math.max(pageSize * 6, 120), 150);
}

export function browseAllMaxPerVendor(pageSize: number): number {
  return Math.max(3, Math.ceil(pageSize / 6));
}

export function countUniqueVendors<T extends VendorPeerListing>(items: T[]): number {
  return new Set(items.map(i => i.vendorPeerID?.trim() || '_unknown')).size;
}

/**
 * Featured store score — favors branding + reviews over raw listing volume (bulk-import resistant).
 */
export function computeFeaturedStoreScore(user: SearchedUser): number {
  const cappedListings = Math.min(user.listingCount, 20);
  const activityScore = cappedListings * 0.1 + user.reviewCount * 0.3;
  const qualityScore = user.rating * 0.25;
  const brandScore =
    (user.avatar ? 1 : 0) * 0.15 +
    (user.headerImage ? 1 : 0) * 0.1 +
    (user.shortDescription ? 1 : 0) * 0.15 +
    (user.listingCount > 0 ? 1 : 0) * 0.05;
  return activityScore + qualityScore + brandScore;
}

/** Stores with meaningful catalog but no reviews yet — show "New on the network" badge. */
export function isNewOnNetworkStore(user: SearchedUser): boolean {
  return user.listingCount >= 5 && user.reviewCount === 0;
}
