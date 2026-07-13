// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { Package, ShieldCheck, WalletCards } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';

const ASSURANCE_ITEMS = [
  {
    key: 'physicalHeld',
    icon: Package,
  },
  {
    key: 'digitalTitle',
    icon: WalletCards,
  },
  {
    key: 'redeemDelivery',
    icon: ShieldCheck,
  },
] as const;

export interface CollectiblesCustodyAssurancesProps {
  className?: string;
}

export function CollectiblesCustodyAssurances({ className }: CollectiblesCustodyAssurancesProps) {
  const { t } = useI18n();

  return (
    <Card className={cn('p-4 sm:p-5', className)} data-testid="collectibles-custody-assurances">
      <h2 className="text-sm font-semibold text-foreground sm:text-base">
        {t('collectibles.experience.assurances.title')}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {ASSURANCE_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <li
              key={item.key}
              className="rounded-lg border border-border bg-muted/30 p-3"
              data-testid={`collectibles-assurance-${item.key}`}
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t(`collectibles.experience.assurances.${item.key}.title`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`collectibles.experience.assurances.${item.key}.body`)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
