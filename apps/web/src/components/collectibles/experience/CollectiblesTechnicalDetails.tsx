// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';

export interface CollectiblesTechnicalDetailRow {
  labelKey: string;
  value: string;
  mono?: boolean;
}

export interface CollectiblesTechnicalDetailsProps {
  rows: readonly CollectiblesTechnicalDetailRow[];
  className?: string;
}

export function CollectiblesTechnicalDetails({
  rows,
  className,
}: CollectiblesTechnicalDetailsProps) {
  const { t } = useI18n();
  const filtered = rows.filter(row => row.value.trim());
  if (!filtered.length) return null;

  return (
    <Accordion
      type="single"
      collapsible
      className={cn('rounded-md border border-border', className)}
    >
      <AccordionItem value="technical" className="border-0 px-3">
        <AccordionTrigger className="min-h-[44px] py-3 text-xs font-medium text-muted-foreground hover:no-underline sm:text-sm">
          {t('collectibles.experience.technicalDetails')}
        </AccordionTrigger>
        <AccordionContent>
          <dl className="grid grid-cols-1 gap-2 pb-3 text-xs sm:grid-cols-2">
            {filtered.map(row => (
              <div key={row.labelKey} className={row.mono ? 'sm:col-span-2' : undefined}>
                <dt className="text-muted-foreground">{t(row.labelKey)}</dt>
                <dd
                  className={cn(
                    'mt-0.5 font-medium text-foreground',
                    row.mono && 'break-all font-mono text-[11px]'
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
