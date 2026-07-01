import { headers } from 'next/headers';

const DEFAULT_SITE_URL: string =
  typeof __OUTPOST__ !== 'undefined' && __OUTPOST__ ? '' : 'https://app.mobazha.org';

/**
 * Resolve the site base URL for SSR metadata (OG, JSON-LD, breadcrumb items).
 *
 * Priority:
 * 1. X-Store-Domain header (injected by Gateway for branded subdomains)
 * 2. NEXT_PUBLIC_SITE_URL env (deploy-time override)
 * 3. x-forwarded-host / host (request-aware fallback)
 * 4. Hardcoded default
 *
 * This is the URL of the page *being served* — use it for links that should
 * stay on the current host (pagination, breadcrumbs within the storefront).
 *
 * For rel=canonical / OG URL, use getCanonicalSiteUrl() instead so named
 * storefront subdomains consolidate SEO signals onto the main store domain.
 *
 * Must only be called in Server Components or generateMetadata.
 */
export async function getSiteUrl(): Promise<string> {
  try {
    const h = await headers();

    const storeDomain = h.get('x-store-domain');
    if (storeDomain) {
      return `https://${storeDomain}`;
    }
  } catch {
    /* headers() unavailable — static generation or client context */
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}`;
    }
  } catch {
    /* fallback below */
  }

  return DEFAULT_SITE_URL;
}

/**
 * Resolve the canonical site base URL for rel=canonical / OG url.
 *
 * MS-Phase-2a · MS2a.3 — Storefront Lite SEO de-duplication.
 *
 * Priority:
 * 1. X-Store-Canonical-Domain header (injected by hostRouterMiddleware on
 *    storefront subdomain requests — points at the default/main store domain)
 * 2. getSiteUrl() (current host — already canonical for main store and
 *    custom domain requests)
 *
 * When a buyer lands on a named storefront subdomain (e.g.
 * alice-vip.sf.mymbz.org) that sources products from the main store, we must
 * emit rel=canonical pointing at the main store's URL to avoid duplicate
 * content penalties. The Gateway only injects X-Store-Canonical-Domain when
 * the current host is *not* the canonical one, so an absent header means
 * "current host is already canonical" — getSiteUrl() is correct.
 *
 * Must only be called in Server Components or generateMetadata.
 */
export async function getCanonicalSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const canonical = h.get('x-store-canonical-domain');
    if (canonical) {
      return `https://${canonical}`;
    }
  } catch {
    /* headers() unavailable — fall through */
  }
  return getSiteUrl();
}

/**
 * Returns true when the current request is served from a *named* storefront
 * subdomain (not the default storefront and not the main store/custom domain).
 *
 * We detect this via the presence of X-Store-Canonical-Domain — the Gateway
 * only emits that header on storefront subdomain requests whose canonical
 * host differs from the current host. Named storefronts should be marked
 * `robots: noindex` so search engines only crawl the canonical main store
 * URL, eliminating duplicate-content ambiguity when the content overlap is
 * high. Buyers sharing named storefront links still work because the links
 * resolve and render fully — only the indexing signal is suppressed.
 *
 * MS-Phase-2a · MS2a.3.
 */
export async function isNamedStorefrontRequest(): Promise<boolean> {
  try {
    const h = await headers();
    return Boolean(h.get('x-store-canonical-domain'));
  } catch {
    return false;
  }
}
