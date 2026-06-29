import type { ProductListItem } from '../types/product';

/**
 * Keep listings that explicitly belong to the requested store.
 *
 * Used by the related-listings recommendation API only. Rows without
 * vendorPeerID are not trusted — production node index responses can return
 * platform-wide demo catalog items with no owner field. Only an explicit
 * vendorPeerID matching the requested store is kept (same rule as the strict
 * search fallback). Mock mode stamps vendorPeerID before calling this filter.
 */
export function filterStoreOwnedListings(
  listings: readonly ProductListItem[],
  storePeerID: string
): ProductListItem[] {
  const normalizedStore = storePeerID.trim();
  if (!normalizedStore) return [];

  return listings.filter(item => {
    const vendor = item.vendorPeerID?.trim();
    if (!vendor) return false;
    return vendor === normalizedStore;
  });
}

export function excludeListingBySlug(
  listings: readonly ProductListItem[],
  slug?: string
): ProductListItem[] {
  const excluded = slug?.trim();
  if (!excluded) return [...listings];
  return listings.filter(item => item.slug !== excluded);
}

/** Curation cohort tags use m{N}-{slug} (e.g. m2-wilson for M2 Wilson collection). */
const CURATION_SCOPE_TAG_PATTERN = /^m\d+-[a-z0-9-]+$/i;

/**
 * Pick an optional related-listings scope tag from listing tags.
 * Returns undefined for ordinary products so store-wide recommendations stay unchanged.
 */
export function resolveRelatedListingsScopeTag(tags?: readonly string[]): string | undefined {
  if (!tags?.length) return undefined;
  const match = tags.find(tag => CURATION_SCOPE_TAG_PATTERN.test(tag.trim()));
  return match?.trim();
}

/**
 * When scopeTag is set, keep only listings that carry the same tag.
 * Listings without tags never match a required scope.
 */
export function filterListingsByScopeTag(
  listings: readonly ProductListItem[],
  scopeTag?: string
): ProductListItem[] {
  const required = scopeTag?.trim();
  if (!required) return [...listings];

  const normalized = required.toLowerCase();
  return listings.filter(item => item.tags?.some(tag => tag.trim().toLowerCase() === normalized));
}
