/**
 * Store metadata API service (cross-store routing offline fallback).
 * Fetches cached store metadata from the search service when a standalone
 * store is offline/unreachable.
 */

import { SEARCH_API } from '../../config/apiPaths';
import { searchSafeGet } from './helpers';

export type StoreMetadataType = 'collections' | 'discounts' | 'payment_methods' | 'storefront';

export interface StoreMetadataEntry {
  metadataType: StoreMetadataType;
  data: unknown;
  updatedAt: string;
}

export interface StoreMetadataResponse {
  peerId: string;
  metadata: StoreMetadataEntry[];
}

export async function fetchStoreMetadata(
  peerID: string,
  types?: StoreMetadataType[]
): Promise<StoreMetadataResponse | null> {
  return searchSafeGet<StoreMetadataResponse | null>(
    SEARCH_API.STORE_METADATA(peerID, types),
    null
  );
}

export function getMetadataEntry<T = unknown>(
  resp: StoreMetadataResponse | null,
  type: StoreMetadataType
): T | null {
  if (!resp?.metadata) return null;
  const entry = resp.metadata.find(m => m.metadataType === type);
  return entry ? (entry.data as T) : null;
}
