import { headers } from 'next/headers';

const DEFAULT_SITE_URL = 'https://app.mobazha.org';

/**
 * Resolve the site base URL for SSR metadata (canonical, OG, JSON-LD).
 *
 * Priority:
 * 1. X-Store-Domain header (injected by Gateway for branded subdomains)
 * 2. NEXT_PUBLIC_SITE_URL env (deploy-time override)
 * 3. x-forwarded-host / host (request-aware fallback)
 * 4. Hardcoded default
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
