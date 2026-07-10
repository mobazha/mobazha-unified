// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Save } from 'lucide-react';
import { useI18n, useSellerAffiliateProgram } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const SellerAffiliateProgramPanel = memo(function SellerAffiliateProgramPanel() {
  const { t } = useI18n();
  const { program, loading, error, save } = useSellerAffiliateProgram();
  const [status, setStatus] = useState<'active' | 'paused'>('paused');
  const [rate, setRate] = useState('5');
  const [windowDays, setWindowDays] = useState('30');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!program) return;
    setStatus(program.status);
    setRate(String(program.commissionRateBPS / 100));
    setWindowDays(String(Math.max(1, Math.round(program.attributionWindowSeconds / 86400))));
  }, [program]);

  const handleSave = useCallback(async (): Promise<void> => {
    const rateNumber = Number(rate);
    const days = Number(windowDays);
    if (
      !Number.isFinite(rateNumber) ||
      rateNumber <= 0 ||
      rateNumber > 100 ||
      !Number.isInteger(days) ||
      days <= 0
    ) {
      setSaveError(t('sellerAffiliate.invalidProgram'));
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await save({
        status,
        commissionRateBPS: Math.round(rateNumber * 100),
        attributionWindowSeconds: days * 86400,
      });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : t('sellerAffiliate.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [rate, save, status, t, windowDays]);

  return (
    <Card data-testid="seller-affiliate-program-panel" aria-busy={loading || saving}>
      <CardHeader>
        <CardTitle className="text-base">{t('sellerAffiliate.programTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('sellerAffiliate.programDescription')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-destructive">{t('sellerAffiliate.programLoadFailed')}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="affiliate-status">{t('sellerAffiliate.status')}</Label>
            <select
              id="affiliate-status"
              value={status}
              onChange={event => setStatus(event.target.value as 'active' | 'paused')}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="active">{t('sellerAffiliate.active')}</option>
              <option value="paused">{t('sellerAffiliate.paused')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="affiliate-rate">{t('sellerAffiliate.commissionRate')}</Label>
            <Input
              id="affiliate-rate"
              inputMode="decimal"
              value={rate}
              onChange={event => setRate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="affiliate-window">{t('sellerAffiliate.attributionDays')}</Label>
            <Input
              id="affiliate-window"
              inputMode="numeric"
              value={windowDays}
              onChange={event => setWindowDays(event.target.value)}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t('sellerAffiliate.noManualWorkflow')}</p>
        {saveError ? (
          <p className="text-sm text-destructive" role="alert">
            {saveError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="min-h-11"
            onClick={() => void handleSave()}
            disabled={loading || saving}
            data-testid="seller-affiliate-program-save"
          >
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('sellerAffiliate.saveProgram')}
          </Button>
          {program ? (
            <Button asChild type="button" variant="outline" className="min-h-11">
              <Link href={`/promote/${encodeURIComponent(program.id)}`}>
                {t('sellerAffiliate.getPromoterLink')}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});
