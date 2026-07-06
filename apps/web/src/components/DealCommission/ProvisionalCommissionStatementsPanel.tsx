// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useMemo } from 'react';
import { AlertTriangle, FileText, Loader2, ShieldAlert } from 'lucide-react';
import {
  formatAtomicCommissionAmount,
  formatCommissionRateFromBPS,
  isKnownDealCommissionEligibilityReasonCode,
  truncateStatementReference,
  useCurrency,
  useDealCommissionStatements,
  useI18n,
  type DealCommissionStatement,
  type DealCommissionStatementAudience,
} from '@mobazha/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface ProvisionalCommissionStatementsPanelProps {
  audience: DealCommissionStatementAudience;
  /** Optional section title override; defaults to audience-specific i18n key. */
  title?: string;
  className?: string;
}

function StatementEntrySkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4" aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

const StatementAmount = memo(function StatementAmount({
  amountAtomic,
  currency,
  currencyDivisibility,
  label,
}: {
  amountAtomic: string;
  currency: string;
  currencyDivisibility: number;
  label: string;
}) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  const formatted = useMemo(
    () =>
      formatAtomicCommissionAmount({
        amountAtomic,
        currency,
        currencyDivisibility,
        formatPrice,
        missingCurrencyLabel: t('dealCommissionStatements.missingCurrency'),
        invalidAmountLabel: t('dealCommissionStatements.invalidAmount'),
      }),
    [amountAtomic, currency, currencyDivisibility, formatPrice, t]
  );

  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`font-medium ${formatted.ok ? '' : 'text-destructive'}`}
        data-testid={formatted.ok ? undefined : 'deal-commission-amount-error'}
      >
        {formatted.display}
        {formatted.ok ? (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{currency}</span>
        ) : null}
      </dd>
    </div>
  );
});

const STATUS_I18N_KEYS: Record<DealCommissionStatement['status'], string> = {
  observed: 'dealCommissionStatements.statusObserved',
  pending_review: 'dealCommissionStatements.statusPendingReview',
  disputed: 'dealCommissionStatements.statusDisputed',
  reversed: 'dealCommissionStatements.statusReversed',
  settled: 'dealCommissionStatements.statusSettled',
};

const ELIGIBILITY_DECISION_I18N_KEYS: Record<
  NonNullable<DealCommissionStatement['lastEligibilityDecision']>,
  string
> = {
  deferred: 'dealCommissionStatements.eligibilityDecisionDeferred',
  eligible: 'dealCommissionStatements.eligibilityDecisionEligible',
  disputed: 'dealCommissionStatements.eligibilityDecisionDisputed',
  reversed: 'dealCommissionStatements.eligibilityDecisionReversed',
};

function localizeEligibilityReason(
  reason: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (isKnownDealCommissionEligibilityReasonCode(reason)) {
    return t(`dealCommissionStatements.eligibilityReason.${reason}`);
  }
  return t('dealCommissionStatements.eligibilityReasonUnknown', { reason });
}

