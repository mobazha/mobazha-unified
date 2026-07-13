// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';

export interface CollectiblesCustodyTimelineStep {
  id: string;
  labelKey: string;
}

export interface CollectiblesCustodyTimelineProps {
  steps: readonly CollectiblesCustodyTimelineStep[];
  currentStepId: string;
  completedStepIds?: readonly string[];
  ariaLabelKey: string;
  className?: string;
  compact?: boolean;
}

export function CollectiblesCustodyTimeline({
  steps,
  currentStepId,
  completedStepIds = [],
  ariaLabelKey,
  className,
  compact = false,
}: CollectiblesCustodyTimelineProps) {
  const { t } = useI18n();
  const completed = new Set(completedStepIds);
  const currentIndex = steps.findIndex(step => step.id === currentStepId);

  return (
    <ol
      className={cn('relative space-y-0', className)}
      aria-label={t(ariaLabelKey)}
      data-testid="collectibles-custody-timeline"
    >
      {steps.map((step, index) => {
        const isComplete = completed.has(step.id) || (currentIndex >= 0 && index < currentIndex);
        const isCurrent = step.id === currentStepId;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.id}
            className={cn('relative flex gap-3', !isLast && 'pb-3')}
            aria-current={isCurrent ? 'step' : undefined}
            data-testid={`collectibles-custody-timeline-step-${step.id}`}
          >
            {!isLast ? (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px bg-border"
                aria-hidden
              />
            ) : null}
            <span className="relative z-[1] mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center">
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              ) : (
                <Circle
                  className={cn('h-4 w-4', isCurrent ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  compact ? 'text-xs' : 'text-sm',
                  isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {t(step.labelKey)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
