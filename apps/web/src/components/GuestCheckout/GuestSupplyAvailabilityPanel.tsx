'use client';

import type { GuestCartItem } from '@mobazha/core/stores';
import type { GuestOrderSupplyQuoteResponse } from '@mobazha/core';
import {
  SupplyAvailabilityPanel,
  type SupplyAvailabilityPanelProps,
} from '@/components/SupplyAvailability/SupplyAvailabilityPanel';

export interface GuestSupplyAvailabilityPanelProps {
  cartItems: GuestCartItem[];
  quote: GuestOrderSupplyQuoteResponse | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
  blocking?: boolean;
}

export function GuestSupplyAvailabilityPanel({
  cartItems,
  quote,
  loading,
  error,
  className,
  blocking = false,
}: GuestSupplyAvailabilityPanelProps) {
  const displayItems = cartItems.map(item => ({
    listingSlug: item.slug,
    title: item.title,
  }));

  const panelProps: SupplyAvailabilityPanelProps = {
    displayItems,
    quote,
    loading,
    error,
    className,
    blocking,
    testIdPrefix: 'guest-supply-quote',
  };

  return <SupplyAvailabilityPanel {...panelProps} />;
}
