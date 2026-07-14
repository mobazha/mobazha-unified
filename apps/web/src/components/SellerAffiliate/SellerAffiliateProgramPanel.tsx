// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Check, Copy, Save, Trash2 } from 'lucide-react';
import {
  describeSellerAffiliateAttributionWindow,
  sellerAffiliateAttributionDaysInput,
  sellerAffiliateAttributionWindowAdvice,
  sellerAffiliateAttributionSecondsFromDaysInput,
  sellerAffiliateAttributionWindowCopy,
  useI18n,
  useSellerAffiliateCapabilities,
  useSellerAffiliateLinks,
  useSellerAffiliateProgram,
  truncateAddress,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { copyToClipboard } from '@/lib/clipboard';
import { AffiliateRailChips } from './AffiliateRailChips';

export const SellerAffiliateProgramPanel = memo(function SellerAffiliateProgramPanel() {
  const { t } = useI18n();
  const { program, loading, error, save } = useSellerAffiliateProgram();
  const {
    capabilities,
    loading: capabilitiesLoading,
    error: capabilitiesError,
  } = useSellerAffiliateCapabilities();
  const {
    links,
    loading: linksLoading,
    error: linksError,
    revoke,
  } = useSellerAffiliateLinks(program?.id);
  const [status, setStatus] = useState<'active' | 'paused'>('paused');
  const [rate, setRate] = useState('5');
  const [windowDays, setWindowDays] = useState('30');
  // The exact stored window. While the input text still matches this value's
  // rendering, saving must send it back verbatim: the days input is lossy for
  // sub-day windows and must never silently rewrite an untouched setting.
  const [savedWindowSeconds, setSavedWindowSeconds] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [confirmRevokeID, setConfirmRevokeID] = useState<string | null>(null);
  const [revokingID, setRevokingID] = useState<string | null>(null);

  useEffect(() => {
    if (!program) return;
    setStatus(program.status);
    setRate(String(program.commissionRateBPS / 100));
    setSavedWindowSeconds(program.attributionWindowSeconds);
    setWindowDays(sellerAffiliateAttributionDaysInput(program.attributionWindowSeconds));
  }, [program]);

  // The window that would actually be saved: the untouched stored value, or
  // the user's (possibly fractional) days input converted to seconds.
  const effectiveWindowSeconds =
    savedWindowSeconds !== null &&
    windowDays === sellerAffiliateAttributionDaysInput(savedWindowSeconds)
      ? savedWindowSeconds
      : sellerAffiliateAttributionSecondsFromDaysInput(windowDays);

  const formatWindow = useCallback(
    (seconds: number): string => {
      const copy = sellerAffiliateAttributionWindowCopy(seconds);
      return t(copy.key, copy.params);
    },
    [t]
  );

  // Sub-day windows render as fractional days, so spell out the exact duration.
  const windowHint =
    effectiveWindowSeconds !== null &&
    describeSellerAffiliateAttributionWindow(effectiveWindowSeconds).unit !== 'day'
      ? t('sellerAffiliate.attributionWindowExact', {
          window: formatWindow(effectiveWindowSeconds),
        })
      : null;

  // Warn before a too-short window silently discards promoter-driven sales.
  const windowAdvice =
    effectiveWindowSeconds !== null
      ? sellerAffiliateAttributionWindowAdvice(effectiveWindowSeconds)
      : null;

  const rateNumber = Number(rate);
  const rateInvalid =
    rate.trim() !== '' && (!Number.isFinite(rateNumber) || rateNumber <= 0 || rateNumber > 100);

  const handleSave = useCallback(async (): Promise<void> => {
    const rateValue = Number(rate);
    if (
      !Number.isFinite(rateValue) ||
      rateValue <= 0 ||
      rateValue > 100 ||
      effectiveWindowSeconds === null
    ) {
      setSaveError(t('sellerAffiliate.invalidProgram'));
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await save({
        status,
        commissionRateBPS: Math.round(rateValue * 100),
        attributionWindowSeconds: effectiveWindowSeconds,
      });
      setSavedRecently(true);
      window.setTimeout(() => setSavedRecently(false), 2000);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : t('sellerAffiliate.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [effectiveWindowSeconds, rate, save, status, t]);

  const handleCopyPromoterInvite = useCallback(async (): Promise<void> => {
    if (!program || typeof window === 'undefined') return;
    const inviteURL = new URL(`/promote/${encodeURIComponent(program.id)}`, window.location.origin);
    const copied = await copyToClipboard(inviteURL.toString());
    if (!copied) {
      setSaveError(t('sellerAffiliate.copyInviteFailed'));
      return;
    }
    setSaveError(null);
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 2000);
  }, [program, t]);

  const handleRevokeLink = useCallback(
    async (linkID: string): Promise<void> => {
      if (confirmRevokeID !== linkID) {
        setConfirmRevokeID(linkID);
        return;
      }
      setRevokingID(linkID);
      setSaveError(null);
      try {
        await revoke(linkID);
        setConfirmRevokeID(null);
      } catch (cause) {
        setSaveError(cause instanceof Error ? cause.message : t('sellerAffiliate.revokeFailed'));
      } finally {
        setRevokingID(null);
      }
    },
    [confirmRevokeID, revoke, t]
  );

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
            {/* Native select: unit tests drive it via fireEvent.change; styled to match Input. */}
            <select
              id="affiliate-status"
              value={status}
              onChange={event => setStatus(event.target.value as 'active' | 'paused')}
              className="flex h-11 w-full appearance-none rounded-md border border-border bg-surface px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              <option value="active">{t('sellerAffiliate.active')}</option>
              <option value="paused">{t('sellerAffiliate.paused')}</option>
            </select>
            {status === 'paused' ? (
              <p className="text-xs text-muted-foreground" data-testid="affiliate-paused-hint">
                {t('sellerAffiliate.pausedHint')}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="affiliate-rate">{t('sellerAffiliate.commissionRate')}</Label>
            <Input
              id="affiliate-rate"
              inputMode="decimal"
              value={rate}
              onChange={event => setRate(event.target.value)}
              disabled={loading}
              aria-invalid={rateInvalid}
            />
            {rateInvalid ? (
              <p
                className="text-xs font-medium text-destructive"
                data-testid="affiliate-rate-error"
              >
                {t('sellerAffiliate.invalidRate')}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="affiliate-window">{t('sellerAffiliate.attributionDays')}</Label>
            <Input
              id="affiliate-window"
              inputMode="decimal"
              value={windowDays}
              onChange={event => setWindowDays(event.target.value)}
              disabled={loading}
            />
            {windowHint ? (
              <p className="text-xs text-muted-foreground" data-testid="affiliate-window-hint">
                {windowHint}
              </p>
            ) : null}
            {windowAdvice ? (
              <p
                className={
                  windowAdvice === 'too_short'
                    ? 'text-xs font-medium text-destructive'
                    : 'text-xs text-muted-foreground'
                }
                data-testid="affiliate-window-advice"
                data-advice={windowAdvice}
              >
                {t(
                  windowAdvice === 'too_short'
                    ? 'sellerAffiliate.attributionWindowTooShort'
                    : 'sellerAffiliate.attributionWindowRecommend'
                )}
              </p>
            ) : null}
          </div>
        </div>
        <div className="space-y-2" aria-busy={capabilitiesLoading}>
          <p className="text-sm font-medium">{t('sellerAffiliate.supportedRails')}</p>
          <p className="text-xs text-muted-foreground">{t('sellerAffiliate.noManualWorkflow')}</p>
          {capabilitiesError ? (
            <p className="text-sm text-destructive" role="alert">
              {t('sellerAffiliate.capabilitiesLoadFailed')}
            </p>
          ) : null}
          <AffiliateRailChips rails={capabilities?.rails ?? []} />
          {!capabilitiesLoading && !capabilitiesError && !capabilities?.rails.length ? (
            <p className="text-sm text-destructive">{t('sellerAffiliate.noSupportedRails')}</p>
          ) : null}
        </div>
        {program ? (
          <div className="space-y-2" aria-busy={linksLoading}>
            <p className="text-sm font-medium">{t('sellerAffiliate.promoterLinks')}</p>
            {linksError ? (
              <p className="text-sm text-destructive" role="alert">
                {t('sellerAffiliate.linksLoadFailed')}
              </p>
            ) : null}
            {!linksLoading && !links.length ? (
              <p className="text-sm text-muted-foreground">
                {t('sellerAffiliate.noPromoterLinks')}
              </p>
            ) : null}
            {links.map(link => (
              <div
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {truncateAddress(link.promoterPeerID)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      link.status === 'active'
                        ? 'sellerAffiliate.linkActive'
                        : 'sellerAffiliate.linkRevoked'
                    )}
                  </p>
                </div>
                {link.status === 'active' ? (
                  <Button
                    type="button"
                    variant={confirmRevokeID === link.id ? 'destructive' : 'outline'}
                    className="min-h-11"
                    onClick={() => void handleRevokeLink(link.id)}
                    disabled={revokingID === link.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t(
                      confirmRevokeID === link.id
                        ? 'sellerAffiliate.confirmRevoke'
                        : 'sellerAffiliate.revokeLink'
                    )}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
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
            disabled={loading || saving || rateInvalid}
            data-testid="seller-affiliate-program-save"
          >
            {savedRecently ? (
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {t(savedRecently ? 'sellerAffiliate.programSaved' : 'sellerAffiliate.saveProgram')}
          </Button>
          {program ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => void handleCopyPromoterInvite()}
              aria-label={t('sellerAffiliate.copyPromoterInvite')}
            >
              {inviteCopied ? (
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {t(
                inviteCopied
                  ? 'sellerAffiliate.promoterInviteCopied'
                  : 'sellerAffiliate.copyPromoterInvite'
              )}
            </Button>
          ) : null}
        </div>
        {!program && !loading ? (
          <p className="text-xs text-muted-foreground" data-testid="affiliate-invite-hint">
            {t('sellerAffiliate.saveBeforeInvite')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
});
