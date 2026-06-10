/**
 * useRefundReceivingAddresses hook
 * Manages buyer default refund receiving addresses (per payment coin).
 */

import { useState, useCallback, useEffect } from 'react';
import { profileApi } from '../services/api';
import { resolveAccountDefaultRefundAddress } from '../utils/buyerRefundAddress';
import { useUserStore } from '../stores/userStore';

export type RefundReceivingAddressMap = Record<string, string>;

function cleanAddressMap(map: RefundReceivingAddressMap): RefundReceivingAddressMap {
  return Object.fromEntries(
    Object.entries(map)
      .map(([coin, addr]) => [coin.trim(), addr.trim()] as const)
      .filter(([coin, addr]) => coin && addr)
  );
}

export function useRefundReceivingAddresses() {
  const [addresses, setAddresses] = useState<RefundReceivingAddressMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const settings = await profileApi.getSettings();
      setAddresses(settings?.refundReceivingAddresses ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load refund addresses');
      setAddresses({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveAll = useCallback(async (next: RefundReceivingAddressMap) => {
    setIsSaving(true);
    setError(null);
    try {
      const cleaned = cleanAddressMap(next);
      const result = await profileApi.setSettings({ refundReceivingAddresses: cleaned });
      if (!result.success) {
        setError(result.error ?? 'Failed to save refund addresses');
        return false;
      }

      setAddresses(cleaned);
      useUserStore.setState(state => ({
        settings: { ...(state.settings ?? {}), refundReceivingAddresses: cleaned },
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save refund addresses');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const upsertAddress = useCallback(
    async (coin: string, address: string) => {
      const next = { ...addresses, [coin.trim()]: address.trim() };
      return saveAll(next);
    },
    [addresses, saveAll]
  );

  const removeAddress = useCallback(
    async (coin: string) => {
      const next = { ...addresses };
      delete next[coin.trim()];
      return saveAll(next);
    },
    [addresses, saveAll]
  );

  const resolveForCoin = useCallback(
    (paymentCoin: string | undefined) => resolveAccountDefaultRefundAddress(addresses, paymentCoin),
    [addresses]
  );

  return {
    addresses,
    isLoading,
    isSaving,
    error,
    reload: load,
    saveAll,
    upsertAddress,
    removeAddress,
    resolveForCoin,
  };
}

export default useRefundReceivingAddresses;
