'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { isFiatPaymentVisible } from '../config/paymentMethodVisibility';
import * as fiatApi from '../services/api/fiat';
import type { FiatProviderInfo } from '../types/fiat';

interface UseFiatProvidersResult {
  providers: FiatProviderInfo[];
  activeProviders: FiatProviderInfo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasActiveProvider: (providerID: string) => boolean;
}

/**
 * Fetches available fiat payment providers for a seller.
 * Pass vendorPeerID when browsing as a buyer; omit for seller's own config.
 */
export function useFiatProviders(vendorPeerID?: string): UseFiatProvidersResult {
  const [providers, setProviders] = useState<FiatProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fiatApi.getProviders(vendorPeerID);
      setProviders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment providers');
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, [vendorPeerID]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const visibleProviders = useMemo(() => (isFiatPaymentVisible() ? providers : []), [providers]);

  const activeProviders = useMemo(
    () => visibleProviders.filter(p => p.status === 'active' || p.status === 'restricted'),
    [visibleProviders]
  );

  const hasActiveProvider = useCallback(
    (providerID: string) => activeProviders.some(p => p.providerID === providerID),
    [activeProviders]
  );

  return {
    providers: visibleProviders,
    activeProviders,
    isLoading,
    error,
    refetch: fetchProviders,
    hasActiveProvider,
  };
}
