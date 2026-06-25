import { useCallback, useEffect, useState } from 'react';
import { collectiblesApi } from '../services/api/collectibles';
import type {
  CollectibleNFT,
  CollectiblePrimarySale,
  CollectibleRedemption,
  CollectiblesPagedResult,
} from '../collectibles/types';

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

export function useCollectiblePrimarySale(orderId: string | undefined, enabled = true) {
  const [primarySale, setPrimarySale] = useState<CollectiblePrimarySale | null>(null);
  const [loading, setLoading] = useState(!!orderId?.trim() && enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    const trimmed = orderId?.trim();
    if (!trimmed || !enabled) {
      setPrimarySale(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await collectiblesApi.getPrimarySaleByOrder(trimmed);
      setPrimarySale(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setPrimarySale(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { primarySale, loading, error, refresh };
}

export function useCollectibleRedemption(redemptionId: string | undefined, enabled = true) {
  const [redemption, setRedemption] = useState<CollectibleRedemption | null>(null);
  const [loading, setLoading] = useState(!!redemptionId?.trim() && enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    const trimmed = redemptionId?.trim();
    if (!trimmed || !enabled) {
      setRedemption(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await collectiblesApi.getRedemption(trimmed);
      setRedemption(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setRedemption(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, redemptionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { redemption, loading, error, refresh };
}
