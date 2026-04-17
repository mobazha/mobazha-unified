import type { MetadataRoute } from 'next';

import { getSiteUrl, isNamedStorefrontRequest } from '@/lib/siteUrl';
import { SSR_API_BASE } from '@/lib/ssrApiBase';

const API_BASE = SSR_API_BASE;

interface ListingIndexItem {
  slug: string;
  hash?: string;
}

async function fetchListingIndex(): Promise<ListingIndexItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/listings/index`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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
  const listings = await fetchListingIndex();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/marketplace`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];

  const productRoutes: MetadataRoute.Sitemap = listings.map(listing => ({
    url: `${siteUrl}/product/${listing.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const peerIds = new Set<string>();
  for (const listing of listings) {
    const parts = listing.slug.split('/');
    if (parts.length >= 2 && parts[0].startsWith('Qm')) {
      peerIds.add(parts[0]);
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
