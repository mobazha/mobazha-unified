'use client';

import { RefundDestinationAddressDisplay } from '@/components/shared/RefundDestinationAddressDisplay';
import { Card, CardContent } from '@/components/ui/card';

interface OrderRefundDestinationCardProps {
  address: string;
  className?: string;
}

export function OrderRefundDestinationCard({
  address,
  className,
}: OrderRefundDestinationCardProps) {
  const trimmed = address.trim();
  if (!trimmed) return null;

  return (
    <Card className={className} data-testid="order-refund-destination">
      <CardContent className="p-4 sm:p-5">
        <RefundDestinationAddressDisplay
          address={trimmed}
          copyTestId="order-refund-destination-copy"
          addressTestId="order-refund-destination-address"
        />
      </CardContent>
    </Card>
  );
}
