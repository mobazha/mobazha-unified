'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useDealLinksAttributionCounts, useI18n } from '@mobazha/core';
import { useDealLinksContext } from './DealLinksContext';
import { buildDealLinksAttributionAttentionHref, resolveDealLinksTab } from './dealLinksTypes';

export function DealLinksSummaryBar() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { dealLinks, programs, loading } = useDealLinksContext();
  const attributionCounts = useDealLinksAttributionCounts();

  const activeTab = resolveDealLinksTab(searchParams.get('tab'));

  const activeLinkCount = useMemo(
    () => dealLinks.filter(link => link.status === 'active').length,
    [dealLinks]
  );

  const programCount = programs.length;

  if (loading) {
    return null;
  }

  if (!activeLinkCount && !programCount && !attributionCounts.needingAttention) {
    return null;
  }

  const attentionHref = buildDealLinksAttributionAttentionHref(attributionCounts);
  const showAttentionBanner = attributionCounts.needingAttention > 0 && activeTab !== 'attribution';

  return (
    <div className="space-y-2" data-testid="deal-links-summary-bar">
      {(activeLinkCount > 0 || programCount > 0) && (
        <p className="text-sm text-muted-foreground">
          {t('admin.dealLinks.summary', {
            linkCount: activeLinkCount,
            programCount,
          })}
        </p>
      )}

      {showAttentionBanner ? (
        <div
          className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/40 dark:bg-amber-950/30"
          data-testid="deal-links-attention-banner"
          role="status"
        >
          <p className="text-amber-950 dark:text-amber-100">
            {t('admin.dealLinks.summaryAttention', { count: attributionCounts.needingAttention })}
          </p>
          <Link
            href={attentionHref}
            className="inline-flex min-h-9 items-center gap-1 font-medium text-amber-800 hover:underline dark:text-amber-200"
            data-testid="deal-links-attention-cta"
          >
            {t('admin.dealLinks.summaryAttentionCta')}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
