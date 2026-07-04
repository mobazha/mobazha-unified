// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { useCallback, useEffect, useRef, useState } from 'react';
import { collectiblesApi } from '../services/api/collectibles';
import * as collectibleRequests from '../services/api/collectibles';
import { shouldPollCollectiblePrimarySale } from '../collectibles/primarySale';
import { shouldPollCollectibleRedemption } from '../collectibles/redemption';
import type {
  CollectibleNFT,
  CollectiblePrimarySale,
  CollectibleRedemption,
  CollectibleSourceDeposit,
  CollectiblesPagedResult,
} from '../collectibles/types';

const DEFAULT_PRIMARY_SALE_POLL_MS = 8_000;
const DEFAULT_REDEMPTION_POLL_MS = 10_000;

export interface CollectibleActions {
  createCollectibleWalletChallenge: typeof collectibleRequests.createCollectibleWalletChallenge;
  getCollectibleRedemption: typeof collectibleRequests.getCollectibleRedemption;
  listCollectibleHubSlots: typeof collectibleRequests.listCollectibleHubSlots;
  listCollectibleSourceDeposits: typeof collectibleRequests.listCollectibleSourceDeposits;
  createCollectibleSourceDeposit: typeof collectibleRequests.createCollectibleSourceDeposit;
  approveCollectibleSourceDeposit: typeof collectibleRequests.approveCollectibleSourceDeposit;
  rejectCollectibleSourceDeposit: typeof collectibleRequests.rejectCollectibleSourceDeposit;
  mintCollectibleSourceDeposit: typeof collectibleRequests.mintCollectibleSourceDeposit;
  recordCollectibleSourceDepositFirstSale: typeof collectibleRequests.recordCollectibleSourceDepositFirstSale;
  shipCollectibleSourceDeposit: typeof collectibleRequests.shipCollectibleSourceDeposit;
  settleCollectibleSourceDeposit: typeof collectibleRequests.settleCollectibleSourceDeposit;
  defaultCollectibleSourceDeposit: typeof collectibleRequests.defaultCollectibleSourceDeposit;
  intakeCollectibleHubSlot: typeof collectibleRequests.intakeCollectibleHubSlot;
  listCollectibleHubRedemptions: typeof collectibleRequests.listCollectibleHubRedemptions;
  listCollectiblePrimarySaleReleaseQueue: typeof collectibleRequests.listCollectiblePrimarySaleReleaseQueue;
  retryCollectiblePrimarySaleReleases: typeof collectibleRequests.retryCollectiblePrimarySaleReleases;
  mintCollectibleHubSlot: typeof collectibleRequests.mintCollectibleHubSlot;
  rejectCollectibleHubSlot: typeof collectibleRequests.rejectCollectibleHubSlot;
  shipCollectibleRedemption: typeof collectibleRequests.shipCollectibleRedemption;
  settleCollectibleRedemption: typeof collectibleRequests.settleCollectibleRedemption;
  recoverCollectiblePendingMints: typeof collectibleRequests.recoverCollectiblePendingMints;
  bindCollectibleWallet: typeof collectibleRequests.bindCollectibleWallet;
  buildCollectibleBurnTx: typeof collectibleRequests.buildCollectibleBurnTx;
  buildCollectibleTransferTx: typeof collectibleRequests.buildCollectibleTransferTx;
  createCollectibleRedemption: typeof collectibleRequests.createCollectibleRedemption;
  listMyCollectibleSourceDeposits: typeof collectibleRequests.listMyCollectibleSourceDeposits;
  submitMyCollectibleSourceDeposit: typeof collectibleRequests.submitMyCollectibleSourceDeposit;
  shipMyCollectibleSourceDeposit: typeof collectibleRequests.shipMyCollectibleSourceDeposit;
}

