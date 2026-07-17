// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { batchGetProfileDisplayInfo, type ProfileDisplayInfo } from '@mobazha/core';

/**
 * Resolves peer IDs to display profiles (name + avatar) through the global
 * profile cache, so affiliate surfaces can show "who" instead of a bare hash.
 * Unresolvable peers are simply absent from the map — callers fall back to a
 * truncated peer ID.
 */
export function usePeerDisplayProfiles(peerIDs: string[]): Map<string, ProfileDisplayInfo> {
  const [profiles, setProfiles] = useState<Map<string, ProfileDisplayInfo>>(() => new Map());
  // A stable key avoids refetch loops when callers rebuild the array each render.
  const key = useMemo(
    () =>
      Array.from(new Set(peerIDs.filter(Boolean)))
        .sort()
        .join(','),
    [peerIDs]
  );

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void batchGetProfileDisplayInfo(key.split(',')).then(map => {
      if (!cancelled && map.size) setProfiles(map);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return profiles;
}
