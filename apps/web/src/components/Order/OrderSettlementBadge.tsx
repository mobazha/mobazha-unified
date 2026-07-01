'use client';

import React, { memo, useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, Copy, Info } from 'lucide-react';
import { resolveSettlementStatusDisplay } from './orderSettlementStatus';
import { useI18n } from '@mobazha/core';

export interface OrderSettlementBadgeProps {
  settlementState?: string;
  settlementAction?: string;
  settlementActionId?: string;
  settlementTxHash?: string;
  className?: string;
}

function settlementActionLabelKey(action?: string): string {
  switch ((action || '').trim().toLowerCase()) {
    case 'confirm':
      return 'order.settlementAction.confirm';
    case 'cancel':
      return 'order.settlementAction.cancel';
    case 'complete':
      return 'order.settlementAction.complete';
    case 'dispute_release':
      return 'order.settlementAction.disputeRelease';
    default:
      return 'order.settlementAction.default';
  }
}

function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function settlementStateLabelKey(state?: string): string {
  switch ((state || '').trim().toLowerCase()) {
    case 'submitting':
      return 'order.settlementStatus.submitting';
    case 'submitted':
      return 'order.settlementStatus.submitted';
    case 'confirmed':
      return 'order.settlementStatus.confirmed';
    case 'failed':
      return 'order.settlementStatus.failed';
    case 'abandoned':
      return 'order.settlementStatus.abandoned';
    default:
      return 'order.settlementStatus.unknown';
  }
}

export const OrderSettlementBadge = memo(function OrderSettlementBadge({
  settlementState,
  settlementAction,
  settlementActionId,
  settlementTxHash,
  className,
}: OrderSettlementBadgeProps) {
  const { t } = useI18n();
  const [copiedField, setCopiedField] = useState<'actionId' | 'txHash' | null>(null);
  const status = resolveSettlementStatusDisplay(settlementState);
  const stopEvent = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const copyField = useCallback(async (field: 'actionId' | 'txHash', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField(current => (current === field ? null : current));
      }, 1500);
    } catch {
      setCopiedField(null);
    }
  }, []);
  if (!status) return null;

  const hasDetails = !!(settlementAction || settlementActionId || settlementTxHash);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Badge variant="outline" className={cn('text-xs', status.className)}>
        {t(settlementStateLabelKey(settlementState))}
      </Badge>
      {hasDetails ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t('order.settlementDetails.viewDetails')}
              onClick={stopEvent}
              onMouseDown={stopEvent}
              onKeyDown={stopEvent}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-72 p-3 text-xs"
            onOpenAutoFocus={event => event.preventDefault()}
          >
            <div className="space-y-1.5">
              {settlementAction ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('order.settlementDetails.action')}
                  </div>
                  <div className="text-foreground">
                    {settlementAction
                      ? t(settlementActionLabelKey(settlementAction))
                      : t('order.settlementAction.default')}
                  </div>
                </div>
              ) : null}
              {settlementActionId ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('order.settlementDetails.actionId')}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <div className="min-w-0 flex-1 truncate font-mono text-foreground">
                      {truncateMiddle(settlementActionId)}
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={t('order.settlementDetails.copyActionId')}
                      onClick={event => {
                        stopEvent(event);
                        void copyField('actionId', settlementActionId);
                      }}
                      onMouseDown={stopEvent}
                    >
                      {copiedField === 'actionId' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
              {settlementTxHash ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('order.settlementDetails.txHash')}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <div className="min-w-0 flex-1 truncate font-mono text-foreground">
                      {truncateMiddle(settlementTxHash)}
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={t('order.settlementDetails.copyTxHash')}
                      onClick={event => {
                        stopEvent(event);
                        void copyField('txHash', settlementTxHash);
                      }}
                      onMouseDown={stopEvent}
                    >
                      {copiedField === 'txHash' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
});
