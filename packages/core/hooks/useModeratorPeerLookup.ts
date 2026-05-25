'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as moderatorsApi from '../services/api/moderators';
import type { Moderator as ApiModerator } from '../services/api/moderators';
import { isFullPeerID } from '../utils/identity';

export type ModeratorPeerLookupStatus =
  | 'idle'
  | 'loading'
  | 'found'
  | 'truncated'
  | 'not_found'
  | 'not_moderator';

export interface UseModeratorPeerLookupOptions {
  /** When false, clears state and skips network lookup. */
  enabled?: boolean;
  debounceMs?: number;
}

export function useModeratorPeerLookup(
  peerIDInput: string,
  options: UseModeratorPeerLookupOptions = {}
) {
  const { enabled = true, debounceMs = 400 } = options;
  const trimmedPeerID = peerIDInput.trim();
  const canLookup = enabled && Boolean(trimmedPeerID) && isFullPeerID(trimmedPeerID);
  const [lookupState, setLookupState] = useState<{
    peerID: string;
    status: Exclude<ModeratorPeerLookupStatus, 'idle' | 'loading' | 'truncated'>;
    moderator: ApiModerator | null;
  }>({
    peerID: '',
    status: 'not_found',
    moderator: null,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!canLookup) return;

    let cancelled = false;
    timerRef.current = setTimeout(async () => {
      const result = await moderatorsApi.lookupModeratorCandidate(trimmedPeerID);
      if (cancelled) return;

      if (result.status === 'found') {
        setLookupState({
          peerID: trimmedPeerID,
          status: 'found',
          moderator: result.moderator,
        });
        return;
      }
      if (result.status === 'not_moderator') {
        setLookupState({
          peerID: trimmedPeerID,
          status: 'not_moderator',
          moderator: null,
        });
        return;
      }
      setLookupState({
        peerID: trimmedPeerID,
        status: 'not_found',
        moderator: null,
      });
    }, debounceMs);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [canLookup, trimmedPeerID, debounceMs]);

  const { status, moderator } = useMemo(() => {
    if (!enabled || !trimmedPeerID) {
      return { status: 'idle' as const, moderator: null };
    }
    if (!isFullPeerID(trimmedPeerID)) {
      return { status: 'truncated' as const, moderator: null };
    }
    if (lookupState.peerID !== trimmedPeerID) {
      return { status: 'loading' as const, moderator: null };
    }
    return {
      status: lookupState.status,
      moderator: lookupState.moderator,
    };
  }, [enabled, trimmedPeerID, lookupState]);

  return {
    status,
    moderator,
    isLoading: status === 'loading',
    isReady: status === 'found' && moderator !== null,
  };
}
