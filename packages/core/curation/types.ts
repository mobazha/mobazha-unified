import type {
  MarketplaceCatalogMode,
  MarketplaceCurationBrand,
  MarketplaceCurationConfig,
  MarketplaceCurationFeaturedItem,
  MarketplaceDiscoverability,
  MarketplaceJoinMode,
  MarketplaceSellerEntryMode,
} from '../types/marketplace';

export type VerticalId = string;

export interface CurationCategoryNode {
  id: string;
  label: string;
}

export interface CurationConfig {
  id: string;
  vertical: VerticalId;
  joinMode: MarketplaceJoinMode;
  catalogMode: MarketplaceCatalogMode;
  discoverability: MarketplaceDiscoverability;
  sellerEntryMode: MarketplaceSellerEntryMode;
  catalogQuery?: string;
  allowedPeers: string[];
  sellers: string[];
  featured: MarketplaceCurationFeaturedItem[];
  brand: MarketplaceCurationBrand;
  taxonomy: CurationCategoryNode[];
  policy: Record<string, string>;
  attribution: {
    utmSource: string;
    marketplaceId: string;
  };
  subdomain?: string;
  domain?: string;
}

export function mapMarketplaceConfigToCuration(raw: MarketplaceCurationConfig): CurationConfig {
  return {
    id: raw.id,
    vertical: raw.vertical,
    joinMode: raw.joinMode,
    catalogMode: raw.catalogMode,
    discoverability: raw.discoverability,
    sellerEntryMode: raw.sellerEntryMode,
    catalogQuery: raw.catalogQuery,
    allowedPeers: raw.allowedPeers ?? [],
    sellers: raw.sellers ?? raw.allowedPeers ?? [],
    featured: raw.featured ?? [],
    brand: raw.brand,
    taxonomy: (raw.taxonomy ?? []).flatMap(node => {
      const id = node.id?.trim();
      const label = node.label?.trim();
      if (!id || !label) return [];
      return [{ id, label }];
    }),
    policy: raw.policy ?? {},
    attribution: raw.attribution ?? { utmSource: raw.id, marketplaceId: raw.id },
    subdomain: raw.subdomain,
    domain: raw.domain,
  };
}
