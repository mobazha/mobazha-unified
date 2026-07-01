/**
 * Community marketplace display helpers (public marketplace projection).
 */

import { buildProductHref } from './productUrl';
import type {
  PublicMarketplaceListingRef,
  PublicNativeMarketplaceDetail,
} from '../types/marketplace';

/** Turn listing slug into a readable title when API title is unavailable. */
export function formatListingSlugTitle(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Stable initials for marketplace logo fallback (no third-party avatar API). */
export function marketplaceLogoInitials(name: string, identifier: string): string {
  const source = (name || identifier).trim();
  if (!source) return 'M';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/** i18n key for legacy group marketplace join mode from public projection. */
export function marketplaceJoinModeKey(joinMode?: string): string {
  switch (joinMode) {
    case 'open':
      return 'marketplace.joinModePublic';
    case 'approval':
      return 'marketplace.joinModeApproval';
    case 'invite':
      return 'marketplace.joinModeInvite';
    case 'group_member':
      return 'marketplace.joinModeGroupMember';
    default:
      return 'marketplace.joinModePublic';
  }
}

/** i18n key for native marketplace buyer access mode from public projection. */
export function marketplaceBuyerAccessModeKey(buyerAccessMode?: string): string {
  switch (buyerAccessMode) {
    case 'open':
      return 'marketplace.enums.buyerAccessMode.open';
    default:
      return 'marketplace.enums.buyerAccessMode.open';
  }
}

/** i18n key for native marketplace seller review mode from public projection. */
export function marketplaceSellerReviewModeKey(sellerReviewMode?: string): string {
  switch (sellerReviewMode) {
    case 'auto':
      return 'marketplace.enums.sellerReviewMode.auto';
    case 'manual':
      return 'marketplace.enums.sellerReviewMode.manual';
    default:
      return 'marketplace.enums.sellerReviewMode.manual';
  }
}

/** i18n key for platform badge (legacy group marketplaces). */
export function marketplacePlatformKey(platform: string): string {
  if (platform === 'telegram') return 'marketplace.platformTelegram';
  if (platform === 'discord') return 'marketplace.platformDiscord';
  return 'marketplace.platformUnknown';
}

/** i18n key for marketplace vertical badge. */
export function marketplaceVerticalKey(vertical: string): string {
  const normalized = vertical?.trim().toLowerCase();
  if (normalized === 'collectible' || normalized === 'collectibles') {
    return 'marketplace.vertical.collectible';
  }
  if (normalized === 'fashion') return 'marketplace.vertical.fashion';
  if (normalized === 'general') return 'marketplace.vertical.general';
  return 'marketplace.vertical.other';
}

export function marketplaceHref(slug: string | undefined, id: string): string {
  return `/marketplace/${slug || id}`;
}

export function communityProductHref(slug: string, peerID: string): string {
  return buildProductHref(slug, peerID);
}

export interface PublicMarketplaceCurationRefs {
  curatedListingRefs: PublicMarketplaceListingRef[];
  curatedSellerPeerIDs: string[];
  bannerListingRefs: PublicMarketplaceListingRef[];
  fallbackListingRefs: PublicMarketplaceListingRef[];
  fallbackSellerPeerIDs: string[];
}

function pushUniqueListing(
  target: PublicMarketplaceListingRef[],
  seen: Set<string>,
  peerID: string | undefined,
  slug: string | undefined
) {
  const normalizedPeerID = peerID?.trim();
  const normalizedSlug = slug?.trim();
  if (!normalizedPeerID || !normalizedSlug) return;
  const key = `${normalizedPeerID}::${normalizedSlug}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push({ peerID: normalizedPeerID, slug: normalizedSlug });
}

function pushUniquePeer(target: string[], seen: Set<string>, peerID: string | undefined) {
  const normalizedPeerID = peerID?.trim();
  if (!normalizedPeerID || seen.has(normalizedPeerID)) return;
  seen.add(normalizedPeerID);
  target.push(normalizedPeerID);
}

function sortBySortOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.sortOrder !== b.item.sortOrder) {
        return a.item.sortOrder - b.item.sortOrder;
      }
      return a.index - b.index;
    })
    .map(row => row.item);
}

/**
 * Partition native public marketplace detail into curation refs while preserving operator order.
 */
export function derivePublicMarketplaceCurationRefs(
  detail: PublicNativeMarketplaceDetail | null | undefined
): PublicMarketplaceCurationRefs {
  const curatedListingRefs: PublicMarketplaceListingRef[] = [];
  const curatedSellerPeerIDs: string[] = [];
  const bannerListingRefs: PublicMarketplaceListingRef[] = [];
  const fallbackListingRefs: PublicMarketplaceListingRef[] = [];
  const fallbackSellerPeerIDs: string[] = [];

  if (!detail) {
    return {
      curatedListingRefs,
      curatedSellerPeerIDs,
      bannerListingRefs,
      fallbackListingRefs,
      fallbackSellerPeerIDs,
    };
  }

  const featured = sortBySortOrder(detail.featured ?? []);
  const banners = sortBySortOrder(detail.banners ?? []);

  const curatedListingSeen = new Set<string>();
  const curatedSellerSeen = new Set<string>();
  const bannerSeen = new Set<string>();
  const fallbackListingSeen = new Set<string>();
  const fallbackSellerSeen = new Set<string>();

  for (const item of featured) {
    if (item.type === 'listing') {
      pushUniqueListing(curatedListingRefs, curatedListingSeen, item.peerID, item.slug);
      continue;
    }
    if (item.type === 'seller') {
      pushUniquePeer(curatedSellerPeerIDs, curatedSellerSeen, item.peerID);
      continue;
    }
    if (item.type === 'banner') {
      pushUniqueListing(bannerListingRefs, bannerSeen, item.peerID, item.slug);
    }
  }

  for (const banner of banners) {
    pushUniqueListing(bannerListingRefs, bannerSeen, banner.peerID, banner.slug);
  }

  for (const ref of detail.listings?.listings ?? []) {
    pushUniqueListing(fallbackListingRefs, fallbackListingSeen, ref.peerID, ref.slug);
  }

  for (const seller of detail.sellers ?? []) {
    pushUniquePeer(fallbackSellerPeerIDs, fallbackSellerSeen, seller.peerID);
  }

  return {
    curatedListingRefs,
    curatedSellerPeerIDs,
    bannerListingRefs,
    fallbackListingRefs,
    fallbackSellerPeerIDs,
  };
}
