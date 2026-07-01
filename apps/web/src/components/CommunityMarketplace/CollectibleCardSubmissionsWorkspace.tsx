// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VStack } from '@/components/layouts';
import { useToast } from '@/components/ui/use-toast';
import {
  useCollectibleActions,
  isSourceDepositListingReady,
  buildSourceDepositListingUrl,
  resolveSourceDepositLifecycleStep,
  resolveSourceDepositNextActionKey,
  resolveSourceDepositRejectionReason,
  resolveSourceDepositStatusKey,
  validateCollectibleSourceDepositSubmission,
  useI18n,
  type CollectibleSourceDeposit,
  type SourceDepositLifecycleStep,
} from '@mobazha/core';
import { Loader2 } from 'lucide-react';

const SELLER_LIFECYCLE_STEPS: SourceDepositLifecycleStep[] = [
  'submit',
  'review',
  'list',
  'listed',
  'redeem',
];

const SELLER_LIFECYCLE_KEYS: Record<SourceDepositLifecycleStep, string> = {
  submit: 'marketplace.sell.collectibles.workspace.lifecycle.submit',
  review: 'marketplace.sell.collectibles.workspace.lifecycle.review',
  list: 'marketplace.sell.collectibles.workspace.lifecycle.list',
  listed: 'marketplace.sell.collectibles.workspace.lifecycle.listed',
  redeem: 'marketplace.sell.collectibles.workspace.lifecycle.redeem',
};

