// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useI18n, type OperatorCustodyMetrics } from '@mobazha/core';

const METRIC_KEYS = [
  'needsAttention',
  'intakeReview',
  'mintExceptions',
  'redemptionFulfillment',
  'releaseClosed',
] as const satisfies readonly (keyof OperatorCustodyMetrics)[];

const METRIC_LABEL_KEYS: Record<keyof OperatorCustodyMetrics, string> = {
  needsAttention: 'collectibles.experience.ops.metrics.needsAttention',
  intakeReview: 'collectibles.experience.ops.metrics.intakeReview',
  mintExceptions: 'collectibles.experience.ops.metrics.mintExceptions',
  redemptionFulfillment: 'collectibles.experience.ops.metrics.redemptionFulfillment',
  releaseClosed: 'collectibles.experience.ops.metrics.releaseClosed',
};

export interface CollectiblesOpsMetricsBarProps {
  metrics: OperatorCustodyMetrics;
  className?: string;
}

export function CollectiblesOpsMetricsBar({ metrics, className }: CollectiblesOpsMetricsBarProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5', className)}
      data-testid="collectibles-ops-overview"
      aria-label={t('collectibles.experience.ops.metricsAria')}
    >
      {METRIC_KEYS.map(key => (
        <Card key={key} className="p-3 text-center">
          <p className="text-xs text-muted-foreground">{t(METRIC_LABEL_KEYS[key])}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{metrics[key]}</p>
        </Card>
      ))}
    </div>
  );
}
