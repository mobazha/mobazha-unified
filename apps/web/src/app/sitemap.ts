import type { MetadataRoute } from 'next';

import '@/lib/initPublicEnv';
import { isHostedMode } from '@mobazha/core/config/env';
import { buildProductHref, parseCompositeListingSlug } from '@mobazha/core/utils/productUrl';
import { fetchSearchListingCatalog, type SitemapListingItem } from '@/lib/ssrSearchCatalog';
import { getSiteUrl, isNamedStorefrontRequest } from '@/lib/siteUrl';
import { SSR_API_BASE } from '@/lib/ssrApiBase';

const API_BASE = SSR_API_BASE;

interface ListingIndexItem {
  slug: string;
  hash?: string;
}

function unwrapListingIndex(json: unknown): ListingIndexItem[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object' && 'data' in json) {
    const data = (json as { data: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

async function fetchListingIndex(): Promise<ListingIndexItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/listings/index`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return unwrapListingIndex(await res.json());
  } catch {
    return [];
  }
}

function mapIndexListings(listings: ListingIndexItem[]): SitemapListingItem[] {
  return listings.flatMap(listing => {
    const { slug, peerID } = parseCompositeListingSlug(listing.slug);
    return slug ? [{ slug, peerID }] : [];
  });
}

async function fetchSitemapListings(): Promise<SitemapListingItem[]> {
  if (isHostedMode()) {
    const searchListings = await fetchSearchListingCatalog();
    if (searchListings.length > 0) {
      return searchListings;
    }
  }

  return mapIndexListings(await fetchListingIndex());
}

/**
 * MS-Phase-2a · MS2a.3 — SEO de-duplication.
 *
 * On named storefront subdomains we return an empty sitemap — crawlers should
 * discover products through the canonical main-store sitemap (pointed at by
 * `robots.ts`). Emitting product URLs under multiple hostnames would forfeit
 * the SEO consolidation we achieve via rel=canonical.
 *
 * The main store / verified custom domain generates the full catalogue sitemap
 * rooted at its own host — URLs there are already canonical.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (await isNamedStorefrontRequest()) {
    return [];
  }

  // Current host is canonical here (main store or verified custom domain), so
  // we anchor sitemap URLs at getSiteUrl() to reflect whichever domain served
  // this request rather than a build-time constant.
  const siteUrl = await getSiteUrl();
  const listings = await fetchSitemapListings();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/marketplace`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];

  const productRoutes = listings.reduce<MetadataRoute.Sitemap>((routes, listing) => {
    if (!listing.slug) return routes;

    routes.push({
      url: buildProductHref(listing.slug, listing.peerID, { baseUrl: siteUrl }),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    });
    return routes;
  }, []);

  const peerIds = new Set<string>();
  for (const listing of listings) {
    if (listing.peerID) {
      peerIds.add(listing.peerID);
    }
  }
  const storeRoutes: MetadataRoute.Sitemap = Array.from(peerIds).map(peerId => ({
    url: `${siteUrl}/store/${peerId}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...storeRoutes];
}
