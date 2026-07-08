'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  isValidOptionalCommissionAmount,
  parseAttributionWindowDaysToSeconds,
  parseCommissionPercentToBPS,
  useI18n,
} from '@mobazha/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { DealLinksEconomicsDisclosure } from './DealLinksEconomicsDisclosure';
import { useDealLinksContext } from './DealLinksContext';

export interface CreateProgramFormProps {
  initialDealLinkId?: string;
  onCreated?: () => void;
  showHeader?: boolean;
}

export function CreateProgramForm({
  initialDealLinkId = '',
  onCreated,
  showHeader = true,
}: CreateProgramFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { dealLinks, loading, createProgram } = useDealLinksContext();

  const activeDealLinks = useMemo(
    () => dealLinks.filter(link => link.status === 'active'),
    [dealLinks]
  );

  const [selectedDealLinkId, setSelectedDealLinkId] = useState(initialDealLinkId);
  const [programName, setProgramName] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('5');
  const [maxCommissionAmount, setMaxCommissionAmount] = useState('');
  const [windowDays, setWindowDays] = useState('7');
  const [creating, setCreating] = useState(false);

  const resolvedDealLinkId =
    selectedDealLinkId || (activeDealLinks.length === 1 ? (activeDealLinks[0]?.id ?? '') : '');

  const handleSubmit = useCallback(async () => {
    const commissionRateBPS = parseCommissionPercentToBPS(commissionPercent);
    const attributionWindowSeconds = parseAttributionWindowDaysToSeconds(windowDays);
    if (
      !resolvedDealLinkId ||
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
        dealLinkID: resolvedDealLinkId,
        name: programName.trim(),
        commissionRateBPS,
        attributionWindowSeconds,
        ...(maxCommissionAmount.trim() ? { maxCommissionAmount: maxCommissionAmount.trim() } : {}),
      });
      setProgramName('');
      setMaxCommissionAmount('');
      toast({ title: t('admin.dealLinks.createSuccess') });
      onCreated?.();
    } catch {
      toast({ variant: 'destructive', title: t('admin.dealLinks.createFailed') });
    } finally {
      setCreating(false);
    }
  }, [
    commissionPercent,
    createProgram,
    maxCommissionAmount,
    onCreated,
    programName,
    resolvedDealLinkId,
    t,
    toast,
    windowDays,
  ]);

  return (
    <div className="space-y-5" data-testid="create-program-form">
      {showHeader ? (
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{t('admin.dealLinks.createTitle')}</h2>
        </div>
      ) : null}

      <DealLinksEconomicsDisclosure />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="deal-link-select">{t('admin.dealLinks.dealLinkLabel')}</Label>
          <Select
            value={resolvedDealLinkId}
            onValueChange={setSelectedDealLinkId}
            disabled={!activeDealLinks.length}
          >
            <SelectTrigger id="deal-link-select" className="min-h-11">
              <SelectValue placeholder={t('admin.dealLinks.dealLinkPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {activeDealLinks.map(link => (
                <SelectItem key={link.id} value={link.id}>
                  {link.title} ({link.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loading && !dealLinks.length ? (
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
            disabled={creating || !activeDealLinks.length}
            onClick={() => void handleSubmit()}
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
      </div>
    </div>
  );
}
