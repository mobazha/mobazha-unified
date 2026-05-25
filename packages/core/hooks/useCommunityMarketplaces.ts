'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicGroupMarketplace, PublicGroupMarketplaceDetail } from '../types/marketplace';
import {
  getPublicGroupMarketplaceDetail,
  getPublicGroupMarketplaces,
} from '../services/api/marketplace';

export function useCommunityMarketplaces(options: { platform?: string; autoLoad?: boolean } = {}) {
  const { platform, autoLoad = true } = options;
  const [marketplaces, setMarketplaces] = useState<PublicGroupMarketplace[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const loadMarketplaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPublicGroupMarketplaces({ platform });
      setMarketplaces(result.groups ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load community marketplaces');
      setMarketplaces([]);
    } finally {
      setLoading(false);
    }
  }, [platform]);

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

export function useCommunityMarketplaceDetail(identifier?: string) {
  const [detail, setDetail] = useState<PublicGroupMarketplaceDetail | null>(null);
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
      const result = await getPublicGroupMarketplaceDetail(identifier, { pageSize: 24 });
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load community marketplace');
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
