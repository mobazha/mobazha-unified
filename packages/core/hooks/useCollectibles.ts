import { useCallback, useEffect, useState } from 'react';
import { collectiblesApi } from '../services/api/collectibles';
import type { CollectibleNFT, CollectiblesPagedResult } from '../collectibles/types';

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
