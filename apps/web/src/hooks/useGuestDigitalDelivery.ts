'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { digitalAssetsApi, useI18n } from '@mobazha/core';
import type { DigitalDeliveryStatus } from '@mobazha/core';
import type { GuestOrderItemResponse } from '@mobazha/core/services/api/guestCheckout';
import { inferGuestOrderKindFromItems } from '@/components/orders/guestOrderDisplay';

const POST_FUNDED_STATES = new Set(['FUNDED', 'SHIPPED', 'COMPLETED']);

type DigitalDeliveryFetchState = 'idle' | 'loading' | 'success' | 'error';

function mapDigitalDeliveryError(raw: string, t: (key: string) => string): string {
  if (/buyer portal token|not authorized to access digital delivery/i.test(raw)) {
    return t('admin.orders.guestDigitalStatusAuthFailed');
  }
  return raw;
}

export interface UseGuestDigitalDeliveryOptions {
  onSyncDelivery?: () => Promise<boolean>;
}

export function useGuestDigitalDelivery(
  orderToken: string | null,
  orderState: string | undefined,
  fallbackListingSlugs: string[] = [],
  orderItems: Pick<GuestOrderItemResponse, 'contractType'>[] = [],
  options: UseGuestDigitalDeliveryOptions = {}
) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<DigitalDeliveryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<DigitalDeliveryFetchState>('idle');
  const [version, setVersion] = useState(0);

  const shouldFetch = Boolean(orderToken && orderState && POST_FUNDED_STATES.has(orderState));
  const resolvedListingSlugs = status?.listingSlugs?.length
    ? status.listingSlugs
    : fallbackListingSlugs;
  const kindFromItems = inferGuestOrderKindFromItems(orderItems);
  const deliveryKnown = fetchState === 'success';
  const isDigitalFromApi = deliveryKnown ? status?.isDigitalOrder === true : null;
  const deliveryReason = status?.reason ?? null;

  useEffect(() => {
    if (!shouldFetch || !orderToken) {
      setStatus(null);
      setError(null);
      setLoading(false);
      setFetchState('idle');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setStatus(null);
    setFetchState('loading');

    digitalAssetsApi
      .getDigitalDeliveryStatus(orderToken)
      .then(next => {
        if (cancelled) return;
        setStatus(next);
        setFetchState('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus(null);
        setFetchState('error');
        const raw = err instanceof Error ? err.message : t('common.unknownError');
        setError(mapDigitalDeliveryError(raw, t));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderToken, shouldFetch, t, version]);

  const refresh = useCallback(() => setVersion(v => v + 1), []);

  const retryDelivery = useCallback(async (): Promise<boolean> => {
    if (!orderToken) return false;
    setIsSyncing(true);
    setError(null);
    try {
      const next = await digitalAssetsApi.retryDigitalDelivery(orderToken);
      setStatus(next);
      setFetchState('success');
      return next.status === 'delivered';
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : t('common.unknownError');
      setError(mapDigitalDeliveryError(raw, t));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [orderToken, t]);

  const syncDelivery = useCallback(async (): Promise<boolean> => {
    if (!options.onSyncDelivery || status?.status !== 'delivered') return false;
    setIsSyncing(true);
    setError(null);
    try {
      const synced = await options.onSyncDelivery();
      if (synced) refresh();
      return synced;
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : t('common.unknownError');
      setError(mapDigitalDeliveryError(raw, t));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [options.onSyncDelivery, refresh, status?.status, t]);

  const deliveryStatus = status?.status ?? null;
  const hasPreconfiguredAssets =
    Boolean(status?.preconfiguredAssetHint) || (status?.assetCount ?? 0) > 0;
  const canRetryDelivery = deliveryStatus === 'ready' && hasPreconfiguredAssets;
  const canSyncDelivery = deliveryStatus === 'delivered' && Boolean(options.onSyncDelivery);
  const treatAsDigitalOrder = isDigitalFromApi === true || kindFromItems === 'digital';

  return useMemo(
    () => ({
      loading,
      error,
      isDigitalOrder: treatAsDigitalOrder,
      isDigitalFromApi,
      deliveryReason,
      deliveryKnown,
      fetchState,
      assetCount: status?.assetCount ?? 0,
      hasPreconfiguredAssets,
      deliveryStatus,
      listingSlugs: resolvedListingSlugs,
      listingSlug: resolvedListingSlugs[0],
      refresh,
      sellerDigitalProps: {
        isDigitalOrder: treatAsDigitalOrder,
        isLoading: loading,
        isSyncing,
        assetCount: status?.assetCount ?? 0,
        hasPreconfiguredAssets,
        status: deliveryStatus,
        error,
        canSyncDelivery,
        canRetryDelivery,
        onSyncDelivery: syncDelivery,
        onRetryDelivery: retryDelivery,
        listingSlug: resolvedListingSlugs[0],
        listingSlugs: resolvedListingSlugs,
        orderId: orderToken ?? undefined,
        onManageListing: (slug: string) => {
          window.open(`/listing/edit/${slug}?from=orders`, '_blank');
        },
        refreshStatus: refresh,
      },
    }),
    [
      canRetryDelivery,
      canSyncDelivery,
      deliveryKnown,
      deliveryReason,
      deliveryStatus,
      error,
      fetchState,
      hasPreconfiguredAssets,
      isDigitalFromApi,
      loading,
      isSyncing,
      orderToken,
      refresh,
      resolvedListingSlugs,
      retryDelivery,
      status,
      syncDelivery,
      treatAsDigitalOrder,
    ]
  );
}
