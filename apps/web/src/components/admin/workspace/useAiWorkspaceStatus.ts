'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { aiSettingsApi, type AIStatus } from '@mobazha/core';

type AiWorkspaceStatusSnapshot = {
  status: AIStatus | null;
  loading: boolean;
  available: boolean;
};

const SERVER_SNAPSHOT: AiWorkspaceStatusSnapshot = {
  status: null,
  loading: true,
  available: false,
};

let cachedStatus: AIStatus | null = null;
let cachedLoading = true;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

let snapshot: AiWorkspaceStatusSnapshot = { ...SERVER_SNAPSHOT };

function syncSnapshot() {
  const available = cachedStatus?.available ?? false;
  if (
    snapshot.status === cachedStatus &&
    snapshot.loading === cachedLoading &&
    snapshot.available === available
  ) {
    return;
  }
  snapshot = {
    status: cachedStatus,
    loading: cachedLoading,
    available,
  };
}

function notify() {
  syncSnapshot();
  listeners.forEach(listener => listener());
}

function ensureAiStatusFetch() {
  if (inflight) return inflight;

  inflight = aiSettingsApi
    .getAIStatus()
    .then(s => {
      cachedStatus = s;
    })
    .catch(() => {
      cachedStatus = null;
    })
    .finally(() => {
      cachedLoading = false;
      inflight = null;
      notify();
    });

  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AiWorkspaceStatusSnapshot {
  return snapshot;
}

function getServerSnapshot(): AiWorkspaceStatusSnapshot {
  return SERVER_SNAPSHOT;
}

/** Shared AI status — one in-flight request per page load across all consumers. */
export function useAiWorkspaceStatus(): AiWorkspaceStatusSnapshot {
  useEffect(() => {
    ensureAiStatusFetch();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
