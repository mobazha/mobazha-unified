/**
 * Storefront Context Service
 *
 * Tracks the active Storefront Lite slug for a session. Works alongside
 * `storeContext` (peer-ID scope): a request can target a store, a storefront
 * inside that store, or both.
 *
 * When present, the slug is sent as `X-Storefront-Slug`. The Hosting gateway
 * `hostRouterMiddleware` (Priority 3 branch) resolves the slug server-side,
 * treating every other storefront-scoped header as a hint to be scrubbed.
 * Server is the authority — client never forges `peerID` / `storefrontID`.
 *
 * Gating: `getStorefrontHeaders()` consults the cached feature-flag snapshot
 * and only emits the header when `tgBridgeBotV2` is enabled (and the kill
 * switch `killStorefrontRoutingDisabled` is off). This matches the backend
 * gate so the client fails closed before the rollout.
 */

import { getCachedFeatureFlags } from '../hooks/featureFlagsCache';

const STOREFRONT_CONTEXT_KEY = 'mbz_storefront_slug';

// Slug contract: kebab-case, 1..64 chars. Mirrors the parser and the server.
const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

let currentSlug: string | null = null;

function isValidSlug(value: string | null | undefined): value is string {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
}

/**
 * Set the active storefront slug. Persists to localStorage for session
 * continuity across deep-link re-entries. Silently no-ops on invalid input.
 */
export function setStorefrontSlug(slug: string): void {
  if (!isValidSlug(slug)) return;
  currentSlug = slug;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STOREFRONT_CONTEXT_KEY, slug);
    } catch {
      // storage not available — memory cache still effective for this tab
    }
  }
}

/**
 * Read the active storefront slug. Prefers the in-memory cache, falls back
 * to localStorage on first access. Returns `null` if no valid slug is
 * stored or the persisted value is corrupt.
 */
export function getStorefrontSlug(): string | null {
  if (currentSlug) return currentSlug;
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem(STOREFRONT_CONTEXT_KEY);
    if (isValidSlug(saved)) {
      currentSlug = saved;
      return saved;
    }
    if (saved !== null) {
      // Corrupt value — evict so subsequent calls don't keep paying the cost.
      localStorage.removeItem(STOREFRONT_CONTEXT_KEY);
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

/** Remove any persisted storefront context. */
export function clearStorefrontSlug(): void {
  currentSlug = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STOREFRONT_CONTEXT_KEY);
  } catch {
    // ignore
  }
}

/** Convenience predicate for UI conditionals. */
export function isStorefrontActive(): boolean {
  return getStorefrontSlug() !== null;
}

/**
 * Build the outgoing HTTP headers for the storefront context.
 *
 * Returns an empty object unless all three preconditions hold:
 *   1. A valid slug is present in the context.
 *   2. `tgBridgeBotV2` feature flag is on.
 *   3. `killStorefrontRoutingDisabled` kill switch is off.
 *
 * This mirrors the backend gate in `hostRouterMiddleware`
 * (`isTelegramBridgeBotV2Enabled`) so the client never emits headers the
 * server will ignore.
 */
export function getStorefrontHeaders(): Record<string, string> {
  const slug = getStorefrontSlug();
  if (!slug) return {};

  const flags = getCachedFeatureFlags();
  if (!flags) return {};
  if (flags.killStorefrontRoutingDisabled === true) return {};
  if (flags.tgBridgeBotV2 !== true) return {};

  return { 'X-Storefront-Slug': slug };
}

export const storefrontContextService = {
  setStorefrontSlug,
  getStorefrontSlug,
  clearStorefrontSlug,
  isStorefrontActive,
  getStorefrontHeaders,
};

export default storefrontContextService;
