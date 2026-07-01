import { isSovereignMode, isStandaloneMode } from '../config/env';
import { hasPeerIDPrefix } from './identity';

export interface ProductHrefOptions {
  baseUrl?: string;
  includePeerID?: boolean;
  params?: Record<string, string | number | boolean | null | undefined>;
}

function buildProductPath(
  slug: string,
  peerID: string | null | undefined,
  options: ProductHrefOptions,
  subPath = ''
): string {
  const href = `/product/${encodeURIComponent(slug)}${subPath}`;
  const searchParams = new URLSearchParams();
  const includePeerID = options.includePeerID ?? !(isStandaloneMode() || isSovereignMode());

  if (includePeerID && peerID) {
    searchParams.set('peerID', peerID);
  }

  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }

  const path = searchParams.size > 0 ? `${href}?${searchParams.toString()}` : href;
  if (!options.baseUrl) return path;

  return new URL(path, options.baseUrl).toString();
}

export function buildProductHref(
  slug: string,
  peerID?: string | null,
  options: ProductHrefOptions = {}
): string {
  return buildProductPath(slug, peerID, options);
}

/** OG image route; follows the same peerID rules as buildProductHref. */
export function buildProductOgImageHref(
  slug: string,
  peerID?: string | null,
  options: ProductHrefOptions = {}
): string {
  return buildProductPath(slug, peerID, options, '/opengraph-image');
}

export function getProductPeerIDParam(searchParams: URLSearchParams): string | undefined {
  return searchParams.get('peerID') || undefined;
}

/** Extract store peerID from `/store/{peerID}` paths (SaaS storefront deep links). */
export function inferStorePeerIDFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/store\/([^/?#]+)/);
  if (!match) return undefined;
  const candidate = decodeURIComponent(match[1]).trim();
  return hasPeerIDPrefix(candidate) ? candidate : undefined;
}

/**
 * Resolve peerID for `?product=` modal / deep links.
 * Query param wins; otherwise infer from `/store/{peerID}` pathname.
 */
export function resolveProductModalPeerID(
  pathname: string,
  searchParams: URLSearchParams
): string | undefined {
  return getProductPeerIDParam(searchParams) ?? inferStorePeerIDFromPath(pathname);
}

/**
 * Resolve the peerID used in canonical product URLs and structured data.
 * Prefers the explicit request param; falls back to vendor peerID in multi-store modes.
 */
export function resolveProductPagePeerID(
  requestPeerID?: string | null,
  vendorPeerID?: string | null
): string | undefined {
  const request = requestPeerID?.trim();
  if (request) return request;

  if (isStandaloneMode() || isSovereignMode()) {
    return undefined;
  }

  const vendor = vendorPeerID?.trim();
  return vendor || undefined;
}

/** Turn URL slug separators into a search-friendly query string. */
export function slugToSearchQuery(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse composite index slugs like `{peerID}/{slug}` from listing indexes. */
export function parseCompositeListingSlug(rawSlug: string): { slug: string; peerID?: string } {
  const trimmed = rawSlug.trim();
  if (!trimmed) return { slug: '' };

  const parts = trimmed.split('/');
  if (parts.length >= 2 && hasPeerIDPrefix(parts[0])) {
    return {
      peerID: parts[0],
      slug: parts.slice(1).join('/'),
    };
  }

  return { slug: trimmed };
}

const EMBED_PRODUCT_UTM_PARAMS = {
  utm_source: 'embed',
  utm_medium: 'iframe',
  utm_campaign: 'product_card',
} as const;

/** Product page URL with standard embed UTM params. */
export function buildEmbedProductHref(
  slug: string,
  peerID: string | undefined,
  baseUrl: string
): string {
  return buildProductHref(slug, peerID, {
    baseUrl,
    params: EMBED_PRODUCT_UTM_PARAMS,
  });
}
