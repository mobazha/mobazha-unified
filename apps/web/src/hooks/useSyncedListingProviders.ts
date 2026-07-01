'use client';

import { useEffect, useState } from 'react';
import { fulfillmentApi, FULFILLMENT_PROVIDERS, useFeature } from '@mobazha/core';

const EMPTY_SYNCED_SLUGS = new Map<string, string>();

/** Phase A: map listing slug → fulfillment provider display name. */
export function useSyncedListingProviders() {
  const supplyChainEnabled = useFeature('supplyChainEnabled');
  const [syncedSlugs, setSyncedSlugs] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supplyChainEnabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const map = new Map<string, string>();
      for (const p of FULFILLMENT_PROVIDERS) {
        try {
          const synced = await fulfillmentApi.getSyncedProducts(p.id);
          for (const sp of synced) {
            map.set(sp.listingSlug, p.name);
          }
        } catch {
          // provider might not be connected
        }
      }
      if (!cancelled) {
        setSyncedSlugs(map);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supplyChainEnabled]);

  const activeSyncedSlugs = supplyChainEnabled ? syncedSlugs : EMPTY_SYNCED_SLUGS;
  const activeLoading = supplyChainEnabled ? loading : false;

  const getProvider = (slug: string) => activeSyncedSlugs.get(slug);

  return { getProvider, syncedSlugs: activeSyncedSlugs, loading: activeLoading };
}
