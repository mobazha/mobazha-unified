// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { SourceDepositCollateralFundingSection } from './SourceDepositCollateralFundingSection';
import {
  buildSourceDepositListingUrl,
  resolveCollectibleCaseDisplayName,
  isSourceDepositListingReady,
  resolveCollectibleOrderOptionalFeaturesIssueKey,
  resolveSourceDepositLifecycleStep,
  resolveSourceDepositNextActionKey,
  resolveSourceDepositRejectionReason,
  resolveSourceDepositStatusKey,
  resolveSellerCustodyCheckedKey,
  resolveSellerCustodyLocationKey,
  validateSourceDepositListingBindings,
  useI18n,
  type CollectibleSourceDeposit,
  type SourceDepositLifecycleStep,
} from '@mobazha/core';
import {
  CollectiblesCustodyTimeline,
  CollectiblesNextActionCard,
  CollectiblesTechnicalDetails,
} from '@/components/collectibles/experience';

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

export interface SellerCustodyDepositCardProps {
  deposit: CollectibleSourceDeposit;
  dominant?: boolean;
  /** History / closed cases — muted presentation, no primary actions. */
  quiet?: boolean;
  /** Collapsed summary row — timeline and actions revealed on explicit expand. */
  compact?: boolean;
  trackingNo: string;
  trackingTouched: boolean;
  isShipping: boolean;
  shippingBlocked: boolean;
  onTrackingChange: (value: string) => void;
  onTrackingBlur: () => void;
  onMarkShipped: () => void;
  onUpdated?: () => void | Promise<void>;
}

