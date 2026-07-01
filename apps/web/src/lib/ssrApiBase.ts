/**
 * API base URL resolved for server-side fetches (SSR, Route Handlers, Sitemap).
 *
 * Priority:
 *  1. INTERNAL_API_URL  — Docker-internal Gateway (e.g. "http://hosting:8080")
 *  2. NEXT_PUBLIC_API_BASE_URL — public Gateway URL baked at build-time
 *  3. localhost fallback for local dev
 */
export const SSR_API_BASE =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:15104';
