/**
 * Storefront Config API — PG-201
 *
 * Store branding configuration CRUD.
 * Backend: mobazha3.0/internal/api/storefront_handlers.go
 */

import { authGet, authPut, publicGet } from './helpers';
import { NODE_API } from '../../config/apiPaths';
import type { StoreConfig } from '../../types/storeConfig';

/** Get the current user's storefront config (owner, may include draft). */
export async function getStorefrontConfig(): Promise<StoreConfig> {
  return authGet<StoreConfig>(NODE_API.SETTINGS_STOREFRONT);
}

/** Full-replace the current user's storefront config. */
export async function saveStorefrontConfig(config: StoreConfig): Promise<StoreConfig> {
  return authPut<StoreConfig>(NODE_API.SETTINGS_STOREFRONT, config);
}

/** Get a store's published storefront config (public, no auth). */
export async function getStorefrontConfigPublic(peerID: string): Promise<StoreConfig | null> {
  try {
    return await publicGet<StoreConfig>(NODE_API.SETTINGS_STOREFRONT_PEER(peerID));
  } catch {
    return null;
  }
}
