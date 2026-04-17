/**
 * Standalone Stores API
 *
 * Manage standalone stores linked to the current user's account.
 * Backend: mobazha_hosting/api/store_registry_handlers.go
 *
 * Design constraint (V1): each user can bind at most ONE standalone store.
 * The backend API returns an array for forward compatibility, but the bind
 * handler enforces 1:1 via Casdoor Properties["peerID"] (single string).
 * Prefer getMyStandaloneStore() for UI consumption.
 */

import { hostingGet } from './helpers';
import { HOSTING_API } from '../../config/apiPaths';

export interface StandaloneStore {
  id: number;
  peer_id: string;
  endpoint_url?: string;
  domain?: string;
  owner_user_id?: string;
  connectivity: 'public' | 'tunnel' | 'nat';
  plan: string;
  status: 'active' | 'suspended';
  last_heartbeat?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch standalone stores owned by the current user (raw array).
 * Requires JWT authentication.
 */
export async function getMyStandaloneStores(): Promise<StandaloneStore[]> {
  return hostingGet<StandaloneStore[]>(HOSTING_API.STORES_MY_STORES);
}

/**
 * Fetch the user's standalone store (single-store semantic).
 * Returns null if the user has no bound standalone store.
 */
export async function getMyStandaloneStore(): Promise<StandaloneStore | null> {
  const stores = await getMyStandaloneStores();
  return stores.length > 0 ? stores[0] : null;
}
