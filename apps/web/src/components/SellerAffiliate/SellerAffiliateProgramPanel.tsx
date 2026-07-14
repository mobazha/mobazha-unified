// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Check, Copy, Plus, Save, Trash2 } from 'lucide-react';
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
  type UseSellerAffiliateProgramReturn,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { copyToClipboard } from '@/lib/clipboard';
import { AffiliateRailChips } from './AffiliateRailChips';

export interface SellerAffiliateProgramPanelProps {
  /**
   * Lifts program state to the page so a sibling (the statements panel) can gate
   * on program existence and stay in sync with a save here. When omitted, the
   * panel owns the state through its own hook instance.
   */
  programState?: UseSellerAffiliateProgramReturn;
}

export const SellerAffiliateProgramPanel = memo(function SellerAffiliateProgramPanel({
  programState,
}: SellerAffiliateProgramPanelProps = {}) {
  const { t } = useI18n();
  // Always call the hook (rules of hooks); disable its fetch when the page owns
  // the state and passes it in, so there is exactly one request in flight.
  const ownProgramState = useSellerAffiliateProgram(programState === undefined);
  const { program, loading, error, save } = programState ?? ownProgramState;
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
  const [rate, setRate] = useState('5');
  const [windowDays, setWindowDays] = useState('30');
  // The id of the program the form fields currently reflect. Hydration runs in
  // an effect (after commit), so on the first render where a program arrives the
  // fields still hold their placeholder defaults ('5'/'30'). Tracking which
  // program the fields belong to lets `dirty` ignore that pre-hydration gap
  // instead of misreading the defaults as unsaved edits.
  const [hydratedProgramId, setHydratedProgramId] = useState<string | null>(null);
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
  // Rails settle automatically, so the full list stays folded behind a summary.
  const [railsExpanded, setRailsExpanded] = useState(false);

  useEffect(() => {
    if (!program) return;
    setRate(String(program.commissionRateBPS / 100));
    setSavedWindowSeconds(program.attributionWindowSeconds);
    setWindowDays(sellerAffiliateAttributionDaysInput(program.attributionWindowSeconds));
    setHydratedProgramId(program.id);
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
  // A non-empty window that fails to parse into a valid duration. Kept separate
  // from the "too short" advice, which flags a valid-but-weak window.
  const windowInvalid = windowDays.trim() !== '' && effectiveWindowSeconds === null;
  const formInvalid = rateInvalid || windowInvalid;
  // The form differs from what is persisted. Compared against the exact strings
  // the fields hydrate to, so an untouched form is never seen as dirty. Gated on
  // hydratedProgramId === program.id so the brief pre-hydration render (fields
  // still on their '5'/'30' defaults) never reads as a false dirty edit.
  const dirty =
    program !== null &&
    hydratedProgramId === program.id &&
    (rate !== String(program.commissionRateBPS / 100) ||
      windowDays !== sellerAffiliateAttributionDaysInput(program.attributionWindowSeconds));

  // Worked commission cost on a 100-unit net-merchandise sale (base 100 makes
  // the payout equal the rate). Only shown when the rate parses to a valid %.
  const commissionExample =
    !rateInvalid && rate.trim() !== '' && Number.isFinite(rateNumber)
      ? Number(rateNumber.toFixed(2)).toString()
      : null;

  // Save persists the form at an explicit status. First-time creation activates;
  // an existing program keeps its status on save and flips it only through the
  // dedicated enable/pause action — a save must never silently un-pause a program.
  // Only the primary save button confirms with a transient "saved" state; the
  // status toggle's own badge flip is its confirmation.
  const handleSave = useCallback(
    async (nextStatus: 'active' | 'paused', options?: { confirm?: boolean }): Promise<void> => {
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
          status: nextStatus,
          commissionRateBPS: Math.round(rateValue * 100),
          attributionWindowSeconds: effectiveWindowSeconds,
        });
        if (options?.confirm) {
          setSavedRecently(true);
          window.setTimeout(() => setSavedRecently(false), 2000);
        }
      } catch (cause) {
        setSaveError(cause instanceof Error ? cause.message : t('sellerAffiliate.saveFailed'));
      } finally {
        setSaving(false);
      }
    },
    [effectiveWindowSeconds, rate, save, t]
  );

  // Enable/pause is a status-only action: it persists the program's stored rate
  // and window, never the form's possibly-edited values, so pausing can't
  // silently commit an unsaved commission change. The button is disabled while
  // the form is dirty, so this path only ever runs on an untouched form.
  const handleToggleStatus = useCallback(async (): Promise<void> => {
    if (!program) return;
    setSaving(true);
    setSaveError(null);
    try {
      await save({
        status: program.status === 'active' ? 'paused' : 'active',
        commissionRateBPS: program.commissionRateBPS,
        attributionWindowSeconds: program.attributionWindowSeconds,
      });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : t('sellerAffiliate.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [program, save, t]);

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
        {program ? (
          <div className="space-y-2" data-testid="affiliate-status-row">
            <p className="text-sm font-medium">{t('sellerAffiliate.status')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={
                  program.status === 'active'
                    ? 'inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600'
                    : 'inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'
                }
                data-testid="affiliate-status-badge"
                data-status={program.status}
              >
                {t(
                  program.status === 'active' ? 'sellerAffiliate.active' : 'sellerAffiliate.paused'
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={() => void handleToggleStatus()}
                disabled={loading || saving || dirty}
                data-testid="affiliate-status-toggle"
              >
                {t(
                  program.status === 'active'
                    ? 'sellerAffiliate.pauseProgram'
                    : 'sellerAffiliate.activateProgram'
                )}
              </Button>
            </div>
            {dirty ? (
              <p
                className="text-xs text-muted-foreground"
                data-testid="affiliate-status-dirty-hint"
              >
                {t('sellerAffiliate.statusDirtyHint')}
              </p>
            ) : program.status === 'paused' ? (
              <p className="text-xs text-muted-foreground" data-testid="affiliate-paused-hint">
                {t('sellerAffiliate.pausedHint')}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
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
              aria-invalid={windowInvalid}
            />
            {windowInvalid ? (
              <p
                className="text-xs font-medium text-destructive"
                data-testid="affiliate-window-error"
              >
                {t('sellerAffiliate.invalidWindow')}
              </p>
            ) : null}
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
        {commissionExample ? (
          <div
            className="space-y-1 rounded-lg border border-border bg-muted/30 p-3"
            data-testid="affiliate-cost-preview"
          >
            <p className="text-sm font-medium">{t('sellerAffiliate.costPreviewTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('sellerAffiliate.costPreviewBody')}</p>
            <p className="text-xs font-medium text-foreground" data-testid="affiliate-cost-example">
              {t('sellerAffiliate.costPreviewExample', {
                percent: rate.trim(),
                commission: commissionExample,
              })}
            </p>
          </div>
        ) : null}
        <div className="space-y-2" aria-busy={capabilitiesLoading}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t('sellerAffiliate.supportedRails')}</p>
              <p className="text-xs text-muted-foreground">{t('sellerAffiliate.railsSummary')}</p>
            </div>
            {(capabilities?.rails.length ?? 0) > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-9 shrink-0"
                onClick={() => setRailsExpanded(value => !value)}
                aria-expanded={railsExpanded}
                data-testid="affiliate-rails-toggle"
              >
                {t(railsExpanded ? 'sellerAffiliate.railsHide' : 'sellerAffiliate.railsShow')}
              </Button>
            ) : null}
          </div>
          {(capabilities?.rails.length ?? 0) > 0 && !railsExpanded ? (
            <p className="text-xs text-muted-foreground" data-testid="affiliate-rails-count">
              {t('sellerAffiliate.railsReadyCount', { count: capabilities?.rails.length ?? 0 })}
            </p>
          ) : null}
          {capabilitiesError ? (
            <p className="text-sm text-destructive" role="alert">
              {t('sellerAffiliate.capabilitiesLoadFailed')}
            </p>
          ) : null}
          {railsExpanded ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('sellerAffiliate.noManualWorkflow')}
              </p>
              <AffiliateRailChips rails={capabilities?.rails ?? []} />
            </div>
          ) : null}
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
            onClick={() => void handleSave(program ? program.status : 'active', { confirm: true })}
            disabled={loading || saving || formInvalid}
            data-testid="seller-affiliate-program-save"
          >
            {savedRecently ? (
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : program ? (
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {t(
              savedRecently
                ? 'sellerAffiliate.programSaved'
                : program
                  ? 'sellerAffiliate.saveProgram'
                  : 'sellerAffiliate.createAndActivate'
            )}
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
