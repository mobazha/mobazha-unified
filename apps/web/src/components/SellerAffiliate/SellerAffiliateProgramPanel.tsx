// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import {
  renderPairedPrice,
  sellerAffiliateAttributionInput,
  sellerAffiliateAttributionWindowAdvice,
  sellerAffiliateAttributionWindowCopy,
  sellerAffiliateAttributionSecondsFromInput,
  useCurrencyFormat,
  useI18n,
  useSellerAffiliateCapabilities,
  useSellerAffiliateLinks,
  useSellerAffiliateProgram,
  useSellerAffiliateStatements,
  useStoreCredentialRecovery,
  truncateAddress,
  type SellerAffiliateAttributionUnit,
  type UseSellerAffiliateProgramReturn,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { copyToClipboard } from '@/lib/clipboard';
import { StoreCredentialNotice } from '@/components/common/StoreCredentialNotice';
import { AffiliateRailChips } from './AffiliateRailChips';
import { usePeerDisplayProfiles } from './usePeerDisplayProfiles';

const ATTRIBUTION_WINDOW_PRESET_DAYS = [7, 14, 30] as const;

export interface SellerAffiliateProgramPanelProps {
  /**
   * Lifts program state to the page so a sibling (the statements panel) can gate
   * on program existence and stay in sync with a save here. When omitted, the
   * panel owns the state through its own hook instance.
   */
  programState?: UseSellerAffiliateProgramReturn;
  /**
   * Whether the settings form starts expanded when a program already exists.
   * Returning sellers mostly come back to check money, not edit terms, so the
   * admin page passes false to fold the form behind a one-line summary. A
   * missing program always forces the form open (there is nothing to fold).
   */
  defaultConfigExpanded?: boolean;
}

