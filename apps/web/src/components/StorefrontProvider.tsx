'use client';

import React, { useEffect, useState } from 'react';
import { StorefrontContext, isStandalone, routedStoreContextService } from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';
import { getProfile } from '@mobazha/core/services/api/profile';

interface StoreProfileResult {
  requestKey: string;
  profile: UserProfile | null;
}

export function StorefrontProvider({
  peerID,
  children,
}: {
  peerID: string | null;
  children: React.ReactNode;
}) {
  const standalone = isStandalone();
  const storeRouteToken =
    typeof window !== 'undefined' ? routedStoreContextService.getStoreRouteToken() : null;
  const profileRequestKey = `${storeRouteToken ? 'route' : 'peer'}:${storeRouteToken ?? peerID ?? ''}:${standalone}`;
  const [profileResult, setProfileResult] = useState<StoreProfileResult>({
    requestKey: '',
    profile: null,
  });

  useEffect(() => {
    if (!peerID && !standalone) return;
    let cancelled = false;
    // The Bridge already selected one store route. Its peerless
    // public profile endpoint reads the local store directly, while asking the
    // node for its own /profiles/{peerID} can incorrectly take the remote P2P
    // lookup path (and returned 500 on instance 003).
    getProfile(storeRouteToken ? undefined : peerID || undefined)
      .then(p => {
        if (!cancelled) {
          setProfileResult({ requestKey: profileRequestKey, profile: p });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfileResult({ requestKey: profileRequestKey, profile: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [peerID, profileRequestKey, standalone, storeRouteToken]);

  const storeProfile =
    profileResult.requestKey === profileRequestKey ? profileResult.profile : null;
  const storeProfileLoaded = profileResult.requestKey === profileRequestKey;
  const resolvedPeerID = peerID ?? (standalone ? (storeProfile?.peerID ?? null) : null);
  const isStorefront = !!resolvedPeerID || standalone;
  const value = React.useMemo(
    () => ({ peerID: resolvedPeerID, isStorefront, storeProfile, storeProfileLoaded }),
    [resolvedPeerID, isStorefront, storeProfile, storeProfileLoaded]
  );
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}
