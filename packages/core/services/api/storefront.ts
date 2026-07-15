/**
 * Storefront Config API — PG-201
 *
 * Store branding configuration CRUD.
 * Backend: mobazha/internal/api/storefront_handlers.go
 */

import { authGet, authPut, authDel, publicGet } from './helpers';
import { NODE_API } from '../../config/apiPaths';
import type { StoreConfig } from '../../types/storeConfig';
import { isStoreUnavailableError } from './client';
import { isStoreKnownOffline, markStoreOffline, markStoreOnline } from './storeStatusCache';
import { fetchStoreMetadata, getMetadataEntry } from './storeMetadata';

/** Get the current user's live (published) storefront config. */
export async function getStorefrontConfig(): Promise<StoreConfig> {
  return authGet<StoreConfig>(NODE_API.SETTINGS_STOREFRONT);
}

/** Get the current user's unpublished storefront draft (null when absent). */
export async function getStorefrontDraft(): Promise<StoreConfig | null> {
  return authGet<StoreConfig | null>(`${NODE_API.SETTINGS_STOREFRONT}?variant=draft`);
}

/**
 * Full-replace the storefront config. The node routes by `status`:
 * 'draft' fills the draft slot (live config untouched); 'published'
 * replaces the live config and clears any draft.
 */
export async function saveStorefrontConfig(config: StoreConfig): Promise<StoreConfig> {
  return authPut<StoreConfig>(NODE_API.SETTINGS_STOREFRONT, config);
}

/** Discard the unpublished storefront draft. */
export async function discardStorefrontDraft(): Promise<void> {
  await authDel<void>(NODE_API.SETTINGS_STOREFRONT_DRAFT);
}

/**
 * Get a store's published storefront config (public, no auth).
 *
 * Uses the shared storeStatusCache. If the store is known offline, skips
 * the Node API and fetches from the search service's store_metadata table.
 */
export async function getStorefrontConfigPublic(peerID: string): Promise<StoreConfig | null> {
  if (isStoreKnownOffline(peerID)) {
    return fetchStorefrontFromSearch(peerID);
  }

  try {
    const config = await publicGet<StoreConfig>(NODE_API.SETTINGS_STOREFRONT_PEER(peerID));
    markStoreOnline(peerID);
    return config;
  } catch (err) {
    if (isStoreUnavailableError(err)) {
      markStoreOffline(peerID);
    }
    return fetchStorefrontFromSearch(peerID);
  }
}

async function fetchStorefrontFromSearch(peerID: string): Promise<StoreConfig | null> {
  try {
    const meta = await fetchStoreMetadata(peerID, ['storefront']);
    return getMetadataEntry<StoreConfig>(meta, 'storefront');
  } catch {
    return null;
  }
}