const collectibleActions: CollectibleActions = {
  createCollectibleWalletChallenge: collectibleRequests.createCollectibleWalletChallenge,
  getCollectibleRedemption: collectibleRequests.getCollectibleRedemption,
  listCollectibleHubSlots: collectibleRequests.listCollectibleHubSlots,
  listCollectibleSourceDeposits: collectibleRequests.listCollectibleSourceDeposits,
  createCollectibleSourceDeposit: collectibleRequests.createCollectibleSourceDeposit,
  approveCollectibleSourceDeposit: collectibleRequests.approveCollectibleSourceDeposit,
  rejectCollectibleSourceDeposit: collectibleRequests.rejectCollectibleSourceDeposit,
  mintCollectibleSourceDeposit: collectibleRequests.mintCollectibleSourceDeposit,
  recordCollectibleSourceDepositFirstSale:
    collectibleRequests.recordCollectibleSourceDepositFirstSale,
  shipCollectibleSourceDeposit: collectibleRequests.shipCollectibleSourceDeposit,
  settleCollectibleSourceDeposit: collectibleRequests.settleCollectibleSourceDeposit,
  defaultCollectibleSourceDeposit: collectibleRequests.defaultCollectibleSourceDeposit,
  intakeCollectibleHubSlot: collectibleRequests.intakeCollectibleHubSlot,
  listCollectibleHubRedemptions: collectibleRequests.listCollectibleHubRedemptions,
  listCollectiblePrimarySaleReleaseQueue:
    collectibleRequests.listCollectiblePrimarySaleReleaseQueue,
  retryCollectiblePrimarySaleReleases: collectibleRequests.retryCollectiblePrimarySaleReleases,
  mintCollectibleHubSlot: collectibleRequests.mintCollectibleHubSlot,
  rejectCollectibleHubSlot: collectibleRequests.rejectCollectibleHubSlot,
  shipCollectibleRedemption: collectibleRequests.shipCollectibleRedemption,
  settleCollectibleRedemption: collectibleRequests.settleCollectibleRedemption,
  recoverCollectiblePendingMints: collectibleRequests.recoverCollectiblePendingMints,
  bindCollectibleWallet: collectibleRequests.bindCollectibleWallet,
  buildCollectibleBurnTx: collectibleRequests.buildCollectibleBurnTx,
  buildCollectibleTransferTx: collectibleRequests.buildCollectibleTransferTx,
  createCollectibleRedemption: collectibleRequests.createCollectibleRedemption,
  listMyCollectibleSourceDeposits: collectibleRequests.listMyCollectibleSourceDeposits,
  submitMyCollectibleSourceDeposit: collectibleRequests.submitMyCollectibleSourceDeposit,
  shipMyCollectibleSourceDeposit: collectibleRequests.shipMyCollectibleSourceDeposit,
};

/** Stable mutation/query commands for UI orchestration without exposing API modules to components. */
export function useCollectibleActions(): CollectibleActions {
  return collectibleActions;
}

export interface UseCollectibleQueryOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
}

function normalizeEnabled(enabledOrOptions?: boolean | UseCollectibleQueryOptions): {
  enabled: boolean;
  pollIntervalMs?: number;
} {
  if (typeof enabledOrOptions === 'boolean') {
    return { enabled: enabledOrOptions };
  }
  return {
    enabled: enabledOrOptions?.enabled ?? true,
    pollIntervalMs: enabledOrOptions?.pollIntervalMs,
  };
}

/** Interval self-clears once shouldPoll() returns false. */
function useCollectibleStatusPolling(
  enabled: boolean,
  resourceId: string | undefined,
  intervalMs: number,
  shouldPoll: () => boolean,
  pollFetch: () => Promise<void>
) {
  useEffect(() => {
    if (!enabled || !resourceId?.trim() || typeof window === 'undefined') {
      return;
    }

    let intervalId: number | undefined;

    const tick = () => {
      if (!shouldPoll()) {
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
        return;
      }
      void pollFetch();
    };

    intervalId = window.setInterval(tick, intervalMs);
    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled, intervalMs, pollFetch, resourceId, shouldPoll]);
}

export interface UseCollectibleNFTsOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useCollectibleNFTs(options: UseCollectibleNFTsOptions = {}) {
  const { page = 1, pageSize = 20, enabled = true } = options;
  const [data, setData] = useState<CollectiblesPagedResult<CollectibleNFT> | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await collectiblesApi.listNFTs({ page, pageSize });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, page, pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, items: data?.items ?? [], meta: data?.meta, loading, error, refresh };
}

