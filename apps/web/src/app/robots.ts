import type { MetadataRoute } from 'next';

import { getCanonicalSiteUrl, getSiteUrl, isNamedStorefrontRequest } from '@/lib/siteUrl';

/**
 * MS-Phase-2a · MS2a.3 — SEO de-duplication.
 *
 * Named storefront subdomains (e.g. alice-vip.sf.mymbz.org) serve the same
 * underlying products as the main store. To avoid duplicate-content penalties
 * we:
 *   - Return `Disallow: /` so crawlers skip the storefront entirely.
 *   - Point sitemap at the canonical host so the crawler still discovers
 *     the main catalogue.
 *
 * The main store (and verified custom domains) gets the normal robots rules
 * and its own sitemap.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const [namedStorefront, canonicalSiteUrl, currentSiteUrl] = await Promise.all([
    isNamedStorefrontRequest(),
    getCanonicalSiteUrl(),
    getSiteUrl(),
  ]);

  if (namedStorefront) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: `${canonicalSiteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/checkout/', '/payment/', '/orders/', '/settings/', '/api/'],
      },
    ],
    sitemap: `${currentSiteUrl}/sitemap.xml`,
  };
}
