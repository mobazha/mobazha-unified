'use client';

import React, { useEffect, useState } from 'react';
import { StorefrontContext } from '@mobazha/core';
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

  useEffect(() => {
    if (!peerID) return;
    let cancelled = false;
    getProfile(peerID).then(p => {
      if (!cancelled) setStoreProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, [peerID]);

  const value = React.useMemo(
    () => ({ peerID, isStorefront: !!peerID, storeProfile }),
    [peerID, storeProfile]
  );
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}
