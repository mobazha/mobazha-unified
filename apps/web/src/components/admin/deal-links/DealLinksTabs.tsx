'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDealLinksAttributionCounts, useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { DEAL_LINKS_TABS, resolveDealLinksTab, type DealLinksTab } from './dealLinksTypes';
import { AttributionAttentionBadge } from './AttributionAttentionBadge';

const TAB_LABEL_KEYS: Record<DealLinksTab, string> = {
  links: 'admin.dealLinks.tabs.links',
  programs: 'admin.dealLinks.tabs.programs',
  attribution: 'admin.dealLinks.tabs.attribution',
};

const TAB_HINT_KEYS: Record<DealLinksTab, string> = {
  links: 'admin.dealLinks.tabs.linksHint',
  programs: 'admin.dealLinks.tabs.programsHint',
  attribution: 'admin.dealLinks.tabs.attributionHint',
};

function buildTabHref(tab: DealLinksTab, current: URLSearchParams): string {
  const next = new URLSearchParams(current);
  next.delete('tab');
  if (tab !== 'links') {
    next.set('tab', tab);
  }
  const query = next.toString();
  return query ? `/admin/deal-links?${query}` : '/admin/deal-links';
}

export function DealLinksTabs() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveDealLinksTab(searchParams.get('tab'));
  const { needingAttention } = useDealLinksAttributionCounts();

  const handleSelect = useCallback(
    (tab: DealLinksTab) => {
      router.replace(buildTabHref(tab, searchParams));
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-2" data-testid="deal-links-tabs">
      <div
        className="flex w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1 sm:w-fit"
        role="tablist"
      >
        {DEAL_LINKS_TABS.map(tab => {
          const showAttributionBadge =
            tab === 'attribution' && activeTab !== 'attribution' && needingAttention > 0;
          return (
            <Link
              key={tab}
              href={buildTabHref(tab, searchParams)}
              role="tab"
              aria-selected={activeTab === tab}
              data-testid={`deal-links-tab-${tab}`}
              onClick={event => {
                event.preventDefault();
                handleSelect(tab);
              }}
              className={cn(
                'flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:min-h-9 sm:gap-2 sm:px-4',
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(TAB_LABEL_KEYS[tab])}
              {showAttributionBadge ? (
                <AttributionAttentionBadge
                  count={needingAttention}
                  testId="deal-links-tab-attribution-badge"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
      <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
        {t(TAB_HINT_KEYS[activeTab])}
      </p>
    </div>
  );
}
