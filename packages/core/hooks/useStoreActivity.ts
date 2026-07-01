'use client';

import { useState, useEffect } from 'react';
import { HOSTING_API } from '../config/apiPaths';
import { hostingGet } from '../services/api/helpers';

export type ActivityLevel = 'active' | 'recently_active' | 'idle' | 'inactive' | 'unknown';

interface StoreStatusWithActivity {
  peerID: string;
  claimed: boolean;
  storeType: string;
  name?: string;
  isOwner?: boolean;
  activityLevel: ActivityLevel;
}

interface UseStoreActivityResult {
  activityLevel: ActivityLevel | null;
  isLoading: boolean;
}

/**
 * Fetches the store's activity level from the hosting platform API.
 * Returns null while loading or if the fetch fails (badge simply won't render).
 *
 * Thresholds (server-side):
 *   active          — last activity < 24h
 *   recently_active — < 7 days
 *   idle            — < 30 days
 *   inactive        — > 30 days
 *   unknown         — no data
 */
export function useStoreActivity(peerID: string | null): UseStoreActivityResult {
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!peerID) {
      setActivityLevel(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const status = await hostingGet<StoreStatusWithActivity>(HOSTING_API.STORES_STATUS(peerID));
        if (!cancelled) {
          setActivityLevel(status.activityLevel ?? 'unknown');
        }
      } catch {
        if (!cancelled) {
          setActivityLevel(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peerID]);

  return { activityLevel, isLoading };
}
