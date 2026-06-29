'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  COLLECTIBLE_ATTRIBUTION_KEYS,
  mergeCollectibleAttribution,
  parseCollectibleAttributionFromSearchParams,
  readCollectibleAttributionFromSessionStorage,
  writeCollectibleAttributionToSessionStorage,
  type CollectibleAttributionParams,
} from '../curation/collectibleMarketplace';

const EMPTY_ATTRIBUTION: CollectibleAttributionParams = {};

function attributionsEqual(
  a: CollectibleAttributionParams,
  b: CollectibleAttributionParams
): boolean {
  return COLLECTIBLE_ATTRIBUTION_KEYS.every(key => a[key] === b[key]);
}

let snapshotCache: CollectibleAttributionParams = EMPTY_ATTRIBUTION;
let snapshotCacheSearch = '';

function readMergedCollectibleAttribution(): CollectibleAttributionParams {
  const search = window.location.search;
  const incoming = parseCollectibleAttributionFromSearchParams(new URLSearchParams(search));
  const merged = mergeCollectibleAttribution(
    readCollectibleAttributionFromSessionStorage(),
    incoming
  );

  if (search === snapshotCacheSearch && attributionsEqual(merged, snapshotCache)) {
    return snapshotCache;
  }

  snapshotCacheSearch = search;
  snapshotCache = merged;
  return snapshotCache;
}

function subscribeCollectibleAttribution(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);
  return () => window.removeEventListener('popstate', onStoreChange);
}

/**
 * Client-only collectible attribution from URL params + session storage.
 * SSR/hydration returns `{}` until the client snapshot is read.
 */
export function useCollectibleMarketplaceAttribution(
  enabled: boolean,
  marketplaceIdentifier?: string
): CollectibleAttributionParams {
  const attribution = useSyncExternalStore(
    subscribeCollectibleAttribution,
    () => (enabled ? readMergedCollectibleAttribution() : EMPTY_ATTRIBUTION),
    () => EMPTY_ATTRIBUTION
  );

  useEffect(() => {
    if (!enabled) return;
    writeCollectibleAttributionToSessionStorage(readMergedCollectibleAttribution());
  }, [enabled, marketplaceIdentifier]);

  return attribution;
}
