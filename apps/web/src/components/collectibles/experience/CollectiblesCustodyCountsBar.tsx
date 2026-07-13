// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useI18n,
  type SellerCustodyCountKey,
  type SellerCustodyWorkspaceCounts,
} from '@mobazha/core';

const COUNT_KEYS: SellerCustodyCountKey[] = [
  'needsAction',
  'inReview',
  'readyToList',
  'redemptionOrCompleted',
];

const COUNT_LABEL_KEYS: Record<SellerCustodyCountKey, string> = {
  needsAction: 'marketplace.sell.collectibles.workspace.counts.needsAction',
  inReview: 'marketplace.sell.collectibles.workspace.counts.inReview',
  readyToList: 'marketplace.sell.collectibles.workspace.counts.readyToList',
  redemptionOrCompleted: 'marketplace.sell.collectibles.workspace.counts.redemptionOrCompleted',
};

export interface CollectiblesCustodyCountsBarProps {
  counts: SellerCustodyWorkspaceCounts;
  className?: string;
}

export function CollectiblesCustodyCountsBar({
  counts,
  className,
}: CollectiblesCustodyCountsBarProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}
      data-testid="collectibles-custody-counts"
      aria-label={t('marketplace.sell.collectibles.workspace.countsAria')}
    >
      {COUNT_KEYS.map(key => (
        <Card key={key} className="p-3 text-center">
          <p className="text-xs text-muted-foreground">{t(COUNT_LABEL_KEYS[key])}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{counts[key]}</p>
        </Card>
      ))}
    </div>
  );
}
