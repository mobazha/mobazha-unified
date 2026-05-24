'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as moderatorsApi from '../services/api/moderators';
import { queryKeys } from './queryKeys';

export function useModeratorDirectory() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.moderators.directory(),
    queryFn: () => moderatorsApi.discoverModerators(),
    staleTime: 2 * 60 * 1000,
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    moderators: data ?? [],
    isLoading,
    isFetching,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refresh,
  };
}
