'use client';

/**
 * useMiniAppRole — determines the user's role within a Mini App context.
 *
 * Returns:
 * - null      — not inside a Mini App (regular web browser)
 * - 'anonymous' — inside Mini App, not authenticated
 * - 'buyer'   — authenticated but not the store owner
 * - 'owner'   — authenticated and is the store owner
 *
 * Ownership is determined by calling the store status API which compares
 * the JWT sub (Casdoor user ID) against store_registry.owner_user_id.
 */

import { useState, useEffect, useCallback } from 'react';
import { HOSTING_API } from '../config/apiPaths';
import { hostingGet } from '../services/api/helpers';
import { getStorePeerID } from '../services/storeContext';
import { useUserStore } from '../stores/userStore';

export type MiniAppRole = 'owner' | 'buyer' | 'anonymous';

interface StoreStatusResponse {
  peerID: string;
  claimed: boolean;
  storeType: string;
  name?: string;
  isOwner?: boolean;
  activityLevel?: string;
}

interface UseMiniAppRoleResult {
  role: MiniAppRole | null;
  isLoading: boolean;
  storeClaimed: boolean | null;
  /** Re-fetch store status and update role (e.g. after claiming). */
  refetch: () => void;
}

export function useMiniAppRole(isMiniApp: boolean): UseMiniAppRoleResult {
  const { isAuthenticated, isAnonymousMiniAppUser } = useUserStore();
  const [role, setRole] = useState<MiniAppRole | null>(() => {
    if (!isMiniApp) return null;
    if (!isAuthenticated) return 'anonymous';
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [storeClaimed, setStoreClaimed] = useState<boolean | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!isMiniApp) {
      setRole(null);
      return;
    }

    if (!isAuthenticated) {
      setRole('anonymous');
      return;
    }

    const storePeerID = getStorePeerID();
    if (!storePeerID) {
      setRole('buyer');
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const status = await hostingGet<StoreStatusResponse>(
          HOSTING_API.STORES_STATUS(storePeerID)
        );

        if (cancelled) return;

        setStoreClaimed(status.claimed);

        if (status.isOwner) {
          setRole('owner');
        } else {
          setRole('buyer');
        }
      } catch {
        if (!cancelled) {
          setRole('buyer');
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
  }, [isMiniApp, isAuthenticated, isAnonymousMiniAppUser, fetchKey]);

  return { role, isLoading, storeClaimed, refetch };
}
