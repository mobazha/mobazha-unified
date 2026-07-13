// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { VStack } from '@/components/layouts';
import { useToast } from '@/components/ui/use-toast';
import { SellerCustodyDepositCard } from '@/components/collectibles/SellerCustodyDepositCard';
import {
  CollectiblesCustodyCountsBar,
  CollectiblesExperienceHeader,
  CollectiblesTrustPanel,
} from '@/components/collectibles/experience';
import {
  groupSellerCustodyWorkspace,
  SELLER_CUSTODY_WORKSPACE_PREVIEW_LIMIT,
  useCollectibleActions,
  validateCollectibleSourceDepositSubmission,
  useI18n,
  type CollectibleSourceDeposit,
} from '@mobazha/core';
import { Loader2, Plus } from 'lucide-react';

export interface CollectibleCardSubmissionsWorkspaceProps {
  enabled?: boolean;
}

type SellerWorkspaceView = 'submit' | 'track';

export function CollectibleCardSubmissionsWorkspace({
  enabled = true,
}: CollectibleCardSubmissionsWorkspaceProps) {
  const { t } = useI18n();
  const collectibleActions = useCollectibleActions();
  const { toast } = useToast();

  const [items, setItems] = useState<CollectibleSourceDeposit[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const [certNumber, setCertNumber] = useState('');
  const [grade, setGrade] = useState('');
  const [serial, setSerial] = useState('');
  const [holderWallet, setHolderWallet] = useState('');
  const [guaranteeAmount, setGuaranteeAmount] = useState('');
  const [guaranteeCurrency, setGuaranteeCurrency] = useState('');
  const [photoFrontUrl, setPhotoFrontUrl] = useState('');
  const [photoBackUrl, setPhotoBackUrl] = useState('');
  const [trackingByDepositId, setTrackingByDepositId] = useState<Record<string, string>>({});
  const [shipTouchedByDepositId, setShipTouchedByDepositId] = useState<Record<string, boolean>>({});
  const [shippingDepositId, setShippingDepositId] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<SellerWorkspaceView>('track');
  const [activeExpanded, setActiveExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const submissionValidation = useMemo(
    () =>
      validateCollectibleSourceDepositSubmission({
        certNumber,
        grade,
        holderWallet,
        photoFrontUrl,
        photoBackUrl,
        guaranteeAmount,
        guaranteeCurrency,
      }),
    [
      certNumber,
      grade,
      holderWallet,
      photoFrontUrl,
      photoBackUrl,
      guaranteeAmount,
      guaranteeCurrency,
    ]
  );

  const canSubmit = submissionValidation.valid && !submitting;

  const fieldError = (key: keyof typeof submissionValidation.errors) =>
    touched && submissionValidation.errors[key]
      ? t(`marketplace.sell.collectibles.workspace.validation.${key}`)
      : null;

  const loadSubmissions = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await collectibleActions.listMyCollectibleSourceDeposits({
        page: 1,
        pageSize: 50,
      });
      setItems(result.items ?? []);
    } catch (err) {
      setItems([]);
      setLoadError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [collectibleActions, enabled, t]);

  React.useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const workspaceGroups = useMemo(() => groupSellerCustodyWorkspace(items), [items]);

  const visibleActive = useMemo(() => {
    if (activeExpanded) return workspaceGroups.active;
    return workspaceGroups.active.slice(0, SELLER_CUSTODY_WORKSPACE_PREVIEW_LIMIT);
  }, [activeExpanded, workspaceGroups.active]);

  const visibleHistory = useMemo(() => {
    if (historyExpanded) return workspaceGroups.history;
    return workspaceGroups.history.slice(0, SELLER_CUSTODY_WORKSPACE_PREVIEW_LIMIT);
  }, [historyExpanded, workspaceGroups.history]);

  const activeHasMore = workspaceGroups.active.length > SELLER_CUSTODY_WORKSPACE_PREVIEW_LIMIT;
  const historyHasMore = workspaceGroups.history.length > SELLER_CUSTODY_WORKSPACE_PREVIEW_LIMIT;

  const resetForm = () => {
    setCertNumber('');
    setGrade('');
    setSerial('');
    setHolderWallet('');
    setGuaranteeAmount('');
    setGuaranteeCurrency('');
    setPhotoFrontUrl('');
    setPhotoBackUrl('');
    setTouched(false);
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await collectibleActions.submitMyCollectibleSourceDeposit({
        certNumber: certNumber.trim(),
        holderWallet: holderWallet.trim(),
        grade: grade.trim(),
        serial: serial.trim() || undefined,
        photos: [photoFrontUrl.trim(), photoBackUrl.trim()],
        guaranteeAmount: guaranteeAmount.trim() || undefined,
        guaranteeCurrency: guaranteeCurrency.trim() || undefined,
      });
      toast({
        title: t('common.success'),
        description: t('marketplace.sell.collectibles.workspace.submitSuccess'),
        variant: 'success',
      });
      resetForm();
      setWorkspaceView('track');
      await loadSubmissions();
    } catch (err) {
      toast({
        title: t('common.error'),
        description:
          err instanceof Error
            ? err.message
            : t('marketplace.sell.collectibles.workspace.submitFailed'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkShipped = async (deposit: CollectibleSourceDeposit) => {
    const depositId = deposit.sourceDepositID;
    setShipTouchedByDepositId(prev => ({ ...prev, [depositId]: true }));
    const trackingNo = (trackingByDepositId[depositId] ?? '').trim();
    if (!trackingNo || shippingDepositId) return;

    setShippingDepositId(depositId);
    try {
      await collectibleActions.shipMyCollectibleSourceDeposit(depositId, { trackingNo });
      toast({
        title: t('common.success'),
        description: t('marketplace.sell.collectibles.workspace.shipSuccess'),
        variant: 'success',
      });
      setTrackingByDepositId(prev => {
        const next = { ...prev };
        delete next[depositId];
        return next;
      });
      setShipTouchedByDepositId(prev => {
        const next = { ...prev };
        delete next[depositId];
        return next;
      });
      await loadSubmissions();
    } catch (err) {
      toast({
        title: t('common.error'),
        description:
          err instanceof Error
            ? err.message
            : t('marketplace.sell.collectibles.workspace.shipFailed'),
        variant: 'destructive',
      });
    } finally {
      setShippingDepositId(null);
    }
  };

  const renderDepositCard = (
    deposit: CollectibleSourceDeposit,
    options?: { dominant?: boolean; quiet?: boolean; compact?: boolean }
  ) => {
    const depositId = deposit.sourceDepositID;
    const dominant = options?.dominant ?? false;
    const quiet = options?.quiet ?? false;
    const compact = options?.compact ?? false;
    return (
      <SellerCustodyDepositCard
        key={depositId}
        deposit={deposit}
        dominant={dominant}
        quiet={quiet}
        compact={compact}
        trackingNo={trackingByDepositId[depositId] ?? ''}
        trackingTouched={shipTouchedByDepositId[depositId] ?? false}
        isShipping={shippingDepositId === depositId}
        shippingBlocked={Boolean(shippingDepositId && shippingDepositId !== depositId)}
        onTrackingChange={value =>
          setTrackingByDepositId(prev => ({ ...prev, [depositId]: value }))
        }
        onTrackingBlur={() => setShipTouchedByDepositId(prev => ({ ...prev, [depositId]: true }))}
        onMarkShipped={() => void handleMarkShipped(deposit)}
        onUpdated={loadSubmissions}
      />
    );
  };

  return (
    <Card className="p-4 sm:p-6" data-testid="collectible-card-submissions-workspace">
      <CollectiblesExperienceHeader
        variant="section"
        title={t('marketplace.sell.collectibles.workspace.title')}
        subtitle={t('marketplace.sell.collectibles.workspace.subtitle')}
      />

      <CollectiblesTrustPanel variant="seller" className="mb-4" />

      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label={t('marketplace.sell.collectibles.workspace.viewAria')}
      >
        <Button
          type="button"
          size="sm"
          className="min-h-[44px]"
          variant={workspaceView === 'track' ? 'default' : 'outline'}
          role="tab"
          aria-selected={workspaceView === 'track'}
          onClick={() => setWorkspaceView('track')}
          data-testid="collectible-workspace-tab-track"
        >
          {t('marketplace.sell.collectibles.workspace.tabTrack')}
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-h-[44px]"
          variant={workspaceView === 'submit' ? 'default' : 'outline'}
          role="tab"
          aria-selected={workspaceView === 'submit'}
          onClick={() => setWorkspaceView('submit')}
          data-testid="collectible-workspace-tab-submit"
        >
          {t('marketplace.sell.collectibles.workspace.tabSubmit')}
        </Button>
      </div>

      {workspaceView === 'submit' ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('marketplace.sell.collectibles.workspace.submitIntro')}
          </p>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="submission-cert">
                {t('marketplace.sell.collectibles.workspace.certNumber')}
              </label>
              <Input
                id="submission-cert"
                value={certNumber}
                onChange={event => setCertNumber(event.target.value)}
                onBlur={() => setTouched(true)}
                required
                aria-invalid={Boolean(fieldError('certNumber'))}
                aria-describedby={fieldError('certNumber') ? 'submission-cert-error' : undefined}
                autoComplete="off"
              />
              {fieldError('certNumber') ? (
                <p id="submission-cert-error" className="text-xs text-destructive" role="alert">
                  {fieldError('certNumber')}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="submission-grade">
                {t('marketplace.sell.collectibles.workspace.grade')}
              </label>
              <Input
                id="submission-grade"
                value={grade}
                onChange={event => setGrade(event.target.value)}
                onBlur={() => setTouched(true)}
                required
                aria-invalid={Boolean(fieldError('grade'))}
                aria-describedby={fieldError('grade') ? 'submission-grade-error' : undefined}
                autoComplete="off"
              />
              {fieldError('grade') ? (
                <p id="submission-grade-error" className="text-xs text-destructive" role="alert">
                  {fieldError('grade')}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="submission-serial">
                {t('marketplace.sell.collectibles.workspace.serial')}
              </label>
              <Input
                id="submission-serial"
                value={serial}
                onChange={event => setSerial(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="submission-holder">
                {t('marketplace.sell.collectibles.workspace.holderWallet')}
              </label>
              <Input
                id="submission-holder"
                value={holderWallet}
                onChange={event => setHolderWallet(event.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={t('marketplace.sell.collectibles.workspace.holderWalletPlaceholder')}
                required
                aria-invalid={Boolean(fieldError('holderWallet'))}
                aria-describedby={
                  fieldError('holderWallet') ? 'submission-holder-error' : undefined
                }
                autoComplete="off"
              />
              {fieldError('holderWallet') ? (
                <p id="submission-holder-error" className="text-xs text-destructive" role="alert">
                  {fieldError('holderWallet')}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('marketplace.sell.collectibles.workspace.holderWalletHint')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="submission-guarantee-amount"
              >
                {t('marketplace.sell.collectibles.workspace.guaranteeAmount')}
              </label>
              <Input
                id="submission-guarantee-amount"
                value={guaranteeAmount}
                onChange={event => setGuaranteeAmount(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(fieldError('guaranteeAmount'))}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="submission-guarantee-currency"
              >
                {t('marketplace.sell.collectibles.workspace.guaranteeCurrency')}
              </label>
              <Input
                id="submission-guarantee-currency"
                value={guaranteeCurrency}
                onChange={event => setGuaranteeCurrency(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(fieldError('guaranteeCurrency'))}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="submission-photo-front"
              >
                {t('marketplace.sell.collectibles.workspace.photoFrontUrl')}
              </label>
              <Input
                id="submission-photo-front"
                value={photoFrontUrl}
                onChange={event => setPhotoFrontUrl(event.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="https://"
                inputMode="url"
                required
                aria-invalid={Boolean(fieldError('photoFrontUrl') || fieldError('photosDistinct'))}
                aria-describedby={
                  fieldError('photoFrontUrl') || fieldError('photosDistinct')
                    ? 'submission-photo-front-error'
                    : undefined
                }
                autoComplete="off"
              />
              {fieldError('photoFrontUrl') ? (
                <p
                  id="submission-photo-front-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError('photoFrontUrl')}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="submission-photo-back"
              >
                {t('marketplace.sell.collectibles.workspace.photoBackUrl')}
              </label>
              <Input
                id="submission-photo-back"
                value={photoBackUrl}
                onChange={event => setPhotoBackUrl(event.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="https://"
                inputMode="url"
                required
                aria-invalid={Boolean(fieldError('photoBackUrl') || fieldError('photosDistinct'))}
                aria-describedby={
                  fieldError('photoBackUrl') || fieldError('photosDistinct')
                    ? 'submission-photo-back-error'
                    : undefined
                }
                autoComplete="off"
              />
              {fieldError('photoBackUrl') ? (
                <p
                  id="submission-photo-back-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError('photoBackUrl')}
                </p>
              ) : null}
              {fieldError('photosDistinct') ? (
                <p className="text-xs text-destructive" role="alert">
                  {fieldError('photosDistinct')}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            className="mb-6 min-h-[44px] w-full sm:w-auto"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('marketplace.sell.collectibles.workspace.submitCard')}
          </Button>
        </>
      ) : (
        <div className="border-t border-border pt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {t('marketplace.sell.collectibles.workspace.trackIntro')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => setWorkspaceView('submit')}
              data-testid="collectible-workspace-empty-cta"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t('marketplace.sell.collectibles.workspace.tabSubmit')}
            </Button>
          </div>

          <CollectiblesCustodyCountsBar counts={workspaceGroups.counts} className="mb-4" />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('marketplace.sell.collectibles.workspace.mySubmissionsTitle')}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => void loadSubmissions()}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {t('common.refresh')}
            </Button>
          </div>

          {loadError ? (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <Card className="space-y-3 p-4 text-center" data-testid="collectible-submissions-empty">
              <p className="text-sm text-muted-foreground">
                {t('marketplace.sell.collectibles.workspace.emptySubmissions')}
              </p>
              <Button
                type="button"
                className="min-h-[44px] w-full sm:w-auto"
                onClick={() => setWorkspaceView('submit')}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {t('marketplace.sell.collectibles.workspace.emptySubmitCta')}
              </Button>
            </Card>
          ) : (
            <VStack gap="md">
              {workspaceGroups.nextAction ? (
                <section
                  aria-label={t('marketplace.sell.collectibles.workspace.nextActionSection')}
                >
                  <h4 className="mb-2 text-sm font-semibold text-foreground">
                    {t('marketplace.sell.collectibles.workspace.nextActionSection')}
                  </h4>
                  {renderDepositCard(workspaceGroups.nextAction, { dominant: true })}
                </section>
              ) : null}

              {workspaceGroups.active.length > 0 ? (
                <section aria-label={t('marketplace.sell.collectibles.workspace.activeSection')}>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">
                    {t('marketplace.sell.collectibles.workspace.activeSection')}
                  </h4>
                  <VStack gap="sm">
                    {visibleActive.map(deposit => renderDepositCard(deposit, { compact: true }))}
                  </VStack>
                  {activeHasMore ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 min-h-[44px] text-primary"
                      aria-expanded={activeExpanded}
                      onClick={() => setActiveExpanded(current => !current)}
                      data-testid="seller-custody-active-toggle"
                    >
                      {activeExpanded
                        ? t('marketplace.sell.collectibles.workspace.showFewerCases')
                        : t('marketplace.sell.collectibles.workspace.showAllCases', {
                            count: workspaceGroups.active.length,
                          })}
                    </Button>
                  ) : null}
                </section>
              ) : null}

              {workspaceGroups.history.length > 0 ? (
                <section aria-label={t('marketplace.sell.collectibles.workspace.historySection')}>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">
                    {t('marketplace.sell.collectibles.workspace.historySection')}
                  </h4>
                  <VStack gap="sm">
                    {visibleHistory.map(deposit =>
                      renderDepositCard(deposit, { quiet: true, compact: true })
                    )}
                  </VStack>
                  {historyHasMore ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 min-h-[44px] text-primary"
                      aria-expanded={historyExpanded}
                      onClick={() => setHistoryExpanded(current => !current)}
                      data-testid="seller-custody-history-toggle"
                    >
                      {historyExpanded
                        ? t('marketplace.sell.collectibles.workspace.showFewerCases')
                        : t('marketplace.sell.collectibles.workspace.showAllCases', {
                            count: workspaceGroups.history.length,
                          })}
                    </Button>
                  ) : null}
                </section>
              ) : null}
            </VStack>
          )}
        </div>
      )}
    </Card>
  );
}
