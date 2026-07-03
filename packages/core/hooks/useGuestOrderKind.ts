'use client';

import { useCallback, useMemo } from 'react';
import type { GuestOrderItemResponse } from '../services/api/guestCheckout';
import {
  inferGuestOrderKindFromItems,
  resolveGuestOrderKind,
  type GuestOrderKind,
} from '../utils/guestOrderKind';
import {
  useGuestDigitalDelivery,
  type UseGuestDigitalDeliveryOptions,
} from './useGuestDigitalDelivery';

export type GuestOrderKindSource = {
  orderToken?: string;
  state?: string;
  items?: Pick<GuestOrderItemResponse, 'contractType' | 'listingSlug'>[];
};

export type UseGuestOrderKindOptions = UseGuestDigitalDeliveryOptions;

export function useGuestOrderKind(
  order: GuestOrderKindSource | null,
  options: UseGuestOrderKindOptions = {}
) {
  const { onSyncDelivery, buyerPortalToken } = options;

  const fallbackListingSlugs = useMemo(
    () =>
      (order?.items ?? [])
        .map(item => item.listingSlug?.trim())
        .filter((slug): slug is string => Boolean(slug)),
    [order?.items]
  );

  const handleSyncDelivery = useCallback(async (): Promise<boolean> => {
    if (!onSyncDelivery || order?.state !== 'FUNDED') return false;
    return onSyncDelivery();
  }, [onSyncDelivery, order?.state]);

  const digitalDelivery = useGuestDigitalDelivery(
    order?.orderToken ?? null,
    order?.state,
    fallbackListingSlugs,
    order?.items ?? [],
    {
      buyerPortalToken,
      onSyncDelivery: onSyncDelivery ? handleSyncDelivery : undefined,
    }
  );

  const kindFromItems = order ? inferGuestOrderKindFromItems(order.items ?? []) : null;
  const orderKind: GuestOrderKind = resolveGuestOrderKind({
    deliveryKnown: digitalDelivery.deliveryKnown,
    isDigitalFromApi: digitalDelivery.isDigitalFromApi,
    deliveryReason: digitalDelivery.deliveryReason,
    kindFromItems,
  });

  return {
    orderKind,
    isPhysical: orderKind === 'physical',
    isUnknown: orderKind === 'unknown',
    digitalDelivery,
  };
}
