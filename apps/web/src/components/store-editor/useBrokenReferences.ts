// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

/**
 * useBrokenReferences — PG-203
 *
 * Sections can reference listings and collections that no longer exist (the
 * seller deletes a product weeks after pinning it in "featured"). Buyers see
 * the hole; the seller never does. This hook diffs every manual reference in
 * the config against what the store actually has, so the publish dialog can
 * name what is broken while the seller is still looking at the publish button.
 *
 * Advisory only: publishing with broken references stays allowed — the live
 * config may already have them, and blocking would trap the seller.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useUserStore,
  productDataService,
  collectionsApi,
  queryKeys,
  type StoreConfig,
} from '@mobazha/core';

export interface BrokenReference {
  /** Editor display name of the offending section. */
  sectionLabel: string;
  kind: 'listing' | 'collection';
  missing: string[];
}

export function useBrokenReferences(config: StoreConfig | null): {
  broken: BrokenReference[];
  isChecking: boolean;
} {
  const { profile } = useUserStore();
  const peerID = profile?.peerID;

  const wantsListings = !!config?.sections.some(
    s => s.visible && s.type === 'featured-products' && s.props.mode === 'manual'
  );
  const wantsCollections = !!config?.sections.some(
    s => s.visible && s.type === 'collections' && s.props.mode === 'manual'
  );

  // Same query keys as ResourcePicker, so an editing session that already
  // opened the picker answers this from cache.
  const listingsQuery = useQuery({
    queryKey: queryKeys.products.ownerCatalog(peerID || 'unknown'),
    queryFn: () => productDataService.getStoreListings(peerID!),
    enabled: !!peerID && wantsListings,
    staleTime: 60 * 1000,
  });
  const collectionsQuery = useQuery({
    queryKey: queryKeys.collections.list(1),
    queryFn: () => collectionsApi.listCollections(1, 100),
    enabled: !!peerID && wantsCollections,
    staleTime: 60 * 1000,
  });

  const broken = useMemo((): BrokenReference[] => {
    if (!config) return [];
    const result: BrokenReference[] = [];

    if (wantsListings && listingsQuery.data) {
      const known = new Set(listingsQuery.data.map(p => p.slug));
      for (const s of config.sections) {
        if (!s.visible || s.type !== 'featured-products' || s.props.mode !== 'manual') continue;
        const missing = (s.props.productSlugs ?? []).filter(slug => !known.has(slug));
        if (missing.length) {
          result.push({
            sectionLabel: s.name || s.props.title || s.type,
            kind: 'listing',
            missing,
          });
        }
      }
    }

    if (wantsCollections && collectionsQuery.data) {
      const known = new Set(collectionsQuery.data.data.map(c => c.id));
      for (const s of config.sections) {
        if (!s.visible || s.type !== 'collections' || s.props.mode !== 'manual') continue;
        const missing = (s.props.collectionIDs ?? []).filter(id => !known.has(id));
        if (missing.length) {
          result.push({
            sectionLabel: s.name || s.props.title || s.type,
            kind: 'collection',
            missing,
          });
        }
      }
    }

    return result;
  }, [config, wantsListings, wantsCollections, listingsQuery.data, collectionsQuery.data]);

  return {
    broken,
    isChecking:
      (wantsListings && listingsQuery.isLoading) ||
      (wantsCollections && collectionsQuery.isLoading),
  };
}
