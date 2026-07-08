// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import type { DealCommissionStatementAudience } from '../types/dealCommissionStatement';
import type { UseDealCommissionStatementsReturn } from './useDealCommissionStatements';

type Listener = () => void;

interface AudienceStore extends UseDealCommissionStatementsReturn {
  listeners: Set<Listener>;
  inFlight: Promise<void> | null;
  loadGeneration: number;
  cachedSnapshot: UseDealCommissionStatementsReturn | null;
}

const stores = new Map<DealCommissionStatementAudience, AudienceStore>();

function createStore(): AudienceStore {
  return {
    statements: [],
    loading: false,
    error: null,
    reload: async () => {},
    listeners: new Set(),
    inFlight: null,
    loadGeneration: 0,
    cachedSnapshot: null,
  };
}

function getStore(audience: DealCommissionStatementAudience): AudienceStore {
  const existing = stores.get(audience);
  if (existing) return existing;
  const created = createStore();
  stores.set(audience, created);
  return created;
}

function publishSnapshot(store: AudienceStore): UseDealCommissionStatementsReturn {
  store.cachedSnapshot = {
    statements: store.statements,
    loading: store.loading,
    error: store.error,
    reload: store.reload,
  };
  return store.cachedSnapshot;
}

function notify(store: AudienceStore) {
  publishSnapshot(store);
  store.listeners.forEach(listener => listener());
}

export function subscribeDealCommissionStatements(
  audience: DealCommissionStatementAudience,
  listener: Listener
): () => void {
  const store = getStore(audience);
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function getDealCommissionStatementsSnapshot(
  audience: DealCommissionStatementAudience
): UseDealCommissionStatementsReturn {
  const store = getStore(audience);
  return store.cachedSnapshot ?? publishSnapshot(store);
}

export function setDealCommissionStatementsReload(
  audience: DealCommissionStatementAudience,
  reload: () => Promise<void>
): void {
  getStore(audience).reload = reload;
}

export async function loadDealCommissionStatements(
  audience: DealCommissionStatementAudience,
  loader: () => Promise<UseDealCommissionStatementsReturn['statements']>,
  options?: { force?: boolean }
): Promise<void> {
  const store = getStore(audience);
  if (store.inFlight && !options?.force) {
    await store.inFlight;
    return;
  }

  store.loading = true;
  store.error = null;
  notify(store);

  const generation = ++store.loadGeneration;
  store.inFlight = (async () => {
    try {
      const statements = await loader();
      if (generation !== store.loadGeneration) return;
      store.statements = statements;
    } catch (err) {
      if (generation !== store.loadGeneration) return;
      store.statements = [];
      store.error = err instanceof Error ? err.message : 'load_failed';
    } finally {
      if (generation === store.loadGeneration) {
        store.loading = false;
        store.inFlight = null;
        notify(store);
      }
    }
  })();

  await store.inFlight;
}

/** Test helper — reset module cache between unit tests. */
export function resetDealCommissionStatementsStoreForTests(): void {
  stores.clear();
}