export const SellerAffiliateProgramPanel = memo(function SellerAffiliateProgramPanel({
  programState,
  defaultConfigExpanded = true,
}: SellerAffiliateProgramPanelProps = {}) {
  const { t } = useI18n();
  // Always call the hook (rules of hooks); disable its fetch when the page owns
  // the state and passes it in, so there is exactly one request in flight.
  const ownProgramState = useSellerAffiliateProgram(programState === undefined);
  const { program, loading, error, errorCause, reload, save } = programState ?? ownProgramState;
  // Recovery differs by denial kind: STORE_CREDENTIAL_INVALID re-registers the
  // store's OWN signed credential via the local node (never OAuth), while
  // ACCOUNT_STORE_MISMATCH switches/disconnects and ACCOUNT_SESSION_REQUIRED
  // connects the optional platform account. Each reloads only after it succeeds;
  // connecting an account never grants the store's own key authority.
  const recovery = useStoreCredentialRecovery(reload);
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
  const [windowValue, setWindowValue] = useState('30');
  const [windowUnit, setWindowUnit] = useState<SellerAffiliateAttributionUnit>('day');
  // The id of the program the form fields currently reflect. Hydration runs in
  // an effect (after commit), so on the first render where a program arrives the
  // fields still hold their placeholder defaults ('5'/'30'). Tracking which
  // program the fields belong to lets `dirty` ignore that pre-hydration gap
  // instead of misreading the defaults as unsaved edits.
  const [hydratedProgramId, setHydratedProgramId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The raw cause behind saveError, kept so a typed store-credential denial can
  // render its recovery state instead of a bare message.
  const [saveErrorCause, setSaveErrorCause] = useState<unknown>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [confirmRevokeID, setConfirmRevokeID] = useState<string | null>(null);
  const [revokingID, setRevokingID] = useState<string | null>(null);
  // Rails settle automatically, so the full list stays folded behind a summary.
  const [railsExpanded, setRailsExpanded] = useState(false);
  // null = no explicit choice yet; the default then depends on the page intent.
  const [configExpandedPref, setConfigExpandedPref] = useState<boolean | null>(null);
  const configExpanded = program ? (configExpandedPref ?? defaultConfigExpanded) : true;
  const { localCurrency } = useCurrencyFormat();
  // Per-promoter performance for the links list. Fetched only once a program
  // and at least one link exist, so the empty/creation states stay one-request.
  const { statements } = useSellerAffiliateStatements(
    'seller',
    Boolean(program) && links.length > 0
  );

  const linkPromoterIDs = useMemo(() => links.map(link => link.promoterPeerID), [links]);
  const promoterProfiles = usePeerDisplayProfiles(linkPromoterIDs);

  /** promoterPeerID → attributed order count + commission totals per currency. */
  const promoterStats = useMemo(() => {
    const stats = new Map<string, { orders: Set<string>; byCurrency: Map<string, bigint> }>();
    for (const line of statements) {
      const promoter = line.attribution.promoterPeerID;
      if (!promoter) continue;
      let entry = stats.get(promoter);
      if (!entry) {
        entry = { orders: new Set(), byCurrency: new Map() };
        stats.set(promoter, entry);
      }
      entry.orders.add(line.commissionLine.orderID);
      // Reversed lines took the commission back — they still count as
      // attributed orders but must not inflate the earned total.
      if (line.commissionLine.status !== 'reversed') {
        const currency = line.commissionLine.currency;
        entry.byCurrency.set(
          currency,
          (entry.byCurrency.get(currency) ?? BigInt(0)) +
            BigInt(line.commissionLine.commissionAtomic)
        );
      }
    }
    return stats;
  }, [statements]);

  useEffect(() => {
    if (!program) return;
    const windowInput = sellerAffiliateAttributionInput(program.attributionWindowSeconds);
    setRate(String(program.commissionRateBPS / 100));
    setWindowValue(windowInput.value);
    setWindowUnit(windowInput.unit);
    setHydratedProgramId(program.id);
  }, [program]);

  const effectiveWindowSeconds = sellerAffiliateAttributionSecondsFromInput(
    windowValue,
    windowUnit
  );

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
  const windowInvalid = windowValue.trim() !== '' && effectiveWindowSeconds === null;
  const formInvalid = rateInvalid || windowInvalid;
  // The form differs from what is persisted. Compared against the exact strings
  // the fields hydrate to, so an untouched form is never seen as dirty. Gated on
  // hydratedProgramId === program.id so the brief pre-hydration render (fields
  // still on their '5'/'30' defaults) never reads as a false dirty edit.
  const persistedWindowInput = program
    ? sellerAffiliateAttributionInput(program.attributionWindowSeconds)
    : null;
  // Human copy for the stored window ("7 days"), shown in the collapsed summary.
  const persistedWindowCopy = program
    ? sellerAffiliateAttributionWindowCopy(program.attributionWindowSeconds)
    : null;
  const persistedWindowSummary = persistedWindowCopy
    ? t(persistedWindowCopy.key, persistedWindowCopy.params)
    : '';
  const dirty =
    program !== null &&
    hydratedProgramId === program.id &&
    (rate !== String(program.commissionRateBPS / 100) ||
      windowValue !== persistedWindowInput?.value ||
      windowUnit !== persistedWindowInput?.unit);

  const handleWindowPreset = useCallback((days: number): void => {
    setWindowValue(String(days));
    setWindowUnit('day');
  }, []);

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
        setSaveErrorCause(null);
        return;
      }
      setSaving(true);
      setSaveError(null);
      setSaveErrorCause(null);
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
        setSaveErrorCause(cause);
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
    setSaveErrorCause(null);
    try {
      await save({
        status: program.status === 'active' ? 'paused' : 'active',
        commissionRateBPS: program.commissionRateBPS,
        attributionWindowSeconds: program.attributionWindowSeconds,
      });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : t('sellerAffiliate.saveFailed'));
      setSaveErrorCause(cause);
    } finally {
      setSaving(false);
    }
  }, [program, save, t]);

  const handleCopyPromoterInvite = useCallback(async (): Promise<void> => {
    if (!program || typeof window === 'undefined') return;
    const inviteURL = new URL(
      `/promote/${encodeURIComponent(program.sellerPeerID)}/${encodeURIComponent(program.id)}`,
      window.location.origin
    );
    const copied = await copyToClipboard(inviteURL.toString());
    if (!copied) {
      setSaveError(t('sellerAffiliate.copyInviteFailed'));
      setSaveErrorCause(null);
      return;
    }
    setSaveError(null);
    setSaveErrorCause(null);
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
      setSaveErrorCause(null);
      try {
        await revoke(linkID);
        setConfirmRevokeID(null);
      } catch (cause) {
        setSaveError(cause instanceof Error ? cause.message : t('sellerAffiliate.revokeFailed'));
        setSaveErrorCause(cause);
      } finally {
        setRevokingID(null);
      }
    },
    [confirmRevokeID, revoke, t]
  );

  return (
    <Card data-testid="seller-affiliate-program-panel" aria-busy={loading || saving}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{t('sellerAffiliate.programTitle')}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('sellerAffiliate.programDescription')}
          </p>
        </div>
        {program ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9 shrink-0"
            onClick={() => setConfigExpandedPref(!configExpanded)}
            aria-expanded={configExpanded}
            data-testid="affiliate-config-toggle"
          >
            {configExpanded ? (
              <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
            ) : (
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t(configExpanded ? 'sellerAffiliate.hideSettings' : 'sellerAffiliate.editSettings')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <StoreCredentialNotice
            error={errorCause}
            onRefreshCredential={() => void recovery.refreshCredential()}
            onSwitchAccount={() => void recovery.switchAccount()}
            onDisconnect={() => void recovery.disconnect()}
            onConnect={() => void recovery.connect()}
            onRetry={() => void recovery.retry()}
            busyAction={recovery.busyAction}
            failedAction={recovery.failedAction}
            fallback={
              <p className="text-sm text-destructive" role="alert">
                {t('sellerAffiliate.programLoadFailed')}
              </p>
            }
          />
        ) : null}
        {program && !configExpanded ? (
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2"
            data-testid="affiliate-config-summary"
          >
            <span
              className={
                program.status === 'active'
                  ? 'inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600'
                  : 'inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'
              }
              data-status={program.status}
            >
              {t(program.status === 'active' ? 'sellerAffiliate.active' : 'sellerAffiliate.paused')}
            </span>
            <span className="text-sm font-medium">{program.commissionRateBPS / 100}%</span>
            <span className="text-sm text-muted-foreground">{persistedWindowSummary}</span>
            <span className="text-sm text-muted-foreground">
              {t('sellerAffiliate.summaryLinks', { count: String(links.length) })}
            </span>
          </div>
        ) : null}
        {program && configExpanded ? (
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
        {configExpanded ? (
          <>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <div className="space-y-4" data-testid="affiliate-commission-column">
                <div className="space-y-2">
                  <Label htmlFor="affiliate-rate">{t('sellerAffiliate.commissionRate')}</Label>
                  <div className="relative">
                    <Input
                      id="affiliate-rate"
                      className="min-h-11 pr-10"
                      inputMode="decimal"
                      value={rate}
                      onChange={event => setRate(event.target.value)}
                      disabled={loading}
                      aria-invalid={rateInvalid}
                    />
                    <span
                      className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground"
                      aria-hidden="true"
                      data-testid="affiliate-rate-suffix"
                    >
                      %
                    </span>
                  </div>
                  {rateInvalid ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      data-testid="affiliate-rate-error"
                    >
                      {t('sellerAffiliate.invalidRate')}
                    </p>
                  ) : null}
                </div>
                {commissionExample ? (
                  <div
                    className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 sm:p-4"
                    data-testid="affiliate-cost-preview"
                  >
                    <p className="text-sm font-medium">{t('sellerAffiliate.costPreviewTitle')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('sellerAffiliate.costPreviewBody')}
                    </p>
                    <p
                      className="text-xs font-medium text-foreground"
                      data-testid="affiliate-cost-example"
                    >
                      {t('sellerAffiliate.costPreviewExample', {
                        percent: rate.trim(),
                        commission: commissionExample,
                      })}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2" data-testid="affiliate-attribution-column">
                <Label id="affiliate-window-label" htmlFor="affiliate-window">
                  {t('sellerAffiliate.attributionWindow')}
                </Label>
                <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-2">
                  <Input
                    id="affiliate-window"
                    className="min-h-11"
                    inputMode="decimal"
                    value={windowValue}
                    onChange={event => setWindowValue(event.target.value)}
                    disabled={loading}
                    aria-invalid={windowInvalid}
                    aria-describedby="affiliate-window-help"
                  />
                  <Select
                    value={windowUnit}
                    onValueChange={value => setWindowUnit(value as SellerAffiliateAttributionUnit)}
                    disabled={loading}
                  >
                    <SelectTrigger
                      className="min-h-11"
                      aria-label={t('sellerAffiliate.attributionWindowUnit')}
                      data-testid="affiliate-window-unit"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">{t('sellerAffiliate.unitDays')}</SelectItem>
                      <SelectItem value="hour">{t('sellerAffiliate.unitHours')}</SelectItem>
                      <SelectItem value="minute">{t('sellerAffiliate.unitMinutes')}</SelectItem>
                      <SelectItem value="second">{t('sellerAffiliate.unitSeconds')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p
                  id="affiliate-window-help"
                  className="text-xs text-muted-foreground"
                  data-testid="affiliate-window-help"
                >
                  {t('sellerAffiliate.attributionWindowHelp')}
                </p>
                {windowInvalid ? (
                  <p
                    className="text-xs font-medium text-destructive"
                    data-testid="affiliate-window-error"
                  >
                    {t('sellerAffiliate.invalidWindow')}
                  </p>
                ) : null}
                <div
                  className="flex flex-wrap items-center gap-2"
                  aria-label={t('sellerAffiliate.attributionWindowPresets')}
                >
                  <span className="text-xs text-muted-foreground">
                    {t('sellerAffiliate.attributionWindowPresets')}
                  </span>
                  {ATTRIBUTION_WINDOW_PRESET_DAYS.map(days => (
                    <Button
                      key={days}
                      type="button"
                      variant={effectiveWindowSeconds === days * 86_400 ? 'secondary' : 'outline'}
                      size="sm"
                      className="min-h-11"
                      onClick={() => handleWindowPreset(days)}
                      disabled={loading}
                      aria-pressed={effectiveWindowSeconds === days * 86_400}
                      data-testid={`affiliate-window-preset-${days}`}
                    >
                      {t('sellerAffiliate.windowDays', { count: String(days) })}
                    </Button>
                  ))}
                </div>
                {windowAdvice ? (
                  <div
                    className="flex gap-2 rounded-lg border border-amber-300 bg-amber-100 p-3 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                    data-testid="affiliate-window-advice"
                    data-advice={windowAdvice}
                    role="status"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="text-xs font-medium">
                      {t(
                        windowAdvice === 'too_short'
                          ? 'sellerAffiliate.attributionWindowTooShort'
                          : 'sellerAffiliate.attributionWindowRecommend'
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2" aria-busy={capabilitiesLoading}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('sellerAffiliate.supportedRails')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('sellerAffiliate.railsSummary')}
                  </p>
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
              <p
                className="text-xs text-muted-foreground/80"
                data-testid="affiliate-rails-history-note"
              >
                {t('sellerAffiliate.railsHistoryNote')}
              </p>
            </div>
          </>
        ) : null}
        {program ? (
          <div className="space-y-2" aria-busy={linksLoading}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('sellerAffiliate.promoterLinks')}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
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
            </div>
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
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/store/${encodeURIComponent(link.promoterPeerID)}`}
                      className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                      title={link.promoterPeerID}
                    >
                      {promoterProfiles.get(link.promoterPeerID)?.name || (
                        <span className="font-mono text-xs">
                          {truncateAddress(link.promoterPeerID)}
                        </span>
                      )}
                    </Link>
                    <span
                      className={
                        link.status === 'active'
                          ? 'rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600'
                          : 'rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'
                      }
                    >
                      {t(
                        link.status === 'active'
                          ? 'sellerAffiliate.linkActive'
                          : 'sellerAffiliate.linkRevoked'
                      )}
                    </span>
                  </div>
                  {(() => {
                    const stats = promoterStats.get(link.promoterPeerID);
                    if (!stats || stats.orders.size === 0) {
                      return (
                        <p className="text-xs text-muted-foreground">
                          {t('sellerAffiliate.noLinkActivity')}
                        </p>
                      );
                    }
                    const amounts = Array.from(stats.byCurrency.entries())
                      .map(([currency, total]) =>
                        renderPairedPrice(total.toString(), currency, localCurrency, {
                          isMinimalUnit: true,
                        })
                      )
                      .join(' · ');
                    return (
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid="affiliate-link-stats"
                      >
                        {t('sellerAffiliate.linkOrdersCount', {
                          count: String(stats.orders.size),
                        })}
                        {amounts ? ` · ${amounts}` : ''}
                      </p>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground">
                    {t('sellerAffiliate.linkCreatedAt', {
                      date: new Date(link.createdAt).toLocaleDateString(),
                    })}
                  </p>
                </div>
                {link.status === 'active' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={confirmRevokeID === link.id ? 'destructive' : 'ghost'}
                    className="min-h-9 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => void handleRevokeLink(link.id)}
                    disabled={revokingID === link.id}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
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
          <StoreCredentialNotice
            error={saveErrorCause}
            onRefreshCredential={() => void recovery.refreshCredential()}
            onSwitchAccount={() => void recovery.switchAccount()}
            onDisconnect={() => void recovery.disconnect()}
            onConnect={() => void recovery.connect()}
            onRetry={() => void recovery.retry()}
            busyAction={recovery.busyAction}
            failedAction={recovery.failedAction}
            fallback={
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            }
          />
        ) : null}
        {configExpanded ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="min-h-11"
              onClick={() =>
                void handleSave(program ? program.status : 'active', { confirm: true })
              }
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
            {dirty ? (
              <p
                className="text-xs font-medium text-amber-600 dark:text-amber-400"
                data-testid="affiliate-unsaved-hint"
              >
                {t('sellerAffiliate.unsavedChanges')}
              </p>
            ) : null}
          </div>
        ) : null}
        {!program && !loading ? (
          <p className="text-xs text-muted-foreground" data-testid="affiliate-invite-hint">
            {t('sellerAffiliate.saveBeforeInvite')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
});
