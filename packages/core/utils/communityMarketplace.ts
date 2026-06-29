/**
 * Community marketplace display helpers (public marketplace projection).
 */

import { buildProductHref } from './productUrl';

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

/** i18n key for join mode from public projection. */
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
