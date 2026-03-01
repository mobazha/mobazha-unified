'use client';

/**
 * Store Branding Config Hook — React Query 版本
 *
 * Owner (admin editor) → useQuery + useMutation
 * Public (store visitor) → useQuery
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StoreConfig } from '../types/storeConfig';
import * as storefrontApi from '../services/api/storefront';
import { queryKeys } from './queryKeys';
import { formatQueryError } from './queryUtils';

/**
 * Owner hook (authenticated — admin editor)
 */
export function useStorefrontConfig() {
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.storefront.config(),
    queryFn: () => storefrontApi.getStorefrontConfig(),
    staleTime: 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: (newConfig: StoreConfig) => storefrontApi.saveStorefrontConfig(newConfig),
    onSuccess: saved => {
      queryClient.setQueryData(queryKeys.storefront.config(), saved);
      queryClient.invalidateQueries({ queryKey: queryKeys.storefront.all });
    },
  });

  const save = useCallback(
    async (newConfig: StoreConfig) => {
      return saveMutation.mutateAsync(newConfig);
    },
    [saveMutation]
  );

  return {
    config: config ?? null,
    isLoading,
    isSaving: saveMutation.isPending,
    error: formatQueryError(error || saveMutation.error),
    refetch,
    save,
  };
}

/**
 * Public hook (no auth — store visitor)
 */
export function useStorefrontConfigPublic(peerID: string | null) {
  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.storefront.configPublic(peerID!),
    queryFn: () => storefrontApi.getStorefrontConfigPublic(peerID!),
    enabled: !!peerID,
    staleTime: 2 * 60 * 1000,
  });

  return {
    config: config ?? null,
    isLoading,
    error: formatQueryError(error),
    refetch,
  };
}