export function useCollectibleNFT(mint: string | undefined, enabled = true) {
  const [nft, setNft] = useState<CollectibleNFT | null>(null);
  const [loading, setLoading] = useState(!!mint && enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!mint?.trim() || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await collectiblesApi.getNFT(mint.trim());
      setNft(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setNft(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, mint]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { nft, loading, error, refresh };
}

export function useCollectiblePrimarySale(
  orderId: string | undefined,
  enabledOrOptions: boolean | UseCollectibleQueryOptions = true
) {
  const { enabled, pollIntervalMs } = normalizeEnabled(enabledOrOptions);
  const intervalMs = pollIntervalMs ?? DEFAULT_PRIMARY_SALE_POLL_MS;
  const [primarySale, setPrimarySale] = useState<CollectiblePrimarySale | null>(null);
  const [loading, setLoading] = useState(!!orderId?.trim() && enabled);
  const [error, setError] = useState<Error | null>(null);
  const primarySaleRef = useRef(primarySale);
  primarySaleRef.current = primarySale;

  const fetchPrimarySale = useCallback(
    async (opts?: { silent?: boolean }) => {
      const trimmed = orderId?.trim();
      if (!trimmed || !enabled) {
        setPrimarySale(null);
        setLoading(false);
        setError(null);
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await collectiblesApi.getPrimarySaleByOrder(trimmed);
        setPrimarySale(result);
        if (!opts?.silent) {
          setError(null);
        }
      } catch (err) {
        if (!opts?.silent) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setPrimarySale(null);
        }
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [enabled, orderId]
  );

  const refresh = useCallback(async () => {
    await fetchPrimarySale();
  }, [fetchPrimarySale]);

  const pollPrimarySale = useCallback(async () => {
    await fetchPrimarySale({ silent: true });
  }, [fetchPrimarySale]);

  const shouldPollPrimarySale = useCallback(
    () => shouldPollCollectiblePrimarySale(primarySaleRef.current),
    []
  );

  useEffect(() => {
    void fetchPrimarySale();
  }, [fetchPrimarySale]);

  useCollectibleStatusPolling(enabled, orderId, intervalMs, shouldPollPrimarySale, pollPrimarySale);

  return { primarySale, loading, error, refresh };
}

export function useCollectibleRedemption(
  redemptionId: string | undefined,
  enabledOrOptions: boolean | UseCollectibleQueryOptions = true
) {
  const { enabled, pollIntervalMs } = normalizeEnabled(enabledOrOptions);
  const intervalMs = pollIntervalMs ?? DEFAULT_REDEMPTION_POLL_MS;
  const [redemption, setRedemption] = useState<CollectibleRedemption | null>(null);
  const [loading, setLoading] = useState(!!redemptionId?.trim() && enabled);
  const [error, setError] = useState<Error | null>(null);
  const redemptionRef = useRef(redemption);
  redemptionRef.current = redemption;

  const fetchRedemption = useCallback(
    async (opts?: { silent?: boolean }) => {
      const trimmed = redemptionId?.trim();
      if (!trimmed || !enabled) {
        setRedemption(null);
        setLoading(false);
        setError(null);
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await collectiblesApi.getRedemption(trimmed);
        setRedemption(result);
        if (!opts?.silent) {
          setError(null);
        }
      } catch (err) {
        if (!opts?.silent) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setRedemption(null);
        }
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [enabled, redemptionId]
  );

  const refresh = useCallback(async () => {
    await fetchRedemption();
  }, [fetchRedemption]);

  const pollRedemption = useCallback(async () => {
    await fetchRedemption({ silent: true });
  }, [fetchRedemption]);

  const shouldPollRedemption = useCallback(
    () => shouldPollCollectibleRedemption(redemptionRef.current),
    []
  );

  useEffect(() => {
    void fetchRedemption();
  }, [fetchRedemption]);

  useCollectibleStatusPolling(
    enabled,
    redemptionId,
    intervalMs,
    shouldPollRedemption,
    pollRedemption
  );

  return { redemption, loading, error, refresh };
}

export function useMyCollectibleSourceDeposits(
  options: { page?: number; pageSize?: number; status?: string; enabled?: boolean } = {}
) {
  const { page = 1, pageSize = 20, status, enabled = true } = options;
  const [data, setData] = useState<CollectiblesPagedResult<CollectibleSourceDeposit> | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await collectiblesApi.listMySourceDeposits({
        page,
        pageSize,
        status: status?.trim() || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, page, pageSize, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, items: data?.items ?? [], meta: data?.meta, loading, error, refresh };
}

export interface UseCollectibleRedemptionsOptions {
  page?: number;
  pageSize?: number;
  nftMint?: string;
  status?: string;
  enabled?: boolean;
}

export function useCollectibleRedemptions(options: UseCollectibleRedemptionsOptions = {}) {
  const { page = 1, pageSize = 20, nftMint, status, enabled = true } = options;
  const [data, setData] = useState<CollectiblesPagedResult<CollectibleRedemption> | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await collectiblesApi.listRedemptions({
        page,
        pageSize,
        nftMint: nftMint?.trim() || undefined,
        status: status?.trim() || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, nftMint, page, pageSize, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, items: data?.items ?? [], meta: data?.meta, loading, error, refresh };
}

/** Lookup a single redemption for the current user by NFT mint (e.g. after burn). */
export function useCollectibleRedemptionByMint(nftMint: string | undefined, enabled = true) {
  const { items, loading, error, refresh } = useCollectibleRedemptions({
    nftMint,
    page: 1,
    pageSize: 1,
    enabled: enabled && !!nftMint?.trim(),
  });
  return { redemption: items[0] ?? null, loading, error, refresh };
}
