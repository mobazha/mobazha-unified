// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Check, Copy, Save, Trash2 } from 'lucide-react';
import {
  getPaymentCoinDisplayLabel,
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [confirmRevokeID, setConfirmRevokeID] = useState<string | null>(null);
  const [revokingID, setRevokingID] = useState<string | null>(null);

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
        <div className="space-y-2" aria-busy={capabilitiesLoading}>
          <p className="text-sm font-medium">{t('sellerAffiliate.supportedRails')}</p>
          {capabilitiesError ? (
            <p className="text-sm text-destructive" role="alert">
              {t('sellerAffiliate.capabilitiesLoadFailed')}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {capabilities?.rails.map(rail => (
              <span
                key={rail.railID}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {getPaymentCoinDisplayLabel(rail.railID)}
                {rail.guestSupport ? ` · ${t('sellerAffiliate.guestSupported')}` : ''}
              </span>
            ))}
            {!capabilitiesLoading && !capabilitiesError && !capabilities?.rails.length ? (
              <span className="text-sm text-destructive">
                {t('sellerAffiliate.noSupportedRails')}
              </span>
            ) : null}
          </div>
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
            disabled={loading || saving}
            data-testid="seller-affiliate-program-save"
          >
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('sellerAffiliate.saveProgram')}
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
      </CardContent>
    </Card>
  );
});
