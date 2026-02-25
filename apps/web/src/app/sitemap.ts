import type { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:15104';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.mobazha.org';

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

  return [...staticRoutes, ...productRoutes];
}
