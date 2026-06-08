import { buildProductHref, buildProductOgImageHref } from '@mobazha/core';
import { SSR_API_BASE } from '@/lib/ssrApiBase';

const API_BASE = SSR_API_BASE;

export interface SsrProductData {
  slug: string;
  item?: {
    title?: string;
    description?: string;
    images?: Array<{ medium?: string; small?: string; original?: string }>;
    price?: number;
    priceCurrency?: { code?: string; divisibility?: number };
    skus?: Array<{ price?: string }>;
    condition?: string;
    categories?: string[];
  };
  metadata?: {
    contractType?: string;
    pricingCurrency?: { code?: string; divisibility?: number };
  };
  vendorID?: { peerID?: string; handle?: string };
  hash?: string;
}

function unwrapEnvelope<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/** SSR fetch for listing metadata / JSON-LD. Prefer peerID when the URL includes it. */
export async function fetchSsrProduct(
  slug: string,
  peerID?: string
): Promise<SsrProductData | null> {
  try {
    const path = peerID
      ? `${API_BASE}/v1/listings/${encodeURIComponent(peerID)}/${encodeURIComponent(slug)}?usecache=true`
      : `${API_BASE}/v1/listings/${encodeURIComponent(slug)}`;
    const res = await fetch(path, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const raw = unwrapEnvelope<{ listing?: SsrProductData } & SsrProductData>(await res.json());
    return raw?.listing ?? raw ?? null;
  } catch {
    return null;
  }
}

export function stripProductHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .trim();
}

const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

/** Resolve listing image hash to a fetchable URL (SSR / OG / oEmbed). */
export function getSsrProductMediaUrl(hash?: string): string | undefined {
  if (!hash) return undefined;
  if (MEDIA_CDN) return `${MEDIA_CDN}/${hash}`;
  return `${API_BASE}/v1/media/images/${hash}`;
}

/** Product page URL; defers to core helper for SaaS vs standalone peerID rules. */
export function buildProductPageUrl(siteUrl: string, slug: string, peerID?: string): string {
  return buildProductHref(slug, peerID, { baseUrl: siteUrl });
}

/** OG image route; follows the same peerID rules as buildProductPageUrl. */
export function buildProductOgImageUrl(
  canonicalSiteUrl: string,
  slug: string,
  peerID?: string
): string {
  return buildProductOgImageHref(slug, peerID, { baseUrl: canonicalSiteUrl });
}
