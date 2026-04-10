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
  const standalone = isStandalone();

  useEffect(() => {
    if (!peerID && !standalone) return;
    let cancelled = false;
    getProfile(peerID || undefined).then(p => {
      if (!cancelled) setStoreProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, [peerID, standalone]);

  const isStorefront = !!peerID || standalone;
  const value = React.useMemo(
    () => ({ peerID, isStorefront, storeProfile }),
    [peerID, isStorefront, storeProfile]
  );
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}
