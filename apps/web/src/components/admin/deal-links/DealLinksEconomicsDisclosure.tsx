'use client';

import React from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export function DealLinksEconomicsDisclosure() {
  const { t } = useI18n();

  return (
    <details className="group rounded-lg border border-primary/20 bg-primary/5">
      <summary
        className={cn(
          'flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1">{t('admin.dealLinks.economicsLearnMore')}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-2 border-t border-primary/10 px-4 pb-4 pt-3 text-sm leading-6 text-muted-foreground">
        <p>{t('admin.dealLinks.immutableEconomicsBody')}</p>
        <p>{t('admin.dealLinks.manualReviewOnlyNotice')}</p>
        <p>{t('dealCommissionStatements.disclosurePaymentSeller')}</p>
      </div>
    </details>
  );
}
