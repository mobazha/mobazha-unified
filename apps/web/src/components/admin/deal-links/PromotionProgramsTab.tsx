'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Users } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PromotionProgramRow } from './PromotionProgramRow';
import { useDealLinksContext } from './DealLinksContext';
import {
  DEAL_LINKS_PROGRAM_STATUS_PARAM,
  PROGRAM_STATUS_FILTERS,
  resolveProgramStatusFilter,
  type ProgramStatusFilter,
} from './dealLinksTypes';
import { useDealLinksSearchParam } from './useDealLinksSearchParam';

const FILTER_LABEL_KEYS: Record<ProgramStatusFilter, string> = {
  all: 'admin.dealLinks.programsFilterAll',
  active: 'admin.dealLinks.programsFilterActive',
  paused: 'admin.dealLinks.programsFilterPaused',
  draft: 'admin.dealLinks.programsFilterDraft',
};

export function PromotionProgramsTab() {
  const { t } = useI18n();
  const { programs, dealLinks, loading, error, reload } = useDealLinksContext();
  const [statusFilter, setStatusFilter] = useDealLinksSearchParam(
    DEAL_LINKS_PROGRAM_STATUS_PARAM,
    resolveProgramStatusFilter,
    'all'
  );

  const dealLinkById = useMemo(() => new Map(dealLinks.map(link => [link.id, link])), [dealLinks]);

  const filteredPrograms = useMemo(() => {
    if (statusFilter === 'all') return programs;
    return programs.filter(program => program.status === statusFilter);
  }, [programs, statusFilter]);

  return (
    <div className="space-y-4" data-testid="deal-links-tab-panel-programs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium">{t('admin.dealLinks.programsTitle')}</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => void reload()}
          >
            {t('admin.dealLinks.refresh')}
          </Button>
          <Button asChild className="min-h-11">
            <Link href="/admin/deal-links/programs/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('admin.dealLinks.createProgram')}
            </Link>
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t('admin.dealLinks.programsFilterLabel')}
      >
        {PROGRAM_STATUS_FILTERS.map(filter => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={statusFilter === filter ? 'default' : 'outline'}
            className={cn('min-h-9')}
            onClick={() => setStatusFilter(filter)}
            data-testid={`deal-links-program-filter-${filter}`}
          >
            {t(FILTER_LABEL_KEYS[filter])}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('common.loading')}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{t('admin.dealLinks.loadFailed')}</p> : null}

      {!loading && !programs.length ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="text-base font-medium">{t('admin.dealLinks.programsEmptyTitle')}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t('admin.dealLinks.programsEmptyDescription')}
          </p>
          <Button asChild className="mt-4 min-h-11">
            <Link href="/admin/deal-links/programs/new">{t('admin.dealLinks.createProgram')}</Link>
          </Button>
        </div>
      ) : null}

      {!loading && programs.length && !filteredPrograms.length ? (
        <p className="text-sm text-muted-foreground">{t('admin.dealLinks.programsFilterEmpty')}</p>
      ) : null}

      {!loading ? (
        <div className="space-y-2">
          {filteredPrograms.map(program => (
            <PromotionProgramRow
              key={program.id}
              program={program}
              linkedDeal={dealLinkById.get(program.dealLinkID)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
