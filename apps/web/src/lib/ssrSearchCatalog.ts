import { SEARCH_API } from '@mobazha/core/config/apiPaths';
import { slugToSearchQuery } from '@mobazha/core/utils/productUrl';

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

interface ListEnvelopePayload {
  data?: SearchResultItem[];
  meta?: { hasMore?: boolean; total?: number };
}

/** Parse a search listings page response (exported for unit tests). */
export function parseSearchListingPage(json: unknown): {
  items: SearchResultItem[];
  hasMore: boolean;
} {
  if (!json || typeof json !== 'object') {
    return { items: [], hasMore: false };
  }

  const envelope = json as ListEnvelopePayload;

  // Current /search/v1/listings list envelope: { data: [...], meta: { hasMore } }
  if (Array.isArray(envelope.data)) {
    const hasMore = envelope.meta?.hasMore ?? false;
    return { items: envelope.data, hasMore };
  }

  const root = 'data' in envelope ? envelope.data : json;

  if (Array.isArray(root)) {
    return { items: root as SearchResultItem[], hasMore: false };
  }

  const payload = (root ?? json) as SearchPagePayload | undefined;
  const items = payload?.results?.results ?? [];
  const hasMore = payload?.results?.morePages ?? payload?.morePages ?? false;
  return { items, hasMore };
}

/** Resolve vendor peerID for SSR product metadata when the URL omits ?peerID=. */
export async function resolveSsrListingVendorPeer(slug: string): Promise<string | undefined> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return undefined;

  const params = new URLSearchParams({
    q: slugToSearchQuery(normalizedSlug),
    p: '1',
    pageSize: '20',
    sortBy: 'relevance',
    browse: 'all',
  });

  try {
    const res = await fetch(`${SSR_SEARCH_BASE}${SEARCH_API.SEARCH_LISTINGS}?${params}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return undefined;

    const { items } = parseSearchListingPage(await res.json());
    const match = items.find(item => item.data?.slug === normalizedSlug);
    return (
      match?.relationships?.vendor?.data?.peerID?.trim() ||
      match?.data?.vendorPeerID?.trim() ||
      undefined
    );
  } catch {
    return undefined;
  }
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
      p: String(page + 1),
      pageSize: String(pageSize),
      sortBy: 'newest',
      browse: 'all',
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