export interface CollectibleCardSubmissionsWorkspaceProps {
  enabled?: boolean;
}

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
  const [photoFrontUrl, setPhotoFrontUrl] = useState('');
  const [photoBackUrl, setPhotoBackUrl] = useState('');
  const [guaranteeAmount, setGuaranteeAmount] = useState('');
  const [guaranteeCurrency, setGuaranteeCurrency] = useState('');
  const [trackingByDepositId, setTrackingByDepositId] = useState<Record<string, string>>({});
  const [shipTouchedByDepositId, setShipTouchedByDepositId] = useState<Record<string, boolean>>({});
  const [shippingDepositId, setShippingDepositId] = useState<string | null>(null);

  const submissionValidation = useMemo(
    () =>
      validateCollectibleSourceDepositSubmission({
        certNumber,
        grade,
        holderWallet,
        photoFrontUrl,
        photoBackUrl,
      }),
    [certNumber, grade, holderWallet, photoFrontUrl, photoBackUrl]
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
  }, [enabled, t]);

  React.useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const resetForm = () => {
    setCertNumber('');
    setGrade('');
    setSerial('');
    setHolderWallet('');
    setPhotoFrontUrl('');
    setPhotoBackUrl('');
    setGuaranteeAmount('');
    setGuaranteeCurrency('');
    setTouched(false);
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await collectibleActions.submitMyCollectibleSourceDeposit({
        certNumber: certNumber.trim(),
        grade: grade.trim(),
        holderWallet: holderWallet.trim(),
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

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [items]
  );

  return (
    <Card className="p-4 sm:p-6" data-testid="collectible-card-submissions-workspace">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('marketplace.sell.collectibles.workspace.title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('marketplace.sell.collectibles.workspace.subtitle')}
        </p>
      </div>

      <ol
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5"
        aria-label={t('marketplace.sell.collectibles.workspace.lifecycleAria')}
      >
        {SELLER_LIFECYCLE_STEPS.map((step, index) => (
          <li
            key={step}
            className="rounded-md border border-border bg-muted/30 px-2 py-2 text-center text-xs text-foreground"
          >
            <span className="mb-0.5 block font-semibold text-primary" aria-hidden>
              {index + 1}
            </span>
            {t(SELLER_LIFECYCLE_KEYS[step])}
          </li>
        ))}
      </ol>

      <p className="mb-4 text-xs text-muted-foreground">
        {t('marketplace.sell.collectibles.workspace.custodyNote')}
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
            aria-describedby={fieldError('holderWallet') ? 'submission-holder-error' : undefined}
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
          <label className="text-sm font-medium text-foreground" htmlFor="submission-photo-front">
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
            <p id="submission-photo-front-error" className="text-xs text-destructive" role="alert">
              {fieldError('photoFrontUrl')}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="submission-photo-back">
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
            <p id="submission-photo-back-error" className="text-xs text-destructive" role="alert">
              {fieldError('photoBackUrl')}
            </p>
          ) : null}
          {fieldError('photosDistinct') ? (
            <p className="text-xs text-destructive" role="alert">
              {fieldError('photosDistinct')}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="submission-guarantee-amt">
            {t('marketplace.sell.collectibles.workspace.guaranteeAmount')}
          </label>
          <Input
            id="submission-guarantee-amt"
            value={guaranteeAmount}
            onChange={event => setGuaranteeAmount(event.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="submission-guarantee-cur">
            {t('marketplace.sell.collectibles.workspace.guaranteeCurrency')}
          </label>
          <Input
            id="submission-guarantee-cur"
            value={guaranteeCurrency}
            onChange={event => setGuaranteeCurrency(event.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <Button
        type="button"
        className="mb-6 w-full sm:w-auto"
        disabled={!canSubmit}
        onClick={() => void handleSubmit()}
      >
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        {t('marketplace.sell.collectibles.workspace.submitCard')}
      </Button>

      <div className="border-t border-border pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('marketplace.sell.collectibles.workspace.mySubmissionsTitle')}
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
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

        {loading && sortedItems.length === 0 ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : null}

        {!loading && sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="collectible-submissions-empty">
            {t('marketplace.sell.collectibles.workspace.emptySubmissions')}
          </p>
        ) : (
          <VStack gap="sm">
            {sortedItems.map(deposit => {
              const activeStep = resolveSourceDepositLifecycleStep(deposit);
              const rejectionReason = resolveSourceDepositRejectionReason(deposit);
              const listingReady = isSourceDepositListingReady(deposit);
              const isRedeemRequested = deposit.status === 'redeem_requested';
              const depositId = deposit.sourceDepositID;
              const trackingNo = trackingByDepositId[depositId] ?? '';
              const trackingTouched = shipTouchedByDepositId[depositId] ?? false;
              const trackingError =
                trackingTouched && !trackingNo.trim()
                  ? t('marketplace.sell.collectibles.workspace.validation.trackingNumber')
                  : null;
              const isShipping = shippingDepositId === depositId;
              const canMarkShipped = Boolean(trackingNo.trim()) && !shippingDepositId;
              return (
                <div
                  key={deposit.sourceDepositID}
                  className="rounded-md border border-border p-3 text-sm"
                  data-testid="collectible-submission-row"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{deposit.certNumber}</p>
                      {deposit.grade ? (
                        <p className="text-xs text-muted-foreground">{deposit.grade}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary">
                      {t(resolveSourceDepositStatusKey(deposit.status))}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('marketplace.sell.collectibles.workspace.nextActionLabel')}:{' '}
                    <span className="text-foreground">
                      {t(resolveSourceDepositNextActionKey(deposit))}
                    </span>
                  </p>
                  {rejectionReason ? (
                    <p className="mt-2 text-xs text-destructive" role="status">
                      {t('marketplace.sell.collectibles.workspace.rejectionReason')}:{' '}
                      {rejectionReason}
                    </p>
                  ) : null}
                  {listingReady && deposit.hubSlotID ? (
                    <Button
                      asChild
                      size="sm"
                      className="mt-3"
                      data-testid="create-listing-from-deposit"
                    >
                      <Link
                        href={buildSourceDepositListingUrl({
                          sourceDepositID: deposit.sourceDepositID,
                          hubSlotID: deposit.hubSlotID,
                          certNumber: deposit.certNumber,
                          grade: deposit.grade,
                          serial: deposit.serial,
                        })}
                      >
                        {t('marketplace.sell.collectibles.workspace.createListingCta')}
                      </Link>
                    </Button>
                  ) : null}
                  {isRedeemRequested ? (
                    <div
                      className="mt-3 space-y-2 rounded-md border border-border bg-muted/20 p-3"
                      data-testid="source-deposit-ship-panel"
                    >
                      <label
                        className="text-xs font-medium text-foreground"
                        htmlFor={`source-deposit-tracking-${depositId}`}
                      >
                        {t('marketplace.sell.collectibles.workspace.trackingNumber')}
                      </label>
                      <Input
                        id={`source-deposit-tracking-${depositId}`}
                        value={trackingNo}
                        onChange={event =>
                          setTrackingByDepositId(prev => ({
                            ...prev,
                            [depositId]: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          setShipTouchedByDepositId(prev => ({ ...prev, [depositId]: true }))
                        }
                        aria-invalid={Boolean(trackingError)}
                        aria-describedby={
                          trackingError ? `source-deposit-tracking-error-${depositId}` : undefined
                        }
                        autoComplete="off"
                        data-testid="source-deposit-tracking-input"
                      />
                      {trackingError ? (
                        <p
                          id={`source-deposit-tracking-error-${depositId}`}
                          className="text-xs text-destructive"
                          role="alert"
                        >
                          {trackingError}
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        disabled={!canMarkShipped}
                        onClick={() => void handleMarkShipped(deposit)}
                        data-testid="source-deposit-mark-shipped"
                      >
                        {isShipping ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        ) : null}
                        {t('marketplace.sell.collectibles.workspace.markShipped')}
                      </Button>
                    </div>
                  ) : null}
                  <p className="sr-only">
                    {t('marketplace.sell.collectibles.workspace.lifecycleAria')}:{' '}
                    {t(SELLER_LIFECYCLE_KEYS[activeStep])}
                  </p>
                </div>
              );
            })}
          </VStack>
        )}
      </div>
    </Card>
  );
}
