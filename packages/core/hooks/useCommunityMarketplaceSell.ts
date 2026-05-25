'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  PublicGroupMarketplace,
  PublicMarketplaceSellerApplication,
} from '../types/marketplace';
import {
  applyAsPublicMarketplaceSeller,
  getPublicGroupMarketplaceDetail,
  getPublicMarketplaceSellerApplication,
} from '../services/api/marketplace';

export function useCommunityMarketplaceSell(identifier?: string) {
  const [marketplace, setMarketplace] = useState<PublicGroupMarketplace | null>(null);
  const [application, setApplication] = useState<PublicMarketplaceSellerApplication | null>(null);
  const [loading, setLoading] = useState(Boolean(identifier));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!identifier) {
      setMarketplace(null);
      setApplication(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await getPublicGroupMarketplaceDetail(identifier, { pageSize: 1 });
      setMarketplace(detail.marketplace);

      try {
        const app = await getPublicMarketplaceSellerApplication(identifier);
        setApplication(app);
      } catch {
        // 未登录或 token 无效时不阻断市场信息与申请表单
        setApplication(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
      setMarketplace(null);
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitApplication = useCallback(
    async (productGroupIDs: number[]) => {
      if (!identifier) {
        throw new Error('Marketplace identifier is required');
      }
      await applyAsPublicMarketplaceSeller(identifier, productGroupIDs);
      const app = await getPublicMarketplaceSellerApplication(identifier);
      setApplication(app);
    },
    [identifier]
  );

  return {
    marketplace,
    application,
    loading,
    error,
    refresh: load,
    submitApplication,
  };
}
