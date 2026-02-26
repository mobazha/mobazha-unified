'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export type CheckoutStep = 'checkout' | 'payment' | 'confirmation';

interface CheckoutProgressBarProps {
  currentStep: CheckoutStep;
  className?: string;
}

const STEPS: CheckoutStep[] = ['checkout', 'payment', 'confirmation'];

export function CheckoutProgressBar({ currentStep, className }: CheckoutProgressBarProps) {
  const { t } = useI18n();
  const currentIndex = STEPS.indexOf(currentStep);

  const labels: Record<CheckoutStep, string> = {
    checkout: t('checkout.stepCheckout'),
    payment: t('checkout.stepPayment'),
    confirmation: t('checkout.stepConfirmation'),
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isCompleted = idx < currentIndex;
          return (
            <React.Fragment key={step}>
              {idx > 0 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-primary text-primary-foreground',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
                </div>
                <span
                  className={cn(
                    'text-xs whitespace-nowrap',
                    isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}
                >
                  {labels[step]}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
