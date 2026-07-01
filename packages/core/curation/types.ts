import type {
  MarketplaceBuyerAccessMode,
  MarketplaceCatalogMode,
  MarketplaceCurationBrand,
  MarketplaceCurationConfig,
  MarketplaceCurationFeaturedItem,
  MarketplaceDiscoverability,
  MarketplaceSellerReviewMode,
  MarketplaceSellerEntryMode,
} from '../types/marketplace';

export type VerticalId = string;

export interface CurationCategoryNode {
  id: string;
  label: string;
}

/** Vertical preset — listing/trust defaults per marketplace vertical (P0-1a). */
export type PaymentDefault = 'crypto' | 'fiat';

export type TrustCopyKey = 'buyerProtectionNotAuthentication' | 'standard';

export interface ListingFieldHint {
  id: string;
  label: string;
  placeholder?: string;
}

/** P1+ hub_nft / vault / gacha mount points (F1). Empty in P0. */
export interface VerticalModuleRef {
  id: string;
  fulfillment?: string;
}

export interface VerticalPreset {
  id: VerticalId;
  taxonomy: CurationCategoryNode[];
  listingHints: ListingFieldHint[];
  paymentDefaults: PaymentDefault[];
  trustCopy: TrustCopyKey;
  modules: VerticalModuleRef[];
}

export interface CurationConfig {
  id: string;
  vertical: VerticalId;
  buyerAccessMode: MarketplaceBuyerAccessMode;
  sellerReviewMode: MarketplaceSellerReviewMode;
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
    buyerAccessMode: raw.buyerAccessMode,
    sellerReviewMode: raw.sellerReviewMode,
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
