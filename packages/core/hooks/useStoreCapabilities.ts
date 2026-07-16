// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

/**
 * useStoreCapabilities — PG-203
 *
 * What a store can *actually* do, derived from data the store cannot fake by
 * typing it into a text field:
 *
 * - escrow  — the published store policy lists at least one enabled moderator
 * - crypto  — the public profile advertises at least one accepted currency
 *
 * Trust badges gate on this so "Buyer Protection" on a storefront means the
 * protection exists, not that the seller typed it. Capabilities are
 * tri-state: undefined while loading (callers should not hide anything yet),
 * then true/false.
 */

import { useQuery } from '@tanstack/react-query';
import { getPublishedStorePolicy } from '../services/api/storePolicy';
import * as profileApi from '../services/api/profile';
import { queryKeys } from './queryKeys';

export interface StoreCapabilities {
  escrow?: boolean;
  crypto?: boolean;
  /** Accepted currency codes, when known. */
  currencies: string[];
  isLoading: boolean;
}

export function useStoreCapabilities(peerID: string | null | undefined): StoreCapabilities {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.storefront.capabilities(peerID || 'unknown'),
    queryFn: async () => {
      // Either source failing must not take the other down: a store with no
      // published policy yet still has a profile, and vice versa.
      const [policy, profile] = await Promise.all([
        getPublishedStorePolicy(peerID!).catch(() => null),
        profileApi.getProfile(peerID!).catch(() => null),
      ]);
      const currencies = profile?.currencies ?? [];
      return {
        escrow: !!policy?.moderators?.some(m => m.enabled),
        crypto: currencies.length > 0,
        currencies: currencies as string[],
      };
    },
    enabled: !!peerID,
    staleTime: 5 * 60 * 1000,
  });

  return {
    escrow: data?.escrow,
    crypto: data?.crypto,
    currencies: data?.currencies ?? [],
    isLoading,
  };
}
