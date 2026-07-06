'use client';

import { createContext, useContext } from 'react';
import { isStandalone } from '../services/auth';
import type { UserProfile } from '../types';

/**
 * Context injected by StorefrontProvider in apps/web layout.tsx.
 * Populated from the middleware-set `x-storefront-peerid` request header
 * so the value is available during SSR — no hydration mismatch.
 *
 * Four-layer defense (all synchronous, SSR-safe):
 *   1. StorefrontContext — set by SSR layout, primary source
 *   2. isStandalone()   — build-time env flag for VPS deploys
 *   3. window.__STOREFRONT_PEERID__ — SSR-injected <script> global
 *   4. mbz-storefront cookie — set by proxy.ts or Go Gateway
 *
 * storeProfile is fetched client-side by StorefrontProvider when peerID
 * is present, making it available to Header/Footer without per-component fetching.
 */
interface StorefrontCtx {
  peerID: string | null;
  isStorefront: boolean;
  storeProfile: UserProfile | null;
  storeProfileLoaded: boolean;
}

const StorefrontContext = createContext<StorefrontCtx | null>(null);

export { StorefrontContext };

/**
 * Read the storefront peerID synchronously from all available sources.
 * Safe to call during render (no side effects).
 */
export function getStorefrontPeerIDSync(): string | null {
  // Layer 3: SSR-injected global
  if (
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).__STOREFRONT_PEERID__
  ) {
    return (window as unknown as Record<string, unknown>).__STOREFRONT_PEERID__ as string;
  }
  // Layer 4: cookie fallback
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/mbz-storefront=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * SSR-safe hook: should the page render in standalone-store style?
 *
 * Returns true for real standalone VPS deployments AND SaaS branded
 * subdomains that should look like independent stores.
 */
export function useStorefrontMode(): boolean {
  const ctx = useContext(StorefrontContext);

  // Layer 1: Context from SSR layout — always correct, no mismatch
  if (ctx?.isStorefront) return true;

  // Layer 2: build-time standalone flag (VPS deploy)
  if (isStandalone()) return true;

  // Layer 3+4: client-side fallback (window global / cookie)
  if (getStorefrontPeerIDSync()) return true;

  return false;
}

/**
 * Returns the storefront peerID when in storefront mode, null otherwise.
 * Synchronous — safe to use during render without causing hydration mismatch
 * when StorefrontContext is provided.
 */
export function useStorefrontPeerID(): string | null {
  const ctx = useContext(StorefrontContext);

  // Layer 1: Context (SSR-safe, primary)
  if (ctx?.peerID) return ctx.peerID;

  // Layer 3+4: client-side fallback
  return getStorefrontPeerIDSync();
}

/**
 * Returns the store owner's public profile when in storefront mode.
 * Fetched once by StorefrontProvider; null if not yet loaded or not in storefront mode.
 */
export function useStorefrontProfile(): UserProfile | null {
  const ctx = useContext(StorefrontContext);
  return ctx?.storeProfile ?? null;
}

/** Distinguishes a missing public profile from a profile request in flight. */
export function useStorefrontProfileLoading(): boolean {
  const ctx = useContext(StorefrontContext);
  return ctx ? !ctx.storeProfileLoaded : false;
}