export function SellerCustodyDepositCard({
  deposit,
  dominant = false,
  quiet = false,
  compact = false,
  trackingNo,
  trackingTouched,
  isShipping,
  shippingBlocked,
  onTrackingChange,
  onTrackingBlur,
  onMarkShipped,
  onUpdated,
}: SellerCustodyDepositCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const activeStep = resolveSourceDepositLifecycleStep(deposit);
  const rejectionReason = resolveSourceDepositRejectionReason(deposit);
  const listingReady = isSourceDepositListingReady(deposit);
  const isRedeemRequested = deposit.status === 'redeem_requested';
  const depositId = deposit.sourceDepositID;
  const title = resolveCollectibleCaseDisplayName(deposit, t);
  const statusLabel = t(resolveSourceDepositStatusKey(deposit.status));
  const nextActionLabel = t(resolveSourceDepositNextActionKey(deposit));

  const trackingError =
    trackingTouched && !trackingNo.trim()
      ? t('marketplace.sell.collectibles.workspace.validation.trackingNumber')
      : null;

  let listingHref: string | null = null;
  let listingBlockedMessage: string | null = null;

  if (listingReady && deposit.hubSlotID) {
    const hubSlotID = deposit.hubSlotID;
    const listingPrefill = {
      sourceDepositID: deposit.sourceDepositID,
      hubSlotID,
      certNumber: deposit.certNumber,
      grade: deposit.grade,
      serial: deposit.serial,
      ...(deposit.orderOptionalFeatures?.length
        ? { orderOptionalFeatures: deposit.orderOptionalFeatures }
        : {}),
    };
    const listingBindings = validateSourceDepositListingBindings(listingPrefill);
    if (!listingBindings.valid) {
      listingBlockedMessage = t(
        resolveCollectibleOrderOptionalFeaturesIssueKey(listingBindings.issue)
      );
    } else {
      try {
        listingHref = buildSourceDepositListingUrl(listingPrefill);
      } catch {
        listingBlockedMessage = t(
          'marketplace.sell.collectibles.workspace.listingBindingsBlockedDesc'
        );
      }
    }
  }

  const primaryAction =
    quiet || isRedeemRequested
      ? undefined
      : listingHref
        ? {
            label: t('marketplace.sell.collectibles.workspace.createListingCta'),
            href: listingHref,
            testId: 'create-listing-from-deposit',
          }
        : undefined;

  const ageLabel = deposit.updatedAt || deposit.createdAt;

  const detailContent = (
    <>
      <div
        className="space-y-2 rounded-md border border-border/60 bg-muted/15 p-3"
        data-testid="seller-custody-current-status"
      >
        <p className="text-xs font-medium text-muted-foreground">
          {t('marketplace.sell.collectibles.workspace.currentStatus')}
        </p>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">
              {t('marketplace.sell.collectibles.workspace.cardLocation')}
            </dt>
            <dd className="text-foreground">{t(resolveSellerCustodyLocationKey(deposit))}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">
              {t('marketplace.sell.collectibles.workspace.cardChecked')}
            </dt>
            <dd className="text-foreground">{t(resolveSellerCustodyCheckedKey(deposit))}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">
              {t('marketplace.sell.collectibles.workspace.nextActionLabel')}
            </dt>
            <dd className="font-medium text-foreground">{nextActionLabel}</dd>
          </div>
        </dl>
      </div>

      <CollectiblesCustodyTimeline
        compact
        steps={SELLER_LIFECYCLE_STEPS.map(step => ({
          id: step,
          labelKey: SELLER_LIFECYCLE_KEYS[step],
        }))}
        currentStepId={activeStep}
        ariaLabelKey="marketplace.sell.collectibles.workspace.lifecycleAria"
      />

      {rejectionReason ? (
        <p className="text-sm text-destructive" role="status">
          {t('marketplace.sell.collectibles.workspace.rejectionReason')}: {rejectionReason}
        </p>
      ) : null}

      <SourceDepositCollateralFundingSection deposit={deposit} onUpdated={onUpdated} compact />

      {listingBlockedMessage ? (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3"
          role="status"
          data-testid="create-listing-from-deposit-blocked"
        >
          <p className="text-xs font-medium text-destructive">
            {t('marketplace.sell.collectibles.workspace.listingBindingsBlockedTitle')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{listingBlockedMessage}</p>
        </div>
      ) : null}

      {isRedeemRequested && !quiet ? (
        <div
          className="space-y-2 rounded-md border border-border bg-muted/20 p-3"
          data-testid="source-deposit-ship-panel"
        >
          <label
            className="text-sm font-medium text-foreground"
            htmlFor={`source-deposit-tracking-${depositId}`}
          >
            {t('marketplace.sell.collectibles.workspace.trackingNumber')}
          </label>
          <Input
            id={`source-deposit-tracking-${depositId}`}
            value={trackingNo}
            onChange={event => onTrackingChange(event.target.value)}
            onBlur={onTrackingBlur}
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
            className="min-h-[44px] w-full sm:w-auto"
            disabled={!trackingNo.trim() || shippingBlocked}
            onClick={onMarkShipped}
            data-testid="source-deposit-mark-shipped"
          >
            {isShipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('marketplace.sell.collectibles.workspace.markShipped')}
          </Button>
        </div>
      ) : null}

      {ageLabel ? (
        <p className="text-xs text-muted-foreground">
          {t('marketplace.sell.collectibles.workspace.lastUpdated')}:{' '}
          {new Date(ageLabel).toLocaleString()}
        </p>
      ) : null}

      <CollectiblesTechnicalDetails
        rows={[
          {
            labelKey: 'marketplace.sell.collectibles.workspace.technical.certNumber',
            value: deposit.certNumber ?? '',
          },
          {
            labelKey: 'marketplace.sell.collectibles.workspace.technical.serial',
            value: deposit.serial ?? '',
          },
          {
            labelKey: 'marketplace.sell.collectibles.workspace.technical.depositId',
            value: deposit.sourceDepositID,
            mono: true,
          },
        ]}
      />
    </>
  );

  if (compact) {
    return (
      <Card
        className={
          quiet
            ? 'border-border/60 bg-muted/10 p-3 shadow-none'
            : 'border-border bg-card p-3 shadow-none'
        }
        data-testid="collectible-submission-row"
        data-compact="true"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
            <p className="text-sm font-medium text-foreground">{nextActionLabel}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] shrink-0 self-start"
            aria-expanded={expanded}
            aria-controls={`seller-custody-details-${depositId}`}
            onClick={() => setExpanded(current => !current)}
            data-testid="seller-custody-expand"
          >
            {expanded ? t('common.collapse') : t('common.expand')}
          </Button>
        </div>

        {expanded ? (
          <div
            id={`seller-custody-details-${depositId}`}
            className="mt-4 space-y-3 border-t border-border pt-4"
            data-testid="seller-custody-expanded-details"
          >
            {primaryAction ? (
              <Button
                asChild
                className="min-h-[44px] w-full sm:w-auto"
                data-testid={primaryAction.testId}
              >
                <Link href={primaryAction.href!}>{primaryAction.label}</Link>
              </Button>
            ) : null}
            {detailContent}
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <CollectiblesNextActionCard
      title={title}
      statusLabel={statusLabel}
      statusVariant={isRedeemRequested ? 'default' : quiet ? 'outline' : 'secondary'}
      primaryAction={primaryAction}
      sticky={!quiet && dominant && isRedeemRequested}
      className={
        quiet
          ? 'border-border/60 bg-muted/10 shadow-none'
          : dominant
            ? 'border-primary/30 bg-primary/5'
            : undefined
      }
      testId="collectible-submission-row"
    >
      {detailContent}
    </CollectiblesNextActionCard>
  );
}
