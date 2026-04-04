import type { MetadataRoute } from 'next';

import { SSR_API_BASE } from '@/lib/ssrApiBase';

const API_BASE = SSR_API_BASE;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.mobazha.org';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await fetchListingIndex();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/marketplace`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];

  const productRoutes: MetadataRoute.Sitemap = listings.map(listing => ({
    url: `${SITE_URL}/product/${listing.slug}`,
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
    url: `${SITE_URL}/store/${peerId}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...storeRoutes];
}
