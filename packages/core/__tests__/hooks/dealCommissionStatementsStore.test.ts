// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getDealCommissionStatementsSnapshot,
  loadDealCommissionStatements,
  resetDealCommissionStatementsStoreForTests,
  setDealCommissionStatementsReload,
  subscribeDealCommissionStatements,
} from '../../hooks/dealCommissionStatementsStore';

describe('dealCommissionStatementsStore', () => {
  afterEach(() => {
    resetDealCommissionStatementsStoreForTests();
  });

  it('deduplicates concurrent loads for the same audience', async () => {
    const loader = vi.fn(async () => [{ id: 'stmt-1' } as never]);
    const notify = vi.fn();

    subscribeDealCommissionStatements('seller', notify);

    await Promise.all([
      loadDealCommissionStatements('seller', loader),
      loadDealCommissionStatements('seller', loader),
    ]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(getDealCommissionStatementsSnapshot('seller').statements).toEqual([{ id: 'stmt-1' }]);
    expect(notify).toHaveBeenCalled();
  });

  it('force reload bypasses in-flight deduplication', async () => {
    let resolveFirst: (() => void) | undefined;
    const first = new Promise<never[]>(resolve => {
      resolveFirst = () => resolve([{ id: 'first' } as never]);
    });
    const loader = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce([{ id: 'second' } as never]);

    const pending = loadDealCommissionStatements('seller', loader);
    const forced = loadDealCommissionStatements('seller', loader, { force: true });

    resolveFirst?.();
    await pending;
    await forced;

    expect(loader).toHaveBeenCalledTimes(2);
    expect(getDealCommissionStatementsSnapshot('seller').statements).toEqual([{ id: 'second' }]);
  });

  it('stores loader errors and clears statements', async () => {
    const loader = vi.fn(async () => {
      throw new Error('network_failed');
    });

    await loadDealCommissionStatements('seller', loader);

    const snapshot = getDealCommissionStatementsSnapshot('seller');
    expect(snapshot.statements).toEqual([]);
    expect(snapshot.error).toBe('network_failed');
    expect(snapshot.loading).toBe(false);
  });

  it('isolates audiences into separate stores', async () => {
    const sellerLoader = vi.fn(async () => [{ id: 'seller-stmt' } as never]);
    const promoterLoader = vi.fn(async () => [{ id: 'promoter-stmt' } as never]);

    await loadDealCommissionStatements('seller', sellerLoader);
    await loadDealCommissionStatements('promoter', promoterLoader);

    expect(getDealCommissionStatementsSnapshot('seller').statements).toEqual([
      { id: 'seller-stmt' },
    ]);
    expect(getDealCommissionStatementsSnapshot('promoter').statements).toEqual([
      { id: 'promoter-stmt' },
    ]);
  });

  it('wires reload through setDealCommissionStatementsReload', async () => {
    const reload = vi.fn(async () => {});
    setDealCommissionStatementsReload('seller', reload);

    await getDealCommissionStatementsSnapshot('seller').reload();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('returns a stable snapshot reference between publishes', () => {
    const first = getDealCommissionStatementsSnapshot('seller');
    const second = getDealCommissionStatementsSnapshot('seller');

    expect(first).toBe(second);
  });
});
