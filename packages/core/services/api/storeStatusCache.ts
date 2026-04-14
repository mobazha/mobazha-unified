/**
 * Store reachability cache — shared across all API functions.
 *
 * When any request to a store's Node API returns 503 STORE_UNAVAILABLE,
 * the store is marked "offline" for a short TTL. Subsequent requests for
 * the same store can skip the expensive Node API attempt and go directly
 * to the Search service fallback.
 *
 * TTL is kept short (30s) so that a store coming back online is detected
 * quickly while still eliminating redundant timeout-bound proxy attempts
 * for concurrent page loads.
 */

const OFFLINE_TTL_MS = 30_000;

interface CacheEntry {
  expiresAt: number;
}

const offlineStores = new Map<string, CacheEntry>();

export function markStoreOffline(peerID: string): void {
  offlineStores.set(peerID, { expiresAt: Date.now() + OFFLINE_TTL_MS });
}

export function markStoreOnline(peerID: string): void {
  offlineStores.delete(peerID);
}

export function isStoreKnownOffline(peerID: string): boolean {
  const entry = offlineStores.get(peerID);
  if (!entry) return false;
  if (Date.now() >= entry.expiresAt) {
    offlineStores.delete(peerID);
    return false;
  }
  return true;
}
