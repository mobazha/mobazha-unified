'use client';

import { memo } from 'react';
import Link from 'next/link';
import {
  deliveryTranslationParams,
  deliveryUpsertKey,
  isProductImportDelivery,
  translateDeliveryMessage,
  translateDeliveryItemStatus,
  translateDeliveryNextAction,
  useI18n,
  type ChatDelivery,
} from '@mobazha/core';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatDeliveryCardProps {
  delivery: ChatDelivery;
  className?: string;
}

function deliveryTone(state: ChatDelivery['state']): string {
  switch (state) {
    case 'failed':
      return 'border-destructive/40 bg-destructive/[0.04]';
    case 'completed':
      return 'border-primary/30 bg-primary/[0.04]';
    case 'partially_completed':
      return 'border-warning/30 bg-warning/[0.04]';
    case 'needs_approval':
      return 'border-primary/30 bg-primary/[0.04]';
    default:
      return 'border-border bg-muted/30';
  }
}

function DeliveryStatusIcon({ state }: { state: ChatDelivery['state'] }) {
  switch (state) {
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />;
    case 'partially_completed':
      return <Clock className="h-4 w-4 text-warning" aria-hidden />;
    default:
      return <Package className="h-4 w-4 text-primary" aria-hidden />;
  }
}

export const ChatDeliveryCard = memo(function ChatDeliveryCard({
  delivery,
  className,
}: ChatDeliveryCardProps) {
  const { t } = useI18n();
  const params = deliveryTranslationParams(delivery.data);
  const title = translateDeliveryMessage(t, delivery);
  const nextActions = delivery.data?.nextActions ?? [];
  const showWorkbenchLink =
    isProductImportDelivery(delivery) &&
    Boolean(delivery.skillRunId) &&
    delivery.state !== 'failed' &&
    delivery.state !== 'completed';
  const items = delivery.data?.items?.filter(item => item.name?.trim()) ?? [];

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 text-sm',
        deliveryTone(delivery.state),
        className
      )}
      data-testid={`chat-delivery-card-${deliveryUpsertKey(delivery)}`}
      data-delivery-state={delivery.state}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">
          <DeliveryStatusIcon state={delivery.state} />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-foreground leading-snug">{title}</p>
          {isProductImportDelivery(delivery) && delivery.data && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <div>
                <dt className="inline">{t('product_import.deliveryMetricSources')}: </dt>
                <dd className="inline text-foreground">{params.sourceCount}</dd>
              </div>
              <div>
                <dt className="inline">{t('product_import.deliveryMetricProposals')}: </dt>
                <dd className="inline text-foreground">{params.proposalCount}</dd>
              </div>
              {(delivery.data.reviewableCount ?? 0) > 0 && (
                <div>
                  <dt className="inline">{t('product_import.deliveryMetricReviewable')}: </dt>
                  <dd className="inline text-foreground">{params.reviewableCount}</dd>
                </div>
              )}
              {(delivery.data.pendingApprovalCount ?? 0) > 0 && (
                <div>
                  <dt className="inline">{t('product_import.deliveryMetricPendingApproval')}: </dt>
                  <dd className="inline text-foreground">{params.pendingApprovalCount}</dd>
                </div>
              )}
            </dl>
          )}
          {items.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {items.map((item, index) => {
                const statusLabel = translateDeliveryItemStatus(t, item.status);
                return (
                  <li key={`${item.name}-${index}`} className="truncate">
                    <span className="text-foreground">{item.name}</span>
                    {statusLabel ? <span> · {statusLabel}</span> : null}
                  </li>
                );
              })}
            </ul>
          )}
          {nextActions.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {nextActions.map((action, index) => (
                <li key={`${action.type}-${index}`}>{translateDeliveryNextAction(t, action)}</li>
              ))}
            </ul>
          )}
          {showWorkbenchLink && delivery.skillRunId && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-11 min-h-11 text-xs sm:h-9 sm:min-h-9"
            >
              <Link
                href={`/admin/products/import/${encodeURIComponent(delivery.skillRunId)}`}
                data-testid="chat-delivery-open-workbench"
              >
                {t('product_import.deliveryOpenWorkbench')}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

interface ChatDeliveryCardListProps {
  deliveries: ChatDelivery[];
  className?: string;
}

export const ChatDeliveryCardList = memo(function ChatDeliveryCardList({
  deliveries,
  className,
}: ChatDeliveryCardListProps) {
  if (!deliveries.length) return null;
  return (
    <div className={cn('space-y-2', className)}>
      {deliveries.map(delivery => (
        <ChatDeliveryCard key={deliveryUpsertKey(delivery)} delivery={delivery} />
      ))}
    </div>
  );
});
