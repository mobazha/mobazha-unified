import type { Locale } from '../i18n/types';

export const COLLECTIBLE_MARKETPLACE_LISTINGS_SECTION_ID = 'collectible-marketplace-listings';

const M2_WILSON_MARKETPLACE_IDENTIFIERS = new Set(['m2-wilson']);

export function isM2WilsonCollectibleMarketplace(identifier?: string | null): boolean {
  if (!identifier?.trim()) return false;
  return M2_WILSON_MARKETPLACE_IDENTIFIERS.has(identifier.trim().toLowerCase());
}

export interface CollectibleMarketplaceDisplayInput {
  slug?: string | null;
  id: string;
  name: string;
  description?: string | null;
}

export interface CollectibleMarketplaceDisplayCopy {
  name: string;
  description: string;
  usedLocalizedDemoCopy: boolean;
}

/** Conservative zh demo copy for M2 Wilson — does not alter backend payloads. */
export function resolveCollectibleMarketplaceDisplayCopy(
  marketplace: CollectibleMarketplaceDisplayInput,
  locale: Locale,
  t: (key: string) => string
): CollectibleMarketplaceDisplayCopy {
  const identifier = (marketplace.slug || marketplace.id).trim().toLowerCase();
  const defaultDescription = t('marketplace.detail.collectibles.defaultDescription');

  if (locale === 'zh' && isM2WilsonCollectibleMarketplace(identifier)) {
    return {
      name: t('marketplace.detail.collectibles.demo.m2Wilson.name'),
      description: t('marketplace.detail.collectibles.demo.m2Wilson.description'),
      usedLocalizedDemoCopy: true,
    };
  }

  return {
    name: marketplace.name?.trim() || t('marketplace.detail.collectibles.badge'),
    description: marketplace.description?.trim() || defaultDescription,
    usedLocalizedDemoCopy: false,
  };
}

/** Hide Telegram/Discord join CTA when the market is native-hosted without an external group link. */
export function shouldShowCollectibleMarketplaceJoinCta(platform?: string | null): boolean {
  const normalized = platform?.trim().toLowerCase();
  return normalized === 'telegram' || normalized === 'discord';
}
