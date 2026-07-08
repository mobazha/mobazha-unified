'use client';

import React from 'react';
import { useDealLinksAttributionCounts, useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProvisionalCommissionStatementsPanel } from '@/components/DealCommission/ProvisionalCommissionStatementsPanel';
import {
  ATTRIBUTION_STATUS_FILTERS,
  DEAL_LINKS_ATTRIBUTION_STATUS_PARAM,
  resolveAttributionStatusFilter,
  type AttributionStatusFilter,
} from './dealLinksTypes';
import { useDealLinksSearchParam } from './useDealLinksSearchParam';

const FILTER_LABEL_KEYS: Record<AttributionStatusFilter, string> = {
  all: 'admin.dealLinks.attributionFilterAll',
  observed: 'admin.dealLinks.attributionFilterRecorded',
  pending_review: 'admin.dealLinks.attributionFilterPending',
  reversed: 'admin.dealLinks.attributionFilterNotEligible',
  settled: 'admin.dealLinks.attributionFilterSettled',
  disputed: 'admin.dealLinks.attributionFilterDisputed',
};

function attributionFilterCount(
  filter: AttributionStatusFilter,
  counts: ReturnType<typeof useDealLinksAttributionCounts>
): number {
  switch (filter) {
    case 'all':
      return counts.total;
    case 'observed':
      return counts.observed;
    case 'pending_review':
      return counts.pendingReview;
    case 'reversed':
      return counts.reversed;
    case 'settled':
      return counts.settled;
    case 'disputed':
      return counts.disputed;
    default:
      return 0;
  }
}

export function PartnerAttributionTab() {
  const { t } = useI18n();
  const attributionCounts = useDealLinksAttributionCounts();
  const [statusFilter, setStatusFilter] = useDealLinksSearchParam(
    DEAL_LINKS_ATTRIBUTION_STATUS_PARAM,
    resolveAttributionStatusFilter,
    'all'
  );

  return (
    <div className="space-y-4" data-testid="deal-links-tab-panel-attribution">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t('admin.dealLinks.attributionFilterLabel')}
      >
        {ATTRIBUTION_STATUS_FILTERS.map(filter => {
          const count = attributionFilterCount(filter, attributionCounts);
          const label = t(FILTER_LABEL_KEYS[filter]);
          const labelWithCount =
            filter === 'all' || count === 0
              ? label
              : t('admin.dealLinks.attributionFilterCount', { label, count });

          return (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={statusFilter === filter ? 'default' : 'outline'}
              className={cn('min-h-9')}
              onClick={() => setStatusFilter(filter)}
              data-testid={`deal-links-attribution-filter-${filter}`}
            >
              {labelWithCount}
            </Button>
          );
        })}
      </div>

      <ProvisionalCommissionStatementsPanel
        audience="seller"
        variant="compact"
        embedded
        statusFilter={statusFilter}
      />
    </div>
  );
}
