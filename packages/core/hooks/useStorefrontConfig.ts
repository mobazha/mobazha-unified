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
 *
 * Draft-aware (PG-203): `config` is the live/published config; `draft` is the
 * unpublished draft slot. `saveDraft` never touches the live store;
 * `publish` replaces it and clears the draft server-side.
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

  const {
    data: draft,
    isLoading: isDraftLoading,
    error: draftError,
  } = useQuery({
    queryKey: queryKeys.storefront.draft(),
    queryFn: () => storefrontApi.getStorefrontDraft(),
    staleTime: 60 * 1000,
  });

  const saveDraftMutation = useMutation({
    mutationFn: (newConfig: StoreConfig) =>
      storefrontApi.saveStorefrontConfig({ ...newConfig, status: 'draft' }),
    onSuccess: saved => {
      queryClient.setQueryData(queryKeys.storefront.draft(), saved);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (newConfig: StoreConfig) =>
      storefrontApi.saveStorefrontConfig({ ...newConfig, status: 'published' }),
    onSuccess: saved => {
      queryClient.setQueryData(queryKeys.storefront.config(), saved);
      queryClient.setQueryData(queryKeys.storefront.draft(), null);
      queryClient.invalidateQueries({ queryKey: queryKeys.storefront.all });
    },
  });

  const discardDraftMutation = useMutation({
    mutationFn: () => storefrontApi.discardStorefrontDraft(),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.storefront.draft(), null);
    },
  });

  const saveDraft = useCallback(
    async (newConfig: StoreConfig) => saveDraftMutation.mutateAsync(newConfig),
    [saveDraftMutation]
  );

  const publish = useCallback(
    async (newConfig: StoreConfig) => publishMutation.mutateAsync(newConfig),
    [publishMutation]
  );

  const discardDraft = useCallback(
    async () => discardDraftMutation.mutateAsync(),
    [discardDraftMutation]
  );

  /** @deprecated use `publish` — kept for existing callers. */
  const save = publish;

  return {
    config: config ?? null,
    draft: draft ?? null,
    isLoading: isLoading || isDraftLoading,
    isSaving:
      saveDraftMutation.isPending || publishMutation.isPending || discardDraftMutation.isPending,
    error: formatQueryError(
      error || draftError || saveDraftMutation.error || publishMutation.error
    ),
    refetch,
    save,
    saveDraft,
    publish,
    discardDraft,
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
