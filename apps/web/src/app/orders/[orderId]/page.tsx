'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { usePlatform } from '@mobazha/ui/hooks/usePlatform';
import { OrderDetailDesktop, OrderDetailMobile } from '@/components/Order';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { Container } from '@/components/layouts';
import { Card } from '@/components/ui/card';

type OrderDetailTab = 'summary' | 'discussion' | 'dispute' | 'evidence';

function resolveInitialTab(tabParam: string | null): OrderDetailTab {
  if (tabParam === 'discussion') return 'discussion';
  if (tabParam === 'dispute') return 'dispute';
  if (tabParam === 'evidence') return 'evidence';
  return 'summary';
}

function OrderDetailPageFallback() {
  return (
    <Container className="py-8">
      <Card className="p-6 space-y-4">
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="rounded" width="100%" height={120} />
        <Skeleton variant="rounded" width="100%" height={240} />
      </Card>
    </Container>
  );
}

function OrderDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { shouldUseMobileView } = usePlatform();

  const orderId = params.orderId as string;
  const typeFromUrl = searchParams.get('type');
  const viewingContext =
    typeFromUrl === 'sale' ? 'sale' : typeFromUrl === 'purchase' ? 'purchase' : undefined;
  const tabParam = searchParams.get('tab');
  const initialTab = resolveInitialTab(tabParam);
  const focusDispute = tabParam === 'dispute';

  if (shouldUseMobileView) {
    return (
      <OrderDetailMobile
        orderId={orderId}
        viewingContext={viewingContext}
        focusDispute={focusDispute}
        initialTab={
          initialTab === 'discussion'
            ? 'discussion'
            : initialTab === 'evidence'
              ? 'evidence'
              : 'details'
        }
      />
    );
  }

  return (
    <OrderDetailDesktop
      orderId={orderId}
      viewingContext={viewingContext}
      focusDispute={focusDispute}
      initialTab={initialTab}
    />
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<OrderDetailPageFallback />}>
      <OrderDetailPageContent />
    </Suspense>
  );
}
