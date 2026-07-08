// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquareWarning,
  ReceiptText,
  ShieldAlert,
} from 'lucide-react';
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

export type AttributionStatusFilter = 'all' | DealCommissionStatement['status'];

export interface ProvisionalCommissionStatementsPanelProps {
  audience: DealCommissionStatementAudience;
  /** Optional section title override; defaults to audience-specific i18n key. */
  title?: string;
  className?: string;
  /** Compact rows with collapsed details — used inside Deal Links attribution tab. */
  variant?: 'default' | 'compact';
  /** Skip outer Card chrome when embedded in a parent tab panel. */
  embedded?: boolean;
  statusFilter?: AttributionStatusFilter;
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

const STATUS_DESCRIPTION_I18N_KEYS: Record<DealCommissionStatement['status'], string> = {
  observed: 'dealCommissionStatements.statusObservedDescription',
  pending_review: 'dealCommissionStatements.statusPendingReviewDescription',
  disputed: 'dealCommissionStatements.statusDisputedDescription',
  reversed: 'dealCommissionStatements.statusReversedDescription',
  settled: 'dealCommissionStatements.statusSettledDescription',
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

const CompactStatementEntry = memo(function CompactStatementEntry({
  statement,
}: {
  statement: DealCommissionStatement;
}) {
  const { t, formatDate } = useI18n();
  const { formatPrice } = useCurrency();

  const statusLabel = t(STATUS_I18N_KEYS[statement.status]);
  const observedAtLabel = formatDate(statement.observedAt, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const formattedAmount = formatAtomicCommissionAmount({
    amountAtomic: statement.proposedCommissionAmountAtomic,
    currency: statement.currency,
    currencyDivisibility: statement.currencyDivisibility,
    formatPrice,
    missingCurrencyLabel: t('dealCommissionStatements.missingCurrency'),
    invalidAmountLabel: t('dealCommissionStatements.invalidAmount'),
  });

  return (
    <details
      className="group rounded-lg border border-border"
      data-testid={`deal-commission-statement-${statement.id}`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {t('dealCommissionStatements.entryTitle', {
              orderRef: truncateStatementReference(statement.orderID),
            })}
          </p>
          <p className="text-xs text-muted-foreground">{observedAtLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${formattedAmount.ok ? '' : 'text-destructive'}`}>
            {formattedAmount.display}
            {formattedAmount.ok ? (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {statement.currency}
              </span>
            ) : null}
          </span>
          <Badge variant="outline">{statusLabel}</Badge>
        </div>
      </summary>
      <div className="border-t border-border px-3 pb-3 pt-2 sm:px-4">
        <StatementEntry statement={statement} nested compactNested />
      </div>
    </details>
  );
});

const StatementEntry = memo(function StatementEntry({
  statement,
  nested = false,
  compactNested = false,
}: {
  statement: DealCommissionStatement;
  nested?: boolean;
  compactNested?: boolean;
}) {
  const { t, formatDate } = useI18n();

  const statusLabel = t(STATUS_I18N_KEYS[statement.status]);
  const statusDescription = t(STATUS_DESCRIPTION_I18N_KEYS[statement.status]);

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
      className={nested ? 'space-y-4 pt-1' : 'rounded-lg border border-border p-4'}
      data-testid={nested ? undefined : `deal-commission-statement-${statement.id}`}
      aria-labelledby={nested ? undefined : `deal-commission-statement-title-${statement.id}`}
    >
      {!nested ? (
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
          <Badge variant="outline">{statusLabel}</Badge>
        </div>
      ) : null}

      {!nested ? (
        <div
          className="mt-4 grid gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-2"
          role="note"
          data-testid="deal-commission-status-summary"
        >
          <StatementAmount
            label={t('dealCommissionStatements.proposedCommission')}
            amountAtomic={statement.proposedCommissionAmountAtomic}
            currency={statement.currency}
            currencyDivisibility={statement.currencyDivisibility}
          />
          <div>
            <p className="text-sm font-medium text-foreground">{statusLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{statusDescription}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{statusDescription}</p>
      )}

      {!compactNested ? (
        <div className="mt-4 text-sm">
          <p className="text-muted-foreground">{t('dealCommissionStatements.reviewNotBefore')}</p>
          <p className="font-medium">{reviewNotBeforeLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('dealCommissionStatements.reviewNotBeforeHint')}
          </p>
        </div>
      ) : null}

      {hasEligibilityReview && !compactNested ? (
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

      {hasEligibilityReview && compactNested ? (
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer list-none font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t('dealCommissionStatements.eligibilityAuditTitle')}
          </summary>
          <div
            className="mt-2 rounded-lg border border-border bg-muted/40 p-3"
            role="note"
            data-testid="deal-commission-eligibility-audit"
          >
            {statement.lastEligibilityDecision ? (
              <p className="text-muted-foreground">
                {t('dealCommissionStatements.eligibilityDecisionLabel')}:{' '}
                <span className="font-medium text-foreground">
                  {t(ELIGIBILITY_DECISION_I18N_KEYS[statement.lastEligibilityDecision])}
                </span>
              </p>
            ) : null}
            {statement.lastEligibilityReasons?.length ? (
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-foreground">
                {statement.lastEligibilityReasons.map(reason => (
                  <li key={reason}>{localizeEligibilityReason(reason, t)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>
      ) : null}

      {compactNested ? (
        <details className="mt-2 text-sm">
          <summary className="min-h-11 cursor-pointer list-none font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t('dealCommissionStatements.detailsCta')}
          </summary>
          <StatementCalculationDetails
            statement={statement}
            fundingSourceLabel={fundingSourceLabel}
          />
        </details>
      ) : (
        <details
          className={`group ${nested ? '' : 'mt-4 border-t border-border pt-4'}`}
          open={nested}
        >
          {!nested ? (
            <summary className="min-h-11 cursor-pointer list-none text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t('dealCommissionStatements.detailsCta')}
            </summary>
          ) : null}
          <StatementCalculationDetails
            statement={statement}
            fundingSourceLabel={fundingSourceLabel}
          />
        </details>
      )}
    </article>
  );
});

const StatementCalculationDetails = memo(function StatementCalculationDetails({
  statement,
  fundingSourceLabel,
}: {
  statement: DealCommissionStatement;
  fundingSourceLabel: string;
}) {
  const { t } = useI18n();

  return (
    <dl className="grid gap-3 pb-1 pt-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
        <dt className="text-muted-foreground">{t('dealCommissionStatements.programRef')}</dt>
        <dd className="font-mono text-xs">{truncateStatementReference(statement.programID)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('dealCommissionStatements.dealLinkRef')}</dt>
        <dd className="font-mono text-xs">{truncateStatementReference(statement.dealLinkID)}</dd>
      </div>
    </dl>
  );
});

function AttributionDisclosure({
  audience,
  compact,
}: {
  audience: DealCommissionStatementAudience;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const paymentNoticeKey =
    audience === 'seller'
      ? 'dealCommissionStatements.disclosurePaymentSeller'
      : 'dealCommissionStatements.disclosurePaymentPromoter';

  if (compact) {
    return (
      <details className="rounded-lg border border-primary/20 bg-primary/5 text-sm leading-6">
        <summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t('dealCommissionStatements.disclosureTitle')}
        </summary>
        <div className="space-y-2 border-t border-primary/10 px-4 pb-4 pt-3 text-muted-foreground">
          <p>{t('dealCommissionStatements.disclosureBody')}</p>
          <p>{t('dealCommissionStatements.manualReviewOnlyNotice')}</p>
          <p>{t(paymentNoticeKey)}</p>
        </div>
      </details>
    );
  }

  return (
    <div
      className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-6"
      role="note"
      data-testid="deal-commission-global-disclosure"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-2">
          <p className="font-medium">{t('dealCommissionStatements.disclosureTitle')}</p>
          <p className="text-muted-foreground">{t('dealCommissionStatements.disclosureBody')}</p>
          <p className="text-muted-foreground">
            {t('dealCommissionStatements.manualReviewOnlyNotice')}
          </p>
          <p className="text-muted-foreground">{t(paymentNoticeKey)}</p>
        </div>
      </div>
    </div>
  );
}

function SellerControlsNotice() {
  const { t } = useI18n();
  const controls = [
    {
      key: 'acknowledge',
      label: t('dealCommissionStatements.sellerControlAcknowledge'),
      icon: CheckCircle2,
    },
    {
      key: 'dispute',
      label: t('dealCommissionStatements.sellerControlDispute'),
      icon: MessageSquareWarning,
    },
    {
      key: 'record-payment',
      label: t('dealCommissionStatements.sellerControlRecordPayment'),
      icon: ReceiptText,
    },
  ];

  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm"
      role="note"
      data-testid="deal-commission-seller-controls"
    >
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {t('dealCommissionStatements.sellerControlsTitle')}
        </p>
        <p className="text-muted-foreground">{t('dealCommissionStatements.sellerControlsBody')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {controls.map(control => {
          const Icon = control.icon;
          return (
            <Button
              key={control.key}
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="min-h-11 gap-2"
              data-testid={`deal-commission-seller-control-${control.key}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {control.label}
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('dealCommissionStatements.sellerControlsUnavailable')}
      </p>
    </div>
  );
}

export const ProvisionalCommissionStatementsPanel = memo(
  function ProvisionalCommissionStatementsPanel({
    audience,
    title,
    className,
    variant = 'default',
    embedded = false,
    statusFilter = 'all',
  }: ProvisionalCommissionStatementsPanelProps) {
    const { t } = useI18n();
    const { statements, loading, error, reload } = useDealCommissionStatements(audience);

    const filteredStatements = useMemo(() => {
      if (statusFilter === 'all') return statements;
      return statements.filter(statement => statement.status === statusFilter);
    }, [statements, statusFilter]);

    const resolvedTitle =
      title ??
      (audience === 'seller'
        ? t('dealCommissionStatements.sellerTitle')
        : t('dealCommissionStatements.promoterTitle'));

    const resolvedSubtitle =
      audience === 'seller'
        ? t('dealCommissionStatements.sellerSubtitle')
        : t('dealCommissionStatements.promoterSubtitle');

    const body = (
      <>
        {embedded ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => void reload()}
              disabled={loading}
              data-testid="deal-commission-statements-refresh"
            >
              {t('dealCommissionStatements.refresh')}
            </Button>
          </div>
        ) : null}

        <AttributionDisclosure audience={audience} compact={variant === 'compact'} />

        {audience === 'seller' ? <SellerControlsNotice /> : null}

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

        {!loading && !error && statements.length > 0 && !filteredStatements.length ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="deal-commission-statements-filter-empty"
          >
            {t('admin.dealLinks.attributionFilterEmpty')}
          </p>
        ) : null}

        {!loading && !error
          ? filteredStatements.map(statement =>
              variant === 'compact' ? (
                <CompactStatementEntry key={statement.id} statement={statement} />
              ) : (
                <StatementEntry key={statement.id} statement={statement} />
              )
            )
          : null}
      </>
    );

    if (embedded) {
      return (
        <div
          className={`space-y-4 ${className ?? ''}`}
          data-testid={`deal-commission-statements-${audience}`}
          aria-busy={loading}
        >
          {body}
        </div>
      );
    }

    return (
      <Card
        className={className}
        data-testid={`deal-commission-statements-${audience}`}
        aria-busy={loading}
      >
        <CardHeader className="flex flex-col items-stretch justify-between gap-3 space-y-0 sm:flex-row sm:items-start">
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
            className="min-h-11 w-full shrink-0 sm:w-auto"
            onClick={() => void reload()}
            disabled={loading}
            data-testid="deal-commission-statements-refresh"
          >
            {t('dealCommissionStatements.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">{body}</CardContent>
      </Card>
    );
  }
);
