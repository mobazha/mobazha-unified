'use client';

import React, { useEffect, useState } from 'react';
import { StorefrontContext, isStandalone } from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';
import { getProfile } from '@mobazha/core/services/api/profile';

export function StorefrontProvider({
  peerID,
  children,
}: {
  peerID: string | null;
  children: React.ReactNode;
}) {
  const [storeProfile, setStoreProfile] = useState<UserProfile | null>(null);
  const [resolvedPeerID, setResolvedPeerID] = useState<string | null>(peerID);
  const standalone = isStandalone();

  useEffect(() => {
    setResolvedPeerID(peerID);
  }, [peerID]);

  useEffect(() => {
    if (!peerID && !standalone) return;
    let cancelled = false;
    getProfile(peerID || undefined).then(p => {
      if (!cancelled) {
        setStoreProfile(p);
        if (!peerID && standalone && p?.peerID) {
          setResolvedPeerID(p.peerID);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [peerID, standalone]);

  const isStorefront = !!resolvedPeerID || standalone;
  const value = React.useMemo(
    () => ({ peerID: resolvedPeerID, isStorefront, storeProfile }),
    [resolvedPeerID, isStorefront, storeProfile]
  );
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}
