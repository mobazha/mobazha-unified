'use client';

import { useQuery } from '@tanstack/react-query';
import * as moderatorsApi from '../services/api/moderators';
import { queryKeys } from './queryKeys';

export function useModeratorDetail(peerID: string | undefined) {
  const normalizedPeerID = peerID?.trim() || '';

  const moderatorQuery = useQuery({
    queryKey: queryKeys.moderators.detail(normalizedPeerID),
    queryFn: () => moderatorsApi.getModeratorDetail(normalizedPeerID),
    enabled: normalizedPeerID.length > 0,
    staleTime: 60_000,
  });

  const reviewsQuery = useQuery({
    queryKey: queryKeys.moderators.reviews(normalizedPeerID),
    queryFn: () => moderatorsApi.getModeratorReviews(normalizedPeerID, { limit: 20 }),
    enabled: normalizedPeerID.length > 0 && !!moderatorQuery.data,
    staleTime: 60_000,
    retry: false,
  });

  return {
    moderator: moderatorQuery.data ?? null,
    reviews: reviewsQuery.data?.reviews ?? [],
    isLoading: moderatorQuery.isLoading,
    isReviewsLoading: reviewsQuery.isLoading,
    error: moderatorQuery.error instanceof Error ? moderatorQuery.error : null,
    refetch: moderatorQuery.refetch,
  };
}
