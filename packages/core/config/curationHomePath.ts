/**
 * Runtime-configured curation homepage for dedicated storefront domains.
 * Deploy sets `window.__RUNTIME_CONFIG__.curationHomePath` (e.g. `/marketplace/m2-wilson`).
 * The root `/` renders that marketplace in-place; the browser URL stays at `/`.
 */

const MARKETPLACE_HOME_PATH = /^\/marketplace\/([a-zA-Z0-9][a-zA-Z0-9_-]*)$/;

let curationHomePath: string | null = null;

/** Validate a same-origin relative marketplace path from runtime-config. */
export function parseCurationHomePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('?')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  if (trimmed.includes('@')) return null;
  if (!trimmed.startsWith('/')) return null;

  const pathOnly = trimmed.split(/[?#]/)[0];
  if (!pathOnly || pathOnly === '/') return null;
  if (!MARKETPLACE_HOME_PATH.test(pathOnly)) return null;

  return pathOnly;
}

export function setCurationHomePathFromRuntimeConfig(raw: unknown): void {
  curationHomePath = parseCurationHomePath(raw);
}

export function getCurationHomePath(): string | null {
  return curationHomePath;
}

/** Extract marketplace slug/publicID from a validated curation home path. */
export function resolveCurationMarketplaceIdentifier(curationHomePathValue: string): string | null {
  const match = curationHomePathValue.match(MARKETPLACE_HOME_PATH);
  return match?.[1] ?? null;
}

export interface RootCurationHomeRenderInput {
  pathname: string;
  curationHomePath: string | null;
  isStandalone: boolean;
  storefrontMode: boolean;
  isSubMarket: boolean;
  needsOnboarding?: boolean;
}

/** Whether `/` should render the configured curation marketplace in-place. */
export function shouldRenderCurationMarketplaceAtRoot(input: RootCurationHomeRenderInput): boolean {
  if (input.pathname !== '/') return false;
  if (!input.curationHomePath) return false;
  if (input.isStandalone) return false;
  if (input.storefrontMode) return false;
  if (input.isSubMarket) return false;
  if (input.needsOnboarding) return false;
  return true;
}

function normalizePathForCompare(path: string): string {
  return path === '/' ? '/' : path.replace(/\/$/, '');
}

/**
 * Dedicated curation domains render the marketplace at `/`. When navigating "back"
 * to that home, keep the browser URL at `/` instead of the internal marketplace path.
 */
export function resolveCurationMarketBackHref(
  marketHref: string,
  curationHomePathValue?: string | null
): string {
  const configuredHome = curationHomePathValue ?? getCurationHomePath();
  if (!configuredHome) return marketHref;

  const normalizedMarket = normalizePathForCompare(marketHref);
  const normalizedCuration = normalizePathForCompare(configuredHome);
  if (normalizedMarket === normalizedCuration) return '/';

  return marketHref;
}
