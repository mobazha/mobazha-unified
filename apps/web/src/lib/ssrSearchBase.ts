/**
 * Search API base URL for server-side fetches (SSR, Sitemap).
 *
 * Priority:
 *  1. INTERNAL_INFO_API_URL — Docker-internal info service (e.g. "http://info-api:8080")
 *  2. NEXT_PUBLIC_INFO_API_URL — public info URL baked at build-time
 *  3. Production fallback
 */
export const SSR_SEARCH_BASE =
  process.env.INTERNAL_INFO_API_URL ||
  process.env.NEXT_PUBLIC_INFO_API_URL ||
  'https://info.mobazha.org';
