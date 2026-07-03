'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as moderatorsApi from '../services/api/moderators';
import { useUserStore } from '../stores/userStore';
import { queryKeys } from './queryKeys';

export interface UseStoreModeratorsReturn {
  moderators: moderatorsApi.Moderator[];
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addModerator: (peerID: string) => Promise<{ success: boolean; error?: string }>;
  removeModerator: (peerID: string) => Promise<{ success: boolean; error?: string }>;
}

export function useStoreModerators(): UseStoreModeratorsReturn {
  const queryClient = useQueryClient();
  const isAuthenticated = useUserStore(s => s.isAuthenticated);

  const {
    data: moderators = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.moderators.store(),
    queryFn: async () => {
      const response = await moderatorsApi.getModerators();
      return response.moderators;
    },
    staleTime: 30_000,
    enabled: isAuthenticated,
  });

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.moderators.store(),
      refetchType: 'active',
    });
  }, [queryClient]);

  const addMutation = useMutation({
    mutationFn: (peerID: string) => moderatorsApi.addStoreModerator(peerID),
    onSuccess: (result, peerID) => {
      if (!result.success) {
        return;
      }
      if (result.moderator) {
        queryClient.setQueryData<moderatorsApi.Moderator[]>(
          queryKeys.moderators.store(),
          (current = []) => {
            const trimmed = peerID.trim();
            if (current.some(m => m.peerID === trimmed || m.peerID === result.moderator?.peerID)) {
              return current;
            }
            return [...current, result.moderator!];
          }
        );
      }
      void invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (peerID: string) => moderatorsApi.removeStoreModerator(peerID),
    onSuccess: result => {
      if (result.success) {
        void invalidate();
      }
    },
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const addModerator = useCallback(
    async (peerID: string) => {
      return addMutation.mutateAsync(peerID);
    },
    [addMutation]
  );

  const removeModerator = useCallback(
    async (peerID: string) => {
      return removeMutation.mutateAsync(peerID);
    },
    [removeMutation]
  );

  return {
    moderators,
    isLoading,
    isSaving: addMutation.isPending || removeMutation.isPending,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refresh,
    addModerator,
    removeModerator,
  };
}
