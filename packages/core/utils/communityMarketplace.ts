/**
 * Community marketplace display helpers (public group-marketplace projection).
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
export function marketplaceLogoInitials(name: string, publicID: string): string {
  const source = (name || publicID).trim();
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
    case 'group_member':
      return 'marketplace.joinModeGroupMember';
    case 'public':
      return 'marketplace.joinModePublic';
    case 'approval':
      return 'marketplace.joinModeApproval';
    default:
      return 'marketplace.joinModeGroupMember';
  }
}

/** i18n key for platform badge. */
export function marketplacePlatformKey(platform: string): string {
  if (platform === 'telegram') return 'marketplace.platformTelegram';
  if (platform === 'discord') return 'marketplace.platformDiscord';
  return 'marketplace.platformUnknown';
}

export function marketplaceHref(slug: string | undefined, publicID: string): string {
  return `/marketplace/${slug || publicID}`;
}

export function communityProductHref(slug: string, peerID: string): string {
  return buildProductHref(slug, peerID);
}
