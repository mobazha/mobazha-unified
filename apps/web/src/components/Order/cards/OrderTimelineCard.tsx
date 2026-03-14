'use client';

import React, { memo, useMemo } from 'react';
import { useI18n, type DisplayOrder } from '@mobazha/core';
import type { Order as CoreOrder } from '@mobazha/core';
import { OrderCompleteCard, FulfillmentCard, AcceptedCard } from '@/components/Order';

export interface OrderTimelineCardProps {
  displayOrder: DisplayOrder;
  coreOrder?: CoreOrder | null;
  className?: string;
}

export const OrderTimelineCard = memo(function OrderTimelineCard({
  displayOrder: order,
  className,
}: OrderTimelineCardProps) {
  const { t } = useI18n();

  const hasHistory = useMemo(() => {
    return (
      order.status === 'completed' ||
      !!order.trackingNumber ||
      ['processing', 'shipped', 'delivered', 'completed'].includes(order.status)
    );
  }, [order.status, order.trackingNumber]);

  if (!hasHistory) return null;

  return (
    <div className={className}>
      <div className="space-y-2">
        {order.status === 'completed' && (
          <div className="bg-muted/10 rounded-lg p-2">
            <OrderCompleteCard
              timestamp={order.timeline.find(e => e.status === 'completed')?.timestamp}
              amount={order.total}
              currency={order.currency}
              description={t('order.fundsReleased')}
              showDivider={false}
            />
          </div>
        )}

        {(order.trackingNumber || ['shipped', 'delivered', 'completed'].includes(order.status)) && (
          <div className="bg-muted/10 rounded-lg p-2">
            <FulfillmentCard
              timestamp={order.timeline.find(e => e.status === 'shipped')?.timestamp}
              shipper={order.shipper}
              trackingNumber={order.trackingNumber}
              contractType={order.contractType}
              showDivider={false}
            />
          </div>
        )}

        {['processing', 'shipped', 'delivered', 'completed'].includes(order.status) && (
          <div className="bg-muted/10 rounded-lg p-2">
            <AcceptedCard
              timestamp={order.timeline.find(e => e.status === 'processing')?.timestamp}
              description={
                order.userRole === 'seller'
                  ? t('order.acceptedDescSeller')
                  : t('order.acceptedDescBuyer')
              }
              showDivider={false}
            />
          </div>
        )}
      </div>
    </div>
  );
});
