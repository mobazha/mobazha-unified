/**
 * useStoreMetadata — fetches cached store metadata from search service
 * when a standalone store is offline (cross-store routing fallback).
 */

import { useQuery } from '@tanstack/react-query';
import { storeMetadataApi } from '../services/api';
import type { StoreMetadataType } from '../services/api/storeMetadata';
import { queryKeys } from './queryKeys';
import { formatQueryError } from './queryUtils';

export function useStoreMetadata(
  peerID: string | null,
  types?: StoreMetadataType[],
  enabled = true
) {
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.stores.metadata(peerID!), types],
    queryFn: () => storeMetadataApi.fetchStoreMetadata(peerID!, types),
    enabled: !!peerID && enabled,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  return {
    metadata: data ?? null,
    isLoading,
    error: formatQueryError(error),
    getEntry: <T = unknown>(type: StoreMetadataType): T | null =>
      storeMetadataApi.getMetadataEntry<T>(data ?? null, type),
  };
}
