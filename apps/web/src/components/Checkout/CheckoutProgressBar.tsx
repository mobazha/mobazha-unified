'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export type CheckoutStep = 'checkout' | 'payment' | 'confirmation';

const STANDARD_STEPS: CheckoutStep[] = ['checkout', 'payment', 'confirmation'];

const STANDARD_ROUTES: Record<CheckoutStep, string> = {
  checkout: '/checkout',
  payment: '/checkout/payment-method',
  confirmation: '/checkout/confirmation',
};

interface CheckoutProgressBarProps {
  currentStep: string;
  steps?: string[];
  labels?: Record<string, string>;
  routes?: Record<string, string>;
  onStepClick?: (step: string, index: number) => void;
  className?: string;
}

export function CheckoutProgressBar({
  currentStep,
  steps,
  labels: labelsProp,
  routes,
  onStepClick,
  className,
}: CheckoutProgressBarProps) {
  const { t } = useI18n();
  const router = useRouter();

  const resolvedSteps = steps ?? STANDARD_STEPS;
  const currentIndex = resolvedSteps.indexOf(currentStep);

  const standardLabels: Record<string, string> = {
    checkout: t('checkout.stepCheckout'),
    payment: t('checkout.stepPayment'),
    confirmation: t('checkout.stepConfirmation'),
  };
  const resolvedLabels = labelsProp ?? standardLabels;
  const resolvedRoutes = routes ?? (steps ? undefined : STANDARD_ROUTES);

  const handleStepClick = (step: string, idx: number) => {
    if (idx >= currentIndex) return;
    if (onStepClick) {
      onStepClick(step, idx);
    } else if (resolvedRoutes?.[step]) {
      router.push(resolvedRoutes[step]);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        {resolvedSteps.map((step, idx) => {
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
              <button
                type="button"
                className={cn(
                  'flex flex-col items-center gap-1 group',
                  isCompleted && 'cursor-pointer',
                  !isCompleted && !isActive && 'cursor-default'
                )}
                onClick={() => handleStepClick(step, idx)}
                disabled={!isCompleted}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted &&
                      'bg-primary text-primary-foreground group-hover:ring-2 group-hover:ring-primary/30 group-hover:scale-110',
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
                    'text-xs whitespace-nowrap transition-colors',
                    isActive ? 'text-primary font-medium' : 'text-muted-foreground',
                    isCompleted && 'group-hover:text-primary'
                  )}
                >
                  {resolvedLabels[step] ?? step}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
