'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicNativeMarketplace, PublicNativeMarketplaceDetail } from '../types/marketplace';
import { getPublicMarketplaceDetail, getPublicMarketplaces } from '../services/api/marketplace';

export const PUBLIC_MARKETPLACE_DIRECTORY_PAGE_SIZE = 100;

export function usePublicMarketplaces(
  options: { vertical?: string; autoLoad?: boolean; pageSize?: number } = {}
) {
  const { vertical, autoLoad = true, pageSize = PUBLIC_MARKETPLACE_DIRECTORY_PAGE_SIZE } = options;
  const [marketplaces, setMarketplaces] = useState<PublicNativeMarketplace[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const loadMarketplaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPublicMarketplaces({ vertical, pageSize });
      setMarketplaces(result.marketplaces ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplaces');
      setMarketplaces([]);
    } finally {
      setLoading(false);
    }
  }, [vertical, pageSize]);

  useEffect(() => {
    if (autoLoad) {
      void loadMarketplaces();
    }
  }, [autoLoad, loadMarketplaces]);

  return {
    marketplaces,
    loading,
    error,
    refresh: loadMarketplaces,
  };
}

export function usePublicMarketplaceDetail(identifier?: string) {
  const [detail, setDetail] = useState<PublicNativeMarketplaceDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(identifier));
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!identifier) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPublicMarketplaceDetail(identifier, { pageSize: 24 });
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  return {
    detail,
    loading,
    error,
    refresh: loadDetail,
  };
}
