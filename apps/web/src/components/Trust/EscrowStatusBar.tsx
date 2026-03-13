'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { Lock, Truck, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 3 stages: 1=Funds protected, 2=In transit, 3=Complete. -1 = ended (cancelled/refunded), show last reached. */
function statusToStage(status: string): { stage: number; isDisputed: boolean } {
  const s = status.toLowerCase();
  if (s === 'canceled' || s === 'cancelled' || s === 'refunded') {
    return { stage: -1, isDisputed: false };
  }
  if (s === 'disputed' || s === 'decided') {
    // Dispute can occur during any stage; we keep stage so bar shows progress
    if (s === 'disputed') return { stage: 1, isDisputed: true };
    return { stage: 2, isDisputed: true };
  }
  if (s === 'split_resolved') return { stage: 2, isDisputed: true };
  if (s === 'completed') return { stage: 2, isDisputed: false };
  if (s === 'delivered') return { stage: 2, isDisputed: false };
  if (s === 'shipped' || s === 'fulfilled') return { stage: 1, isDisputed: false };
  if (s === 'processing' || s === 'confirmed' || s === 'paid' || s === 'pending') {
    return { stage: 0, isDisputed: false };
  }
  if (s === 'awaiting_payment') return { stage: -1, isDisputed: false };
  return { stage: 0, isDisputed: false };
}

export interface EscrowStatusBarProps {
  /** Order status (DisplayOrderStatus) */
  status: string;
  /** Optional: vertical layout on small screens (e.g. mobile) */
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

const STAGE_ICONS = [Lock, Truck, Check] as const;

/**
 * 3-stage order status bar: Funds protected → Item in transit → Transaction complete.
 * Current stage highlighted (blue), completed (green), future (gray). Dispute = red.
 */
export function EscrowStatusBar({
  status,
  variant = 'horizontal',
  className,
}: EscrowStatusBarProps) {
  const { t } = useI18n();
  const { stage: currentStage, isDisputed } = statusToStage(status);

  const titles = [
    t('trust.statusBar.stage1Title'),
    t('trust.statusBar.stage2Title'),
    t('trust.statusBar.stage3Title'),
  ] as const;
  const descs = [
    t('trust.statusBar.stage1Desc'),
    t('trust.statusBar.stage2Desc'),
    t('trust.statusBar.stage3Desc'),
  ] as const;

  // When ended (cancelled/refunded/awaiting_payment), show short message instead of progress to avoid confusion
  const isEnded = currentStage < 0;
  const effectiveStage = currentStage < 0 ? 0 : currentStage;

  if (isEnded) {
    return (
      <div
        className={cn('w-full', className)}
        data-testid="escrow-status-bar"
        role="status"
        aria-label={t('trust.statusBar.orderClosed')}
      >
        <p className="text-sm text-muted-foreground">{t('trust.statusBar.orderClosed')}</p>
      </div>
    );
  }

  return (
    <div
      className={cn('w-full', className)}
      data-testid="escrow-status-bar"
      role="progressbar"
      aria-valuenow={effectiveStage}
      aria-valuemin={0}
      aria-valuemax={2}
      aria-label={isDisputed ? t('trust.statusBar.disputeLabel') : titles[effectiveStage]}
    >
      {isDisputed && (
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <span className="text-sm font-medium text-destructive">
            {t('trust.statusBar.disputeLabel')}
          </span>
        </div>
      )}

      <div
        className={cn(
          'flex gap-0',
          variant === 'vertical' && 'flex-col gap-4'
        )}
      >
        {[0, 1, 2].map((idx) => {
          const isCompleted = effectiveStage > idx;
          const isCurrent = effectiveStage === idx && !isDisputed;
          const isCurrentDisputed = effectiveStage === idx && isDisputed;
          const isFuture = effectiveStage < idx;

          const Icon = STAGE_ICONS[idx];

          const wrapCn = cn(
            'flex flex-1 min-w-0 items-start gap-3',
            variant === 'vertical' && 'flex-row'
          );
          const connectorCn = cn(
            'shrink-0 w-4 sm:w-6 h-0.5 mt-5 -mb-1 self-center transition-colors',
            variant === 'vertical' && 'w-0.5 h-4 mt-1 ml-5 self-start',
            isCompleted ? 'bg-primary' : 'bg-muted'
          );
          const nodeCn = cn(
            'relative flex shrink-0 w-10 h-10 rounded-full items-center justify-center transition-colors',
            isCompleted && 'bg-primary text-primary-foreground',
            isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background',
            isCurrentDisputed && 'bg-destructive text-destructive-foreground ring-2 ring-destructive ring-offset-2 ring-offset-background',
            isFuture && 'bg-muted text-muted-foreground'
          );
          const titleCn = cn(
            'text-sm font-medium',
            (isCompleted || isCurrent) && !isCurrentDisputed && 'text-foreground',
            isCurrentDisputed && 'text-destructive',
            isFuture && 'text-muted-foreground'
          );
          const descCn = cn(
            'text-xs mt-0.5',
            (isCompleted || isCurrent) && !isCurrentDisputed && 'text-muted-foreground',
            isCurrentDisputed && 'text-destructive/90',
            isFuture && 'text-muted-foreground/80'
          );

          return (
            <React.Fragment key={idx}>
              {variant === 'horizontal' && idx > 0 && (
                <div className={connectorCn} aria-hidden />
              )}
              <div className={wrapCn}>
                <div className={nodeCn}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className={titleCn}>{titles[idx]}</p>
                  <p className={descCn}>{descs[idx]}</p>
                </div>
              </div>
              {variant === 'vertical' && idx < 2 && (
                <div className={connectorCn} aria-hidden />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
