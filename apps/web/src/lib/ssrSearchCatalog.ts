import { SEARCH_API } from '@mobazha/core';

import { SSR_SEARCH_BASE } from './ssrSearchBase';

export interface SitemapListingItem {
  slug: string;
  peerID?: string;
}

interface SearchResultItem {
  data?: { slug?: string; vendorPeerID?: string };
  relationships?: { vendor?: { data?: { peerID?: string } } };
}

interface SearchPagePayload {
  results?: { results?: SearchResultItem[]; morePages?: boolean };
  morePages?: boolean;
}

/** Parse a search listings page response (exported for unit tests). */
export function parseSearchListingPage(json: unknown): {
  items: SearchResultItem[];
  hasMore: boolean;
} {
  const root =
    json && typeof json === 'object' && 'data' in json ? (json as { data: unknown }).data : json;

  if (Array.isArray(root)) {
    return { items: root as SearchResultItem[], hasMore: false };
  }

  const payload = root as SearchPagePayload | undefined;
  const items = payload?.results?.results ?? [];
  const hasMore = payload?.results?.morePages ?? payload?.morePages ?? false;
  return { items, hasMore };
}

/** Paginated public search catalog for hosted-mode sitemap generation. */
export async function fetchSearchListingCatalog(): Promise<SitemapListingItem[]> {
  const listings: SitemapListingItem[] = [];
  const seen = new Set<string>();
  const pageSize = 100;
  const maxPages = 50;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      q: '*',
      p: String(page),
      pageSize: String(pageSize),
      sortBy: 'recent',
    });

    try {
      const res = await fetch(`${SSR_SEARCH_BASE}${SEARCH_API.SEARCH_LISTINGS}?${params}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;

      const { items, hasMore } = parseSearchListingPage(await res.json());
      if (items.length === 0) break;

      for (const item of items) {
        const slug = item.data?.slug?.trim();
        if (!slug) continue;

        const peerID =
          item.relationships?.vendor?.data?.peerID?.trim() ||
          item.data?.vendorPeerID?.trim() ||
          undefined;
        const key = peerID ? `${peerID}/${slug}` : slug;
        if (seen.has(key)) continue;
        seen.add(key);

        listings.push({ slug, peerID });
      }

      if (!hasMore) break;
    } catch {
      break;
    }
  }

  return listings;
}
