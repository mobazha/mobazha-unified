// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';

export interface CollectiblesCatalogHeroProps {
  backHref?: string;
  backLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  summary: {
    total: number;
    owned: number;
    custodyReady: number;
  };
  className?: string;
}

export function CollectiblesCatalogHero({
  backHref,
  backLabel,
  onRefresh,
  refreshing = false,
  summary,
  className,
}: CollectiblesCatalogHeroProps) {
  const { t } = useI18n();

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-primary/5 p-5 sm:p-8',
        className
      )}
      data-testid="collectibles-catalog-hero"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-primary/5 blur-2xl"
        aria-hidden
      />

      <div className="relative space-y-4">
        {backHref ? (
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-11 min-h-[44px] px-2">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              {backLabel}
            </Link>
          </Button>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {t('collectibles.catalog.heroEyebrow')}
            </p>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {t('collectibles.catalog.storefrontTitle')}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t('collectibles.catalog.storefrontSubtitle')}
            </p>
          </div>

          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] shrink-0 self-start"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
          ) : null}
        </div>

        <dl
          className="grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3"
          data-testid="collectibles-catalog-summary"
        >
          <div className="rounded-lg border border-border/60 bg-background/70 px-2 py-2 text-center backdrop-blur-sm sm:px-3 sm:py-3">
            <dt className="text-[10px] text-muted-foreground sm:text-xs">
              {t('collectibles.experience.summary.catalogTotal')}
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">
              {summary.total}
            </dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 px-2 py-2 text-center backdrop-blur-sm sm:px-3 sm:py-3">
            <dt className="text-[10px] text-muted-foreground sm:text-xs">
              {t('collectibles.experience.summary.myHoldings')}
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">
              {summary.owned}
            </dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 px-2 py-2 text-center backdrop-blur-sm sm:px-3 sm:py-3">
            <dt className="text-[10px] text-muted-foreground sm:text-xs">
              {t('collectibles.experience.summary.custodyReady')}
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">
              {summary.custodyReady}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
