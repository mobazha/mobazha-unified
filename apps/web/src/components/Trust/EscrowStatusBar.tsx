'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

const ESCROW_STEPS = ['paid', 'confirmed', 'shipped', 'delivered', 'released'] as const;
type EscrowStepKey = (typeof ESCROW_STEPS)[number];

/**
 * Map DisplayOrderStatus values to escrow step index.
 * DisplayOrderStatus from mapOrderState(): paid, awaiting_payment, processing,
 * shipped, delivered, completed, disputed, refunded, cancelled, split_resolved.
 * -1 = special/ended state.
 */
function statusToStep(status: string): { step: number; isDisputed: boolean; isEnded: boolean } {
  const s = status.toLowerCase();
  if (s === 'canceled' || s === 'cancelled' || s === 'refunded') {
    return { step: -1, isDisputed: false, isEnded: true };
  }
  if (s === 'disputed' || s === 'decided' || s === 'split_resolved') {
    if (s === 'split_resolved') return { step: 4, isDisputed: true, isEnded: false };
    return { step: 1, isDisputed: true, isEnded: false };
  }
  if (s === 'completed') return { step: 4, isDisputed: false, isEnded: false };
  if (s === 'delivered') return { step: 3, isDisputed: false, isEnded: false };
  if (s === 'shipped' || s === 'fulfilled') return { step: 2, isDisputed: false, isEnded: false };
  if (s === 'processing' || s === 'confirmed')
    return { step: 1, isDisputed: false, isEnded: false };
  if (s === 'paid' || s === 'pending') return { step: 0, isDisputed: false, isEnded: false };
  if (s === 'awaiting_payment') return { step: -1, isDisputed: false, isEnded: false };
  return { step: 0, isDisputed: false, isEnded: false };
}

export interface EscrowStatusBarProps {
  /** Order status */
  status: string;
  /** Additional class name */
  className?: string;
}

/**
 * Horizontal progress bar showing order escrow lifecycle.
 * Steps: Paid → Confirmed → Shipped → Delivered → Released
 */
export function EscrowStatusBar({ status, className }: EscrowStatusBarProps) {
  const { t } = useI18n();
  const { step: currentStep, isDisputed, isEnded } = statusToStep(status);

  const labels: Record<EscrowStepKey, string> = {
    paid: t('trust.escrow.paid'),
    confirmed: t('trust.escrow.confirmed'),
    shipped: t('trust.escrow.shipped'),
    delivered: t('trust.escrow.delivered'),
    released: t('trust.escrow.released'),
  };

  return (
    <div
      className={cn('w-full', className)}
      data-testid="escrow-status-bar"
      role="progressbar"
      aria-valuenow={currentStep >= 0 ? currentStep : 0}
      aria-valuemin={0}
      aria-valuemax={4}
      aria-label={
        currentStep >= 0 && currentStep < ESCROW_STEPS.length
          ? labels[ESCROW_STEPS[currentStep]]
          : status
      }
    >
      <div className="flex items-start">
        {ESCROW_STEPS.map((key, idx) => {
          const isCompleted = currentStep >= 0 && idx < currentStep;
          const isCurrent = currentStep >= 0 && idx === currentStep && !isEnded;
          const isFuture = currentStep < 0 || idx > currentStep;
          const showDestructive = isCurrent && isDisputed;

          return (
            <React.Fragment key={key}>
              {idx > 0 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 sm:mx-2 mt-5 sm:mt-6 transition-colors min-w-2',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
              <div className="flex flex-col items-center min-w-0 flex-1">
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0">
                  {isCurrent && !isEnded && (
                    <span
                      className={cn(
                        'absolute inset-0 rounded-full border-2 animate-ping opacity-75',
                        showDestructive ? 'border-destructive' : 'border-primary',
                        'motion-reduce:animate-none'
                      )}
                      aria-hidden
                    />
                  )}
                  <div
                    className={cn(
                      'relative w-full h-full rounded-full flex items-center justify-center transition-colors',
                      isCompleted && 'bg-primary text-primary-foreground',
                      isCurrent && !showDestructive && 'bg-primary text-primary-foreground',
                      showDestructive && 'bg-destructive text-destructive-foreground',
                      isFuture && 'bg-muted text-muted-foreground'
                    )}
                  >
                    <span className="text-xs font-medium">
                      {isCompleted ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    'mt-2 text-[10px] sm:text-xs text-center max-w-full truncate',
                    'hidden sm:block',
                    (isCompleted || isCurrent) && !showDestructive && 'text-foreground font-medium',
                    showDestructive && 'text-destructive font-medium',
                    isFuture && 'text-muted-foreground'
                  )}
                >
                  {labels[key]}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
