'use client';

import React, { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  buildPromoterProgramHref,
  formatAttributionWindowDays,
  formatCommissionRateFromBPS,
  useCurrency,
  useI18n,
  type DealPromotionProgram,
  type SellerDealLink,
} from '@mobazha/core';
import { ChevronDown, Copy, Link2, Pause, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { useDealLinksContext } from './DealLinksContext';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> =
  {
    active: 'success',
    paused: 'warning',
    draft: 'outline',
  };

export interface PromotionProgramRowProps {
  program: DealPromotionProgram;
  linkedDeal?: SellerDealLink;
}

export const PromotionProgramRow = memo(function PromotionProgramRow({
  program,
  linkedDeal,
}: PromotionProgramRowProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { activateProgram, pauseProgram, busyProgramId } = useDealLinksContext();
  const [expanded, setExpanded] = useState(false);

  const statusVariant = STATUS_VARIANT[program.status] ?? 'secondary';
  const statusLabel =
    program.status === 'active'
      ? t('admin.dealLinks.statusActive')
      : program.status === 'paused'
        ? t('admin.dealLinks.statusPaused')
        : program.status === 'draft'
          ? t('admin.dealLinks.statusDraft')
          : t('admin.dealLinks.statusUnknown');

  const fundingSourceLabel =
    program.declaredFundingSource === 'seller_manual_budget'
      ? t('admin.dealLinks.fundingSellerManualBudget')
      : t('admin.dealLinks.fundingUnknown');

  const attributionWindowDays = formatAttributionWindowDays(program.attributionWindowSeconds);
  const commissionPercent = formatCommissionRateFromBPS(program.commissionRateBPS);
  const promoterHref = buildPromoterProgramHref(program.id);
  const isBusy = busyProgramId === program.id;

  const handleActivate = useCallback(async () => {
    try {
      await activateProgram(program.id);
      toast({ title: t('admin.dealLinks.activateSuccess') });
    } catch {
      toast({ variant: 'destructive', title: t('admin.dealLinks.activateFailed') });
    }
  }, [activateProgram, program.id, t, toast]);

  const handlePause = useCallback(async () => {
    try {
      await pauseProgram(program.id);
      toast({ title: t('admin.dealLinks.pauseSuccess') });
    } catch {
      toast({ variant: 'destructive', title: t('admin.dealLinks.pauseFailed') });
    }
  }, [pauseProgram, program.id, t, toast]);

  const handleCopyPromoterLink = useCallback(async () => {
    const absoluteHref =
      typeof window === 'undefined' ? promoterHref : `${window.location.origin}${promoterHref}`;
    const copied = await copyToClipboard(absoluteHref);
    toast({
      title: copied ? t('admin.dealLinks.promoterLinkCopied') : t('admin.dealLinks.dealCopyFailed'),
      variant: copied ? 'default' : 'destructive',
    });
  }, [promoterHref, t, toast]);

  const linkedDealLabel = linkedDeal
    ? `${linkedDeal.title} · ${formatPrice(linkedDeal.priceAmount, linkedDeal.priceCurrency)}`
    : t('admin.dealLinks.dealLinkMissing');

  const summaryLine = t('admin.dealLinks.programSummaryLine', {
    commission: commissionPercent,
    days: attributionWindowDays ?? '—',
    product: linkedDeal?.title ?? t('admin.dealLinks.dealLinkMissing'),
  });

  return (
    <div
      className="rounded-lg border border-border"
      data-testid={`deal-promotion-program-${program.id}`}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{program.name}</h2>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{summaryLine}</p>
          {program.status === 'active' ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <Link href={promoterHref} className="truncate text-sm text-primary hover:underline">
                {promoterHref}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 min-h-9 px-2"
                onClick={() => void handleCopyPromoterLink()}
              >
                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {t('admin.dealLinks.copyPromoterLink')}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {program.status === 'draft' || program.status === 'paused' ? (
            <Button
              type="button"
              size="sm"
              className="min-h-9"
              disabled={isBusy}
              aria-busy={isBusy}
              onClick={() => void handleActivate()}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t('admin.dealLinks.activate')}
            </Button>
          ) : null}
          {program.status === 'active' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-9"
              disabled={isBusy}
              aria-busy={isBusy}
              onClick={() => void handlePause()}
            >
              <Pause className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t('admin.dealLinks.pause')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9 gap-1 text-primary"
            aria-expanded={expanded}
            onClick={() => setExpanded(current => !current)}
          >
            {t('admin.dealLinks.expandDetails')}
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-4 border-t border-border px-3 pb-3 pt-3 sm:px-4">
          <p className="text-sm text-muted-foreground">
            {linkedDeal ? (
              <button
                type="button"
                className="text-left text-primary hover:underline"
                onClick={() => router.replace('/admin/deal-links?tab=links')}
              >
                {linkedDealLabel}
              </button>
            ) : (
              linkedDealLabel
            )}
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{t('admin.dealLinks.commissionRate')}</dt>
              <dd className="font-medium">
                {t('admin.dealLinks.commissionValue', { percent: commissionPercent })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.dealLinks.attributionWindow')}</dt>
              <dd className="font-medium">
                {attributionWindowDays
                  ? t('admin.dealLinks.windowDaysValue', { count: attributionWindowDays })
                  : t('admin.dealLinks.windowUnavailable')}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.dealLinks.fundingSource')}</dt>
              <dd className="font-medium">{fundingSourceLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.dealLinks.settlementMode')}</dt>
              <dd className="font-medium">{t('admin.dealLinks.settlementManualReview')}</dd>
            </div>
          </dl>
          {program.status === 'active' ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{t('admin.dealLinks.promoterLinkTitle')}</p>
              <p className="mt-1 text-muted-foreground">{t('admin.dealLinks.promoterLinkBody')}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
