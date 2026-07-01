/**
 * Store Context Service
 * 独立站店铺上下文管理
 *
 * When a seller opens the Mini App with a store-specific deep link
 * (e.g. startapp=store_12D3KooW...), the store context is set.
 * All subsequent API requests include the X-Store-PeerID header so
 * the SaaS proxy routes them to the correct standalone store.
 */

import { parseStartParam } from './startParam';

const STORE_CONTEXT_KEY = 'standalone_store_peer_id';

let currentStorePeerID: string | null = null;

// Peer IDs are base58-encoded multihashes; reject control chars, whitespace, and HTTP-special chars.
const PEER_ID_PATTERN = /^[A-Za-z0-9]{1,80}$/;

function isValidPeerID(value: string): boolean {
  return PEER_ID_PATTERN.test(value);
}

/**
 * Parse store peer ID from a Telegram `start_param` payload.
 *
 * Delegates to the multi-segment parser (see `startParam.ts`) so legacy
 * `store_<peerID>` single-segment inputs and new compound inputs such as
 * `store_<peerID>__sf_<slug>` are both recognised.
 */
export function parseStoreFromStartParam(startParam: string | undefined): string | null {
  if (!startParam) return null;
  const parsed = parseStartParam(startParam);
  return parsed.storePeerID ?? null;
}

/**
 * Set the active standalone store context.
 * Persists to localStorage for session continuity.
 */
export function setStoreContext(peerID: string): void {
  if (!peerID || !isValidPeerID(peerID)) return;
  currentStorePeerID = peerID;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORE_CONTEXT_KEY, peerID);
    } catch {
      // storage not available
    }
  }
}

/**
 * Get the current standalone store peer ID.
 * Returns from memory cache first, then localStorage.
 */
export function getStorePeerID(): string | null {
  if (currentStorePeerID) return currentStorePeerID;

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORE_CONTEXT_KEY);
      if (saved && isValidPeerID(saved)) {
        currentStorePeerID = saved;
        return saved;
      }
      if (saved) {
        localStorage.removeItem(STORE_CONTEXT_KEY);
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Clear the standalone store context.
 */
export function clearStoreContext(): void {
  currentStorePeerID = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORE_CONTEXT_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * Returns HTTP headers for standalone store routing.
 * When a store context is active, adds X-Store-PeerID so the SaaS
 * proxy middleware routes the request to the correct standalone store.
 */
export function getStoreHeaders(): Record<string, string> {
  const peerID = getStorePeerID();
  if (peerID) {
    return { 'X-Store-PeerID': peerID };
  }
  return {};
}

/**
 * Check if we're currently managing a standalone store.
 */
export function isManagingStandaloneStore(): boolean {
  return getStorePeerID() !== null;
}

/**
 * Validate the persisted store context against the user's actual stores.
 * Clears stale context if the stored peerID is not in the owned stores list.
 * Should be called during auth initialization when no deep link is present.
 */
export async function validateStoreContext(
  fetchMyStore: () => Promise<{ peer_id: string } | null>
): Promise<void> {
  const savedPeerID = getStorePeerID();
  if (!savedPeerID) return;

  try {
    const store = await fetchMyStore();
    if (!store || store.peer_id !== savedPeerID) {
      clearStoreContext();
    }
  } catch {
    // Network error — keep existing context rather than clearing on transient failures
  }
}

export const storeContextService = {
  parseStoreFromStartParam,
  setStoreContext,
  getStorePeerID,
  clearStoreContext,
  getStoreHeaders,
  isManagingStandaloneStore,
  validateStoreContext,
};

export default storeContextService;
