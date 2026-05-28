'use client';

import { Check } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import {
  GUEST_ORDER_PROGRESS_STAGES,
  guestProgressStageLabel,
  resolveGuestProgressStageIndex,
} from './guestOrderStages';
import type { GuestOrderKind } from './guestOrderDisplay';

interface GuestOrderStageStripProps {
  state: string;
  orderKind: GuestOrderKind;
  className?: string;
}

export function GuestOrderStageStrip({ state, orderKind, className }: GuestOrderStageStripProps) {
  const { t } = useI18n();

  if (state === 'EXPIRED') {
    return (
      <div
        className={cn(
          'rounded-lg border border-amber-300/50 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
          className
        )}
      >
        {t('guestOrder.stages.expired')}
      </div>
    );
  }

  const activeIndex = resolveGuestProgressStageIndex(state);
  if (activeIndex < 0) return null;

  return (
    <div className={cn('space-y-2', className)} data-testid="guest-order-stage-strip">
      <div className="flex items-center justify-between gap-1">
        {GUEST_ORDER_PROGRESS_STAGES.map((stage, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          const label = guestProgressStageLabel(stage, orderKind, t);

          return (
            <div key={stage} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && !done && 'border-primary bg-primary/10 text-primary',
                  !done && !active && 'border-border bg-muted text-muted-foreground'
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
              </div>
              <span
                className={cn(
                  'max-w-[4.5rem] text-center text-[10px] leading-tight',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {t('guestOrder.stageProgress', {
          current: activeIndex + 1,
          total: GUEST_ORDER_PROGRESS_STAGES.length,
        })}
      </p>
    </div>
  );
}
