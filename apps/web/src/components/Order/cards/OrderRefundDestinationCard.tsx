'use client';

import { useI18n, truncateAddress } from '@mobazha/core';
import { Card, CardContent } from '@/components/ui/card';

interface OrderRefundDestinationCardProps {
  address: string;
  className?: string;
}

export function OrderRefundDestinationCard({
  address,
  className,
}: OrderRefundDestinationCardProps) {
  const { t } = useI18n();
  const trimmed = address.trim();
  if (!trimmed) return null;

  return (
    <Card className={className} data-testid="order-refund-destination">
      <CardContent className="p-4 sm:p-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t('payment.refundDestination.title')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('payment.refundDestination.desc')}</p>
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-foreground">
          {truncateAddress(trimmed, 8, 6)}
        </p>
      </CardContent>
    </Card>
  );
}
