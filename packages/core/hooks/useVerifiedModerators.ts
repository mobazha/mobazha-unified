/**
 * useVerifiedModerators Hook — React Query 版本
 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchVerifiedModerators,
  hasVerifiedModeratorSync,
  isVerifiedModeratorsLoaded,
} from '../services/verifiedModerators';
import { queryKeys } from './queryKeys';

export interface UseVerifiedModeratorsReturn {
  verifiedModerators: Set<string>;
  isLoading: boolean;
  isLoaded: boolean;
  hasVerifiedMod: (moderatorPeerIDs?: string[]) => boolean;
  refresh: () => Promise<void>;
}

export function useVerifiedModerators(): UseVerifiedModeratorsReturn {
  const {
    data: verifiedModerators,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.moderators.verified(),
    queryFn: () => fetchVerifiedModerators(),
    staleTime: 30 * 1000,
  });

  const hasVerifiedMod = useCallback(
    (moderatorPeerIDs?: string[]): boolean => {
      if (!moderatorPeerIDs || moderatorPeerIDs.length === 0) return false;
      if (isVerifiedModeratorsLoaded()) return hasVerifiedModeratorSync(moderatorPeerIDs);
      const currentVerifiedModerators = verifiedModerators ?? new Set<string>();
      return moderatorPeerIDs.some(peerID => currentVerifiedModerators.has(peerID));
    },
    [verifiedModerators]
  );

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    verifiedModerators: verifiedModerators ?? new Set(),
    isLoading,
    isLoaded: isVerifiedModeratorsLoaded(),
    hasVerifiedMod,
    refresh,
  };
}

export default useVerifiedModerators;
