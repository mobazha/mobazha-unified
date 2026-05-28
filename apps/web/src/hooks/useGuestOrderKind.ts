'use client';

import { useCallback, useMemo } from 'react';
import type { GuestOrderAdminDetail } from '@mobazha/core/services/api/guestCheckout';
import {
  inferGuestOrderKindFromItems,
  resolveGuestOrderKind,
  type GuestOrderKind,
} from '@/components/orders/guestOrderDisplay';
import { useGuestDigitalDelivery } from './useGuestDigitalDelivery';

export interface UseGuestOrderKindOptions {
  onSyncDelivery?: () => Promise<boolean>;
}

export function useGuestOrderKind(
  detail: GuestOrderAdminDetail | null,
  options: UseGuestOrderKindOptions = {}
) {
  const { onSyncDelivery } = options;

  const fallbackListingSlugs = useMemo(
    () => (detail?.items ?? []).map(item => item.listingSlug).filter(Boolean),
    [detail?.items]
  );

  const handleSyncDelivery = useCallback(async (): Promise<boolean> => {
    if (!onSyncDelivery || detail?.state !== 'FUNDED') return false;
    return onSyncDelivery();
  }, [detail?.state, onSyncDelivery]);

  const digitalDelivery = useGuestDigitalDelivery(
    detail?.orderToken ?? null,
    detail?.state,
    fallbackListingSlugs,
    detail?.items ?? [],
    { onSyncDelivery: onSyncDelivery ? handleSyncDelivery : undefined }
  );

  const kindFromItems = detail ? inferGuestOrderKindFromItems(detail.items) : null;
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
