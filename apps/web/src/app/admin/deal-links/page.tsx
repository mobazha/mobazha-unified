// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Link2, Loader2, Pause, Play, Plus } from 'lucide-react';
import {
  buildPromoterProgramHref,
  formatAttributionWindowDays,
  formatCommissionRateFromBPS,
  isValidOptionalCommissionAmount,
  parseAttributionWindowDaysToSeconds,
  parseCommissionPercentToBPS,
  useCurrency,
  useDealPromotionPrograms,
  useI18n,
} from '@mobazha/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> =
  {
    active: 'success',
    paused: 'warning',
    draft: 'outline',
  };

export default function AdminDealLinksPage() {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const {
    programs,
    dealLinks,
    loading,
    error,
    reload,
    createProgram,
    activateProgram,
    pauseProgram,
    busyProgramId,
  } = useDealPromotionPrograms();

  const [selectedDealLinkId, setSelectedDealLinkId] = useState('');
  const [programName, setProgramName] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('5');
  const [maxCommissionAmount, setMaxCommissionAmount] = useState('');
  const [windowDays, setWindowDays] = useState('7');
  const [creating, setCreating] = useState(false);

  const dealLinkById = useMemo(() => new Map(dealLinks.map(link => [link.id, link])), [dealLinks]);

  const handleCreateProgram = useCallback(async () => {
    const commissionRateBPS = parseCommissionPercentToBPS(commissionPercent);
    const attributionWindowSeconds = parseAttributionWindowDaysToSeconds(windowDays);
    if (
      !selectedDealLinkId ||
      !programName.trim() ||
      programName.trim().length > 120 ||
      !commissionRateBPS ||
      !attributionWindowSeconds ||
      !isValidOptionalCommissionAmount(maxCommissionAmount)
    ) {
      toast({
        variant: 'destructive',
        title: t('admin.dealLinks.createValidationError'),
      });
      return;
    }

    setCreating(true);
    try {
      await createProgram({
        dealLinkID: selectedDealLinkId,
        name: programName.trim(),
        commissionRateBPS,
        attributionWindowSeconds,
        ...(maxCommissionAmount.trim() ? { maxCommissionAmount: maxCommissionAmount.trim() } : {}),
      });
      setProgramName('');
      setMaxCommissionAmount('');
      toast({ title: t('admin.dealLinks.createSuccess') });
    } catch {
      toast({ variant: 'destructive', title: t('admin.dealLinks.createFailed') });
    } finally {
      setCreating(false);
    }
  }, [
    commissionPercent,
    createProgram,
    maxCommissionAmount,
    programName,
    selectedDealLinkId,
    t,
    toast,
    windowDays,
  ]);

  const handleActivate = useCallback(
    async (programId: string) => {
      try {
        await activateProgram(programId);
        toast({ title: t('admin.dealLinks.activateSuccess') });
      } catch {
        toast({ variant: 'destructive', title: t('admin.dealLinks.activateFailed') });
      }
    },
    [activateProgram, t, toast]
  );

  const handlePause = useCallback(
    async (programId: string) => {
      try {
        await pauseProgram(programId);
        toast({ title: t('admin.dealLinks.pauseSuccess') });
      } catch {
        toast({ variant: 'destructive', title: t('admin.dealLinks.pauseFailed') });
      }
    },
    [pauseProgram, t, toast]
  );

  return (
    <div className="space-y-6" data-testid="admin-deal-links-page">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.dealLinks.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.dealLinks.subtitle')}</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-2 p-4 text-sm leading-6">
          <p className="font-medium">{t('admin.dealLinks.immutableEconomicsTitle')}</p>
          <p className="text-muted-foreground">{t('admin.dealLinks.immutableEconomicsBody')}</p>
          <p className="text-muted-foreground">{t('admin.dealLinks.manualReviewOnlyNotice')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.dealLinks.createTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="deal-link-select">{t('admin.dealLinks.dealLinkLabel')}</Label>
            <Select value={selectedDealLinkId} onValueChange={setSelectedDealLinkId}>
              <SelectTrigger id="deal-link-select" className="min-h-11">
                <SelectValue placeholder={t('admin.dealLinks.dealLinkPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {dealLinks.map(link => (
                  <SelectItem key={link.id} value={link.id}>
                    {link.title} ({link.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loading && dealLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.dealLinks.noDealLinks')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-name">{t('admin.dealLinks.programNameLabel')}</Label>
            <Input
              id="program-name"
              value={programName}
              onChange={event => setProgramName(event.target.value)}
              placeholder={t('admin.dealLinks.programNamePlaceholder')}
              className="min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission-percent">{t('admin.dealLinks.commissionLabel')}</Label>
            <Input
              id="commission-percent"
              inputMode="decimal"
              value={commissionPercent}
              onChange={event => setCommissionPercent(event.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-commission">{t('admin.dealLinks.maxCommissionLabel')}</Label>
            <Input
              id="max-commission"
              inputMode="decimal"
              value={maxCommissionAmount}
              onChange={event => setMaxCommissionAmount(event.target.value)}
              placeholder={t('admin.dealLinks.maxCommissionPlaceholder')}
              className="min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="window-days">{t('admin.dealLinks.windowDaysLabel')}</Label>
            <Input
              id="window-days"
              inputMode="numeric"
              value={windowDays}
              onChange={event => setWindowDays(event.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="md:col-span-2">
            <Button
              type="button"
              className="min-h-11"
              disabled={creating || !dealLinks.length}
              onClick={() => void handleCreateProgram()}
              data-testid="admin-deal-links-create-program"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {t('admin.dealLinks.createCta')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{t('admin.dealLinks.programsTitle')}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            {t('admin.dealLinks.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('common.loading')}
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive">{t('admin.dealLinks.loadFailed')}</p>
          ) : null}
          {!loading && !programs.length ? (
            <p className="text-sm text-muted-foreground">{t('admin.dealLinks.noPrograms')}</p>
          ) : null}
          {programs.map(program => {
            const linkedDeal = dealLinkById.get(program.dealLinkID);
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
            const attributionWindowDays = formatAttributionWindowDays(
              program.attributionWindowSeconds
            );
            const promoterHref = buildPromoterProgramHref(program.id);
            return (
              <div
                key={program.id}
                className="rounded-lg border border-border p-4"
                data-testid={`deal-promotion-program-${program.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{program.name}</h2>
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {linkedDeal
                        ? `${linkedDeal.title} · ${formatPrice(linkedDeal.priceAmount, linkedDeal.priceCurrency)}`
                        : t('admin.dealLinks.dealLinkMissing')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {program.status === 'draft' || program.status === 'paused' ? (
                      <Button
                        type="button"
                        size="sm"
                        className="min-h-9"
                        disabled={busyProgramId === program.id}
                        onClick={() => void handleActivate(program.id)}
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
                        disabled={busyProgramId === program.id}
                        onClick={() => void handlePause(program.id)}
                      >
                        <Pause className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        {t('admin.dealLinks.pause')}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">{t('admin.dealLinks.commissionRate')}</dt>
                    <dd className="font-medium">
                      {t('admin.dealLinks.commissionValue', {
                        percent: formatCommissionRateFromBPS(program.commissionRateBPS),
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('admin.dealLinks.attributionWindow')}
                    </dt>
                    <dd className="font-medium">
                      {attributionWindowDays
                        ? t('admin.dealLinks.windowDaysValue', {
                            count: attributionWindowDays,
                          })
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
                  <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">{t('admin.dealLinks.promoterLinkTitle')}</p>
                    <p className="mt-1 text-muted-foreground">
                      {t('admin.dealLinks.promoterLinkBody')}
                    </p>
                    <a
                      href={promoterHref}
                      className="mt-2 inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Link2 className="h-4 w-4" aria-hidden="true" />
                      {promoterHref}
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
