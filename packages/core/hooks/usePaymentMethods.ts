'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  filterVisibleAcceptedCurrencies,
  isFiatPaymentVisible,
} from '../config/paymentMethodVisibility';
import * as fiatApi from '../services/api/fiat';
import type { FiatProviderInfo } from '../types/fiat';

interface UsePaymentMethodsResult {
  crypto: string[];
  fiat: FiatProviderInfo[];
  activeFiat: FiatProviderInfo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasActiveProvider: (providerID: string) => boolean;
}

/**
 * Fetches all accepted payment methods (crypto + fiat) for a seller.
 * Used in buyer checkout flow. Falls back gracefully on error.
 */
export function usePaymentMethods(vendorPeerID?: string): UsePaymentMethodsResult {
  const [crypto, setCrypto] = useState<string[]>([]);
  const [fiat, setFiat] = useState<FiatProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    if (!vendorPeerID) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fiatApi.getPaymentMethods(vendorPeerID);
      setCrypto(data.crypto);
      setFiat(data.fiat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
      setCrypto([]);
      setFiat([]);
    } finally {
      setIsLoading(false);
    }
  }, [vendorPeerID]);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const activeFiat = useMemo(() => {
    if (!isFiatPaymentVisible()) return [];
    return fiat.filter(p => p.status === 'active' || p.status === 'restricted');
  }, [fiat]);

  const visibleCrypto = useMemo(() => filterVisibleAcceptedCurrencies(crypto), [crypto]);

  const hasActiveProvider = useCallback(
    (providerID: string) => activeFiat.some(p => p.providerID === providerID),
    [activeFiat]
  );

  return {
    crypto: visibleCrypto,
    fiat: isFiatPaymentVisible() ? fiat : [],
    activeFiat,
    isLoading,
    error,
    refetch: fetchMethods,
    hasActiveProvider,
  };
}
