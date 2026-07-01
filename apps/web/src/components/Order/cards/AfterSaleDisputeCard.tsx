'use client';

import React, { memo } from 'react';
import { useI18n, type DisplayAfterSaleDispute, type DisplayUserRole } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AfterSaleDisputeCardProps {
  dispute: DisplayAfterSaleDispute;
  userRole: DisplayUserRole;
  onMessageCounterparty?: () => void;
  className?: string;
}

const REASON_LABELS: Record<string, string> = {
  NOT_RECEIVED: 'order.afterSaleDispute.reason.notReceived',
  QUALITY_ISSUE: 'order.afterSaleDispute.reason.qualityIssue',
  NOT_AS_DESCRIBED: 'order.afterSaleDispute.reason.notAsDescribed',
  OTHER: 'order.afterSaleDispute.reason.other',
};

export const AfterSaleDisputeCard = memo(function AfterSaleDisputeCard({
  dispute,
  userRole,
  onMessageCounterparty,
  className,
}: AfterSaleDisputeCardProps) {
  const { t } = useI18n();

  const isBuyer = userRole === 'buyer';
  const reasonKey = REASON_LABELS[dispute.reason] || REASON_LABELS.OTHER;
  const reportedDate = new Date(dispute.reportedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        'rounded-xl border p-4 bg-orange-50/50 border-orange-200/40 dark:bg-orange-950/20 dark:border-orange-800/30',
        className
      )}
      data-testid="after-sale-dispute-card"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-orange-500 dark:text-orange-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {isBuyer
              ? t('order.afterSaleDispute.buyerTitle')
              : t('order.afterSaleDispute.sellerTitle')}
          </p>
          <div className="mt-1.5 space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{t('order.afterSaleDispute.reasonLabel')}:</span>{' '}
              {t(reasonKey, { defaultValue: dispute.reason })}
            </p>
            {dispute.description && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                &ldquo;{dispute.description}&rdquo;
              </p>
            )}
            <p className="text-xs text-muted-foreground/70">{reportedDate}</p>
          </div>
          {onMessageCounterparty && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2.5 text-xs h-7 px-3"
              onClick={onMessageCounterparty}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              {isBuyer
                ? t('order.afterSaleDispute.messageSeller')
                : t('order.afterSaleDispute.contactBuyer')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
