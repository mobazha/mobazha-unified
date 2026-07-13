// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';

export interface CollectiblesJourneyStep {
  id: string;
  labelKey: string;
}

export interface CollectiblesJourneyProgressProps {
  steps: readonly CollectiblesJourneyStep[];
  currentStepId: string;
  completedStepIds?: readonly string[];
  ariaLabelKey: string;
  className?: string;
}

export function CollectiblesJourneyProgress({
  steps,
  currentStepId,
  completedStepIds = [],
  ariaLabelKey,
  className,
}: CollectiblesJourneyProgressProps) {
  const { t } = useI18n();
  const completed = new Set(completedStepIds);
  const currentIndex = steps.findIndex(step => step.id === currentStepId);

  return (
    <ol
      className={cn(
        'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-none lg:auto-cols-fr lg:grid-flow-col',
        className
      )}
      aria-label={t(ariaLabelKey)}
      data-testid="collectibles-journey-progress"
    >
      {steps.map((step, index) => {
        const isComplete = completed.has(step.id) || (currentIndex >= 0 && index < currentIndex);
        const isCurrent = step.id === currentStepId;

        return (
          <li
            key={step.id}
            className={cn(
              'flex min-h-[44px] items-start gap-2 rounded-lg border px-3 py-2.5 text-xs sm:text-sm',
              isCurrent
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-muted/20 text-muted-foreground'
            )}
            aria-current={isCurrent ? 'step' : undefined}
            data-testid={`collectibles-journey-step-${step.id}`}
          >
            {isComplete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <Circle
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-hidden
              />
            )}
            <span className={cn('font-medium', isCurrent && 'text-foreground')}>
              {t(step.labelKey)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
