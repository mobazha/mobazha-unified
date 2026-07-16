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
 *
 * `previewToken` (from a share-preview link) switches the fetch to the
 * seller's unpublished draft. `isPreview` reports whether the shown config
 * actually came through a token, so pages can badge it as a draft.
 */
export function useStorefrontConfigPublic(peerID: string | null, previewToken?: string) {
  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: previewToken
      ? queryKeys.storefront.configPreview(peerID!, previewToken)
      : queryKeys.storefront.configPublic(peerID!),
    queryFn: () => storefrontApi.getStorefrontConfigPublic(peerID!, previewToken),
    enabled: !!peerID,
    staleTime: previewToken ? 0 : 2 * 60 * 1000,
    // An expired/rotated token 404s; retrying will not un-expire it.
    retry: previewToken ? false : undefined,
  });

  return {
    config: config ?? null,
    isLoading,
    isPreview: !!previewToken && !!config,
    error: formatQueryError(error),
    refetch,
  };
}

/**
 * Published-revision history (owner only). Fetch is deferred until `enabled`
 * so the dialog that shows it pays the cost, not every editor mount.
 */
export function useStorefrontHistory(enabled: boolean) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.storefront.history(),
    queryFn: () => storefrontApi.getStorefrontHistory(),
    enabled,
    staleTime: 30 * 1000,
  });
  return {
    history: data ?? [],
    isLoading,
    error: formatQueryError(error),
  };
}
