'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NativeMarketplaceSellerApplication,
  PublicNativeMarketplace,
} from '../types/marketplace';
import {
  applyToNativeMarketplace,
  getNativeMarketplaceSellerApplication,
  getPublicMarketplaceDetail,
  withdrawNativeMarketplaceSellerApplication,
} from '../services/api/marketplace';

export function useNativeMarketplaceSell(identifier?: string) {
  const [marketplace, setMarketplace] = useState<PublicNativeMarketplace | null>(null);
  const [application, setApplication] = useState<NativeMarketplaceSellerApplication | null>(null);
  const [loading, setLoading] = useState(Boolean(identifier));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  const load = useCallback(async () => {
    if (!identifier) {
      loadGenerationRef.current += 1;
      setMarketplace(null);
      setApplication(null);
      setLoading(false);
      setError(null);
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;

    setMarketplace(null);
    setApplication(null);
    setLoading(true);
    setError(null);

    const isStale = () => generation !== loadGenerationRef.current;

    try {
      const detail = await getPublicMarketplaceDetail(identifier, { pageSize: 1 });
      if (isStale()) return;

      setMarketplace(detail.marketplace);

      try {
        const app = await getNativeMarketplaceSellerApplication(identifier);
        if (isStale()) return;
        setApplication(app);
      } catch (err) {
        if (isStale()) return;
        setError(err instanceof Error ? err.message : 'Failed to load seller application');
        setApplication(null);
      }
    } catch (err) {
      if (isStale()) return;
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
      setMarketplace(null);
      setApplication(null);
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  }, [identifier]);

  useEffect(() => {
    void load();
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [load]);

  const submitApplication = useCallback(
    async (productGroupIDs: number[]) => {
      if (!identifier) {
        throw new Error('Marketplace identifier is required');
      }
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const app = await applyToNativeMarketplace(identifier, productGroupIDs);
        setApplication(app);
        return app;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit application';
        setSubmitError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [identifier]
  );

  const withdrawApplication = useCallback(async () => {
    if (!identifier) {
      throw new Error('Marketplace identifier is required');
    }
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      const app = await withdrawNativeMarketplaceSellerApplication(identifier);
      setApplication(app);
      return app;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to withdraw application';
      setWithdrawError(message);
      throw err;
    } finally {
      setIsWithdrawing(false);
    }
  }, [identifier]);

  return {
    marketplace,
    application,
    loading,
    error,
    isSubmitting,
    isWithdrawing,
    submitError,
    withdrawError,
    refresh: load,
    submitApplication,
    withdrawApplication,
  };
}
