/**
 * Storefront Config API — PG-201
 *
 * Store branding configuration CRUD.
 * Backend: mobazha/internal/api/storefront_handlers.go
 */

import { authGet, authPut, publicGet } from './helpers';
import { NODE_API } from '../../config/apiPaths';
import type { StoreConfig } from '../../types/storeConfig';
import { isStoreUnavailableError } from './client';
import { isStoreKnownOffline, markStoreOffline, markStoreOnline } from './storeStatusCache';
import { fetchStoreMetadata, getMetadataEntry } from './storeMetadata';

/** Get the current user's storefront config (owner, may include draft). */
export async function getStorefrontConfig(): Promise<StoreConfig> {
  return authGet<StoreConfig>(NODE_API.SETTINGS_STOREFRONT);
}

/** Full-replace the current user's storefront config. */
export async function saveStorefrontConfig(config: StoreConfig): Promise<StoreConfig> {
  return authPut<StoreConfig>(NODE_API.SETTINGS_STOREFRONT, config);
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
