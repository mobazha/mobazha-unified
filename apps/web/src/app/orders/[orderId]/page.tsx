'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { usePlatform } from '@mobazha/ui/hooks/usePlatform';
import { OrderDetailDesktop, OrderDetailMobile } from '@/components/Order';

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { shouldUseMobileView } = usePlatform();

  const orderId = params.orderId as string;
  const typeFromUrl = searchParams.get('type');
  const viewingContext =
    typeFromUrl === 'sale' ? 'sale' : typeFromUrl === 'purchase' ? 'purchase' : undefined;
  const focusDispute = searchParams.get('tab') === 'dispute';

  if (shouldUseMobileView) {
    return (
      <OrderDetailMobile
        orderId={orderId}
        viewingContext={viewingContext}
        focusDispute={focusDispute}
      />
    );
  }

  return (
    <OrderDetailDesktop
      orderId={orderId}
      viewingContext={viewingContext}
      focusDispute={focusDispute}
    />
  );
}
