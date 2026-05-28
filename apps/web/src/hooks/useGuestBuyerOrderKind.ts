'use client';

import { useEffect, useState } from 'react';
import { digitalAssetsApi } from '@mobazha/core';
import type { GuestOrderStatus } from '@mobazha/core/services/api/guestCheckout';
import {
  inferGuestOrderKindFromItems,
  resolveGuestOrderKind,
  type GuestOrderKind,
} from '@/components/orders/guestOrderDisplay';

const POST_FUNDED_STATES = new Set(['FUNDED', 'SHIPPED', 'COMPLETED']);

type BuyerKindFetchState = 'idle' | 'loading' | 'success' | 'error';

type DeliverySnapshot = {
  key: string;
  isDigitalFromApi: boolean | null;
  deliveryReason: string | null;
  fetchState: Exclude<BuyerKindFetchState, 'idle'>;
};

export function useGuestBuyerOrderKind(order: GuestOrderStatus | null, buyerPortalToken?: string) {
  const [snapshot, setSnapshot] = useState<DeliverySnapshot | null>(null);

  const shouldFetch = Boolean(
    order?.orderToken && order.state && POST_FUNDED_STATES.has(order.state)
  );
  const fetchKey =
    shouldFetch && order?.orderToken ? `${order.orderToken}:${buyerPortalToken ?? ''}` : null;

  useEffect(() => {
    if (!fetchKey) return;

    let cancelled = false;

    digitalAssetsApi
      .getDigitalDeliveryStatus(order!.orderToken, buyerPortalToken)
      .then(status => {
        if (cancelled) return;
        setSnapshot({
          key: fetchKey,
          isDigitalFromApi: status.isDigitalOrder === true,
          deliveryReason: status.reason ?? null,
          fetchState: 'success',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot({
            key: fetchKey,
            isDigitalFromApi: null,
            deliveryReason: null,
            fetchState: 'error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [buyerPortalToken, fetchKey, order]);

  const snapshotMatches = snapshot?.key === fetchKey;
  const fetchState: BuyerKindFetchState = !fetchKey
    ? 'idle'
    : snapshotMatches
      ? snapshot.fetchState
      : 'loading';
  const isDigitalFromApi = snapshotMatches ? snapshot.isDigitalFromApi : null;
  const deliveryReason = snapshotMatches ? snapshot.deliveryReason : null;

  const kindFromItems = order ? inferGuestOrderKindFromItems(order.items) : null;
  const orderKind: GuestOrderKind = resolveGuestOrderKind({
    deliveryKnown: fetchState === 'success',
    isDigitalFromApi,
    deliveryReason,
    kindFromItems,
  });

  return {
    orderKind,
    isPhysical: orderKind === 'physical',
    isUnknown: orderKind === 'unknown',
    deliveryKnown: fetchState === 'success',
    fetchState,
  };
}