const StatementEntry = memo(function StatementEntry({
  statement,
  audience,
}: {
  statement: DealCommissionStatement;
  audience: DealCommissionStatementAudience;
}) {
  const { t, formatDate } = useI18n();

  const statusLabel = t(STATUS_I18N_KEYS[statement.status]);

  const hasEligibilityReview =
    statement.lastEligibilityDecision !== undefined ||
    statement.lastEligibilityReasons !== undefined ||
    statement.eligibilityReviewedAt !== undefined;

  const eligibilityReviewedAtLabel = statement.eligibilityReviewedAt
    ? formatDate(statement.eligibilityReviewedAt, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const fundingSourceLabel =
    statement.declaredFundingSource === 'seller_manual_budget'
      ? t('dealCommissionStatements.fundingSellerManualBudget')
      : t('dealCommissionStatements.fundingUnknown');

  const observedAtLabel = formatDate(statement.observedAt, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const reviewNotBeforeLabel = statement.reviewNotBefore
    ? formatDate(statement.reviewNotBefore, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : t('dealCommissionStatements.reviewNotBeforeUnavailable');

  return (
    <article
      className="rounded-lg border border-border p-4"
      data-testid={`deal-commission-statement-${statement.id}`}
      aria-labelledby={`deal-commission-statement-title-${statement.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 id={`deal-commission-statement-title-${statement.id}`} className="font-medium">
            {t('dealCommissionStatements.entryTitle', {
              orderRef: truncateStatementReference(statement.orderID),
            })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('dealCommissionStatements.observedAt', { date: observedAtLabel })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{statusLabel}</Badge>
          <Badge variant="warning" data-testid="deal-commission-not-payable-badge">
            {t('dealCommissionStatements.notPayableBadge')}
          </Badge>
        </div>
      </div>

      <div
        className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
        role="note"
        data-testid="deal-commission-manual-review-notice"
      >
        <p className="font-medium text-warning">
          {t('dealCommissionStatements.manualReviewOnlyTitle')}
        </p>
        <p className="mt-1 text-foreground">
          {audience === 'seller'
            ? t('dealCommissionStatements.sellerEvidenceBody')
            : t('dealCommissionStatements.promoterEvidenceBody')}
        </p>
      </div>

      {hasEligibilityReview ? (
        <div
          className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm"
          role="note"
          data-testid="deal-commission-eligibility-audit"
        >
          <p className="font-medium text-foreground">
            {t('dealCommissionStatements.eligibilityAuditTitle')}
          </p>
          {statement.lastEligibilityDecision ? (
            <p className="mt-1 text-muted-foreground">
              {t('dealCommissionStatements.eligibilityDecisionLabel')}:{' '}
              <span className="font-medium text-foreground">
                {t(ELIGIBILITY_DECISION_I18N_KEYS[statement.lastEligibilityDecision])}
              </span>
            </p>
          ) : null}
          {eligibilityReviewedAtLabel ? (
            <p className="mt-1 text-muted-foreground">
              {t('dealCommissionStatements.eligibilityReviewedAt', {
                date: eligibilityReviewedAtLabel,
              })}
            </p>
          ) : null}
          {statement.lastEligibilityReasons?.length ? (
            <div className="mt-2">
              <p className="text-muted-foreground">
                {t('dealCommissionStatements.eligibilityReasonsLabel')}
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-foreground">
                {statement.lastEligibilityReasons.map(reason => (
                  <li key={reason}>{localizeEligibilityReason(reason, t)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {t('dealCommissionStatements.eligibilityAuditHint')}
          </p>
        </div>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <StatementAmount
          label={t('dealCommissionStatements.proposedCommission')}
          amountAtomic={statement.proposedCommissionAmountAtomic}
          currency={statement.currency}
          currencyDivisibility={statement.currencyDivisibility}
        />
        <StatementAmount
          label={t('dealCommissionStatements.commissionBase')}
          amountAtomic={statement.commissionBaseAmountAtomic}
          currency={statement.currency}
          currencyDivisibility={statement.currencyDivisibility}
        />
        <div>
          <dt className="text-muted-foreground">{t('dealCommissionStatements.commissionRate')}</dt>
          <dd className="font-medium">
            {t('dealCommissionStatements.commissionRateValue', {
              percent: formatCommissionRateFromBPS(statement.commissionRateBPS),
            })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('dealCommissionStatements.settlementMode')}</dt>
          <dd className="font-medium">{t('dealCommissionStatements.settlementManualReview')}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('dealCommissionStatements.fundingSource')}</dt>
          <dd className="font-medium">{fundingSourceLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('dealCommissionStatements.reviewNotBefore')}</dt>
          <dd className="font-medium">{reviewNotBeforeLabel}</dd>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('dealCommissionStatements.reviewNotBeforeHint')}
          </p>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('dealCommissionStatements.programRef')}</dt>
          <dd className="font-mono text-xs">{truncateStatementReference(statement.programID)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('dealCommissionStatements.dealLinkRef')}</dt>
          <dd className="font-mono text-xs">{truncateStatementReference(statement.dealLinkID)}</dd>
        </div>
      </dl>
    </article>
  );
});

export const ProvisionalCommissionStatementsPanel = memo(
  function ProvisionalCommissionStatementsPanel({
    audience,
    title,
    className,
  }: ProvisionalCommissionStatementsPanelProps) {
    const { t } = useI18n();
    const { statements, loading, error, reload } = useDealCommissionStatements(audience);

    const resolvedTitle =
      title ??
      (audience === 'seller'
        ? t('dealCommissionStatements.sellerTitle')
        : t('dealCommissionStatements.promoterTitle'));

    const resolvedSubtitle =
      audience === 'seller'
        ? t('dealCommissionStatements.sellerSubtitle')
        : t('dealCommissionStatements.promoterSubtitle');

    return (
      <Card
        className={className}
        data-testid={`deal-commission-statements-${audience}`}
        aria-busy={loading}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              {resolvedTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{resolvedSubtitle}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0"
            onClick={() => void reload()}
            disabled={loading}
            data-testid="deal-commission-statements-refresh"
          >
            {t('dealCommissionStatements.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-6"
            role="note"
            data-testid="deal-commission-global-disclosure"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-2">
                <p className="font-medium">{t('dealCommissionStatements.disclosureTitle')}</p>
                <p className="text-muted-foreground">
                  {t('dealCommissionStatements.disclosureBody')}
                </p>
                <p className="font-medium text-foreground">
                  {t('dealCommissionStatements.notPayableNotice')}
                </p>
                <p className="text-muted-foreground">
                  {t('dealCommissionStatements.manualReviewOnlyNotice')}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3" data-testid="deal-commission-statements-loading">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {t('dealCommissionStatements.loading')}
              </div>
              <StatementEntrySkeleton />
              <StatementEntrySkeleton />
            </div>
          ) : null}

          {!loading && error ? (
            <div
              className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
              role="alert"
              data-testid="deal-commission-statements-error"
            >
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <p className="text-destructive">{t('dealCommissionStatements.loadFailed')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void reload()}
                data-testid="deal-commission-statements-retry"
              >
                {t('dealCommissionStatements.retry')}
              </Button>
            </div>
          ) : null}

          {!loading && !error && !statements.length ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="deal-commission-statements-empty"
            >
              {t('dealCommissionStatements.empty')}
            </p>
          ) : null}

          {!loading && !error
            ? statements.map(statement => (
                <StatementEntry key={statement.id} statement={statement} audience={audience} />
              ))
            : null}
        </CardContent>
      </Card>
    );
  }
);
