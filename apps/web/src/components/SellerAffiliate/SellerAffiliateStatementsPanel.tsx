// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, Copy, RefreshCw } from 'lucide-react';
import {
  convertCurrency,
  formatPrice,
  getExchangeRate,
  getPaymentCoinDisplayLabel,
  groupSellerAffiliateStatementLines,
  renderPairedPrice,
  summarizeSellerAffiliateEarnings,
  truncateAddress,
  useCurrencyFormat,
  useI18n,
  useSellerAffiliateStatements,
} from '@mobazha/core';
import { getCurrencyDecimals } from '@mobazha/core/data/currencies';
import type {
  ProfileDisplayInfo,
  SellerAffiliateDisplayStatus,
  SellerAffiliateGroupedStatement,
  SellerAffiliateStatementAudience,
  SellerAffiliatePromoterStatementTarget,
} from '@mobazha/core';
import { copyToClipboard } from '@/lib/clipboard';
import { orderDetailPath } from '@/lib/ordersNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePeerDisplayProfiles } from './usePeerDisplayProfiles';

interface SellerAffiliateStatementsPanelProps {
  /** Selects the seller or promoter statement endpoint and title. */
  audience: SellerAffiliateStatementAudience;
  /** Required for promoter reads; the local promoter Peer signs for this seller/program. */
  promoterTarget?: SellerAffiliatePromoterStatementTarget;
}

/**
 * Semantic status palette: the terminal success state (paid) must read the
 * strongest, in-flight states stay informational, and anything that takes
 * money back from the promoter reads as a warning/error.
 */
function statusClass(status: SellerAffiliateDisplayStatus): string {
  if (status === 'paid') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
  if (status === 'settling') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
  if (status === 'failed') return 'bg-destructive/10 text-destructive';
  if (status === 'reversed') return 'bg-destructive/10 text-destructive';
  if (status === 'clawback_due') return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  return 'bg-muted text-muted-foreground';
}

type StatementStatusFilter = 'all' | 'paid' | 'in_progress' | 'reversed' | 'failed';

function matchesStatusFilter(
  status: SellerAffiliateDisplayStatus,
  filter: StatementStatusFilter
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'paid':
      return status === 'paid';
    case 'in_progress':
      return status === 'pending' || status === 'settling';
    case 'reversed':
      return status === 'reversed' || status === 'clawback_due';
    case 'failed':
      return status === 'failed';
  }
}

interface CopyableCodeProps {
  value: string;
  label: string;
}

/** Truncated tx/address value with a tap-to-copy affordance; never the sole status signal. */
const CopyableCode = memo(function CopyableCode({ value, label }: CopyableCodeProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex min-h-11 items-center gap-1 rounded px-1 font-mono text-xs text-muted-foreground hover:text-foreground"
      aria-label={label}
    >
      <span>{truncateAddress(value)}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="sr-only" role="status">
        {copied ? t('sellerAffiliate.copied') : ''}
      </span>
    </button>
  );
});

interface SettlementDetailProps {
  settlement: NonNullable<SellerAffiliateGroupedStatement['settlement']>;
}

const SettlementDetail = memo(function SettlementDetail({ settlement }: SettlementDetailProps) {
  const { t } = useI18n();
  const { localCurrency } = useCurrencyFormat();

  return (
    <div className="mt-2 space-y-1 border-t border-border pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t('sellerAffiliate.settlementAmount')}</p>
        <p className="text-xs font-medium">
          {getPaymentCoinDisplayLabel(settlement.coin)}{' '}
          {renderPairedPrice(settlement.amount, settlement.coin, localCurrency, {
            isMinimalUnit: true,
          })}
        </p>
      </div>
      {settlement.address ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t('sellerAffiliate.settlementAddress')}</p>
          <CopyableCode value={settlement.address} label={t('sellerAffiliate.copyAddress')} />
        </div>
      ) : null}
      {settlement.state === 'confirmed' ? (
        <>
          {settlement.txHash ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{t('sellerAffiliate.txHash')}</p>
              <CopyableCode value={settlement.txHash} label={t('sellerAffiliate.copyTx')} />
            </div>
          ) : null}
          {settlement.confirmedAt ? (
            <p className="text-xs text-muted-foreground">
              {t('sellerAffiliate.confirmedAt', {
                time: new Date(settlement.confirmedAt).toLocaleString(),
              })}
            </p>
          ) : null}
        </>
      ) : settlement.state === 'failed' || settlement.state === 'abandoned' ? (
        <div className="space-y-1 text-xs text-destructive" role="alert">
          <p>
            {t(
              settlement.state === 'failed'
                ? 'sellerAffiliate.settlementStateFailed'
                : 'sellerAffiliate.settlementStateAbandoned'
            )}
          </p>
          {settlement.lastError ? <p className="break-words">{settlement.lastError}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t(
            settlement.state === 'submitted'
              ? 'sellerAffiliate.settlementStateSubmitted'
              : 'sellerAffiliate.settlementStatePlanned'
          )}
          {typeof settlement.confirmations === 'number'
            ? ` · ${t('sellerAffiliate.confirmations', { count: settlement.confirmations })}`
            : ''}
        </p>
      )}
    </div>
  );
});

/** First reversal reason across the group's lines, if the backend supplied one. */
function groupReversalReason(group: SellerAffiliateGroupedStatement): string | undefined {
  for (const line of group.lines) {
    if (line.commissionLine.reversalReason) return line.commissionLine.reversalReason;
  }
  return undefined;
}

function groupAttributedAt(group: SellerAffiliateGroupedStatement): string {
  return group.lines[0].attribution.attributedAt;
}

function groupPromoter(group: SellerAffiliateGroupedStatement): string {
  return group.lines[0].attribution.promoterPeerID;
}

function groupHasGuestBuyer(group: SellerAffiliateGroupedStatement): boolean {
  return group.lines.some(line => line.attribution.buyerKind === 'guest');
}

/**
 * Sums a bucket's per-currency totals into one local-fiat figure. Returns null
 * when any currency lacks an exchange rate — a partial sum would misstate
 * earnings, so the caller falls back to the per-currency breakdown.
 */
function localFiatTotal(
  entries: { currency: string; commissionAtomic: string }[],
  localCurrency: string
): string | null {
  if (!entries.length) return null;
  if (getExchangeRate(localCurrency) === undefined) return null;
  let total = 0;
  for (const entry of entries) {
    if (getExchangeRate(entry.currency) === undefined) return null;
    const standard = Number(entry.commissionAtomic) / 10 ** getCurrencyDecimals(entry.currency);
    if (!Number.isFinite(standard)) return null;
    total += convertCurrency(standard, entry.currency, localCurrency);
  }
  return formatPrice(total, localCurrency);
}

interface EarningsBucketProps {
  label: string;
  countLine: string;
  entries: { currency: string; commissionAtomic: string }[];
  localCurrency: string;
  emphasis?: 'primary' | 'destructive';
  /** When set, the bucket toggles this status filter on click. */
  filter?: StatementStatusFilter;
  activeFilter?: StatementStatusFilter;
  onFilter?: (filter: StatementStatusFilter) => void;
  testId?: string;
  /** Replaces the amount headline (e.g. an order count for buckets without sums). */
  headlineOverride?: string;
}

/**
 * One summary bucket. Leads with a single local-fiat total when every currency
 * has a rate; otherwise falls back to per-currency amounts. Clickable buckets
 * double as status filters for the list below.
 */
function EarningsBucket({
  label,
  countLine,
  entries,
  localCurrency,
  emphasis,
  filter,
  activeFilter,
  onFilter,
  testId,
  headlineOverride,
}: EarningsBucketProps) {
  const fiatTotal = localFiatTotal(entries, localCurrency);
  const amountClass =
    emphasis === 'primary'
      ? 'text-sm font-semibold text-primary'
      : emphasis === 'destructive'
        ? 'text-sm font-semibold text-destructive'
        : 'text-sm font-semibold';

  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {headlineOverride !== undefined ? (
        <p className={amountClass}>{headlineOverride}</p>
      ) : fiatTotal ? (
        <>
          <p className={amountClass}>{fiatTotal}</p>
          {entries.length ? (
            <p className="text-xs text-muted-foreground">
              {entries
                .map(entry =>
                  renderPairedPrice(entry.commissionAtomic, entry.currency, entry.currency, {
                    isMinimalUnit: true,
                  })
                )
                .join(' · ')}
            </p>
          ) : null}
        </>
      ) : entries.length ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {entries.map(entry => (
            <span key={entry.currency} className={amountClass}>
              {renderPairedPrice(entry.commissionAtomic, entry.currency, localCurrency, {
                isMinimalUnit: true,
              })}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground">—</p>
      )}
      <p className="text-xs text-muted-foreground">{countLine}</p>
    </>
  );

  if (filter && onFilter) {
    const active = activeFilter === filter;
    return (
      <button
        type="button"
        className={`space-y-0.5 rounded-md p-1 text-left transition-colors hover:bg-muted/60 ${
          active ? 'bg-muted ring-1 ring-border' : ''
        }`}
        onClick={() => onFilter(active ? 'all' : filter)}
        aria-pressed={active}
        data-testid={testId}
      >
        {body}
      </button>
    );
  }
  return (
    <div className="space-y-0.5 p-1" data-testid={testId}>
      {body}
    </div>
  );
}

/**
 * A peer rendered as a person, not a hash: resolved display name linking to
 * the peer's public profile, with the raw peer ID one copy-tap away.
 */
function PeerIdentity({
  peerID,
  profile,
  withCopy = false,
}: {
  peerID: string;
  profile?: ProfileDisplayInfo;
  withCopy?: boolean;
}) {
  const { t } = useI18n();
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Link
        href={`/store/${encodeURIComponent(peerID)}`}
        className="text-xs text-primary underline-offset-2 hover:underline"
        title={peerID}
        onClick={event => event.stopPropagation()}
      >
        {profile?.name ? (
          profile.name
        ) : (
          <span className="font-mono">{truncateAddress(peerID)}</span>
        )}
      </Link>
      {withCopy ? <CopyableCode value={peerID} label={t('sellerAffiliate.copyPromoter')} /> : null}
    </span>
  );
}

interface StatementRowContentProps {
  group: SellerAffiliateGroupedStatement;
  audience: SellerAffiliateStatementAudience;
  profiles: Map<string, ProfileDisplayInfo>;
}

/** One label/value pair inside the expanded detail grid. */
function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="w-32 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-xs">{children}</span>
    </div>
  );
}

/** Expanded detail shared by the table's detail row and the mobile card body. */
function StatementDetailContent({ group, audience, profiles }: StatementRowContentProps) {
  const { t } = useI18n();
  const { localCurrency } = useCurrencyFormat();
  const reversalReason = groupReversalReason(group);
  const attribution = group.lines[0].attribution;
  const reversedAt = group.lines.find(line => line.commissionLine.reversedAt)?.commissionLine
    .reversedAt;
  const netMerchandiseAtomic = group.lines
    .reduce((sum, line) => sum + BigInt(line.commissionLine.netMerchandiseAtomic), BigInt(0))
    .toString();
  const ratePercent = attribution.commissionRateBPSSnapshot / 100;

  return (
    <div className="space-y-2">
      <div className="grid gap-x-8 gap-y-1 lg:grid-cols-2">
        <DetailField label={t('sellerAffiliate.detailAttributedAt')}>
          {new Date(attribution.attributedAt).toLocaleString()}
        </DetailField>
        <DetailField label={t('sellerAffiliate.detailBuyer')}>
          {attribution.buyerKind === 'guest' || !attribution.buyerPeerID ? (
            t('sellerAffiliate.guestOrder')
          ) : (
            <PeerIdentity
              peerID={attribution.buyerPeerID}
              profile={profiles.get(attribution.buyerPeerID)}
            />
          )}
        </DetailField>
        <DetailField label={t('sellerAffiliate.detailBasis')}>
          {renderPairedPrice(netMerchandiseAtomic, group.currency, localCurrency, {
            isMinimalUnit: true,
          })}
          {` × ${ratePercent}%`}
          {group.lines.length > 1
            ? ` · ${t('sellerAffiliate.detailLines', { count: String(group.lines.length) })}`
            : ''}
        </DetailField>
        {audience === 'seller' ? (
          <DetailField label={t('sellerAffiliate.tablePromoter')}>
            <PeerIdentity
              peerID={groupPromoter(group)}
              profile={profiles.get(groupPromoter(group))}
              withCopy
            />
          </DetailField>
        ) : null}
        <DetailField label={t('sellerAffiliate.referralLabel')}>
          <CopyableCode
            value={attribution.referralSessionID}
            label={t('sellerAffiliate.copyReferral')}
          />
        </DetailField>
        {reversalReason || reversedAt ? (
          <DetailField label={t('sellerAffiliate.reversalReason')}>
            <span className="text-destructive">
              {reversalReason ?? t('sellerAffiliate.reversed')}
              {reversedAt ? ` · ${new Date(reversedAt).toLocaleString()}` : ''}
            </span>
          </DetailField>
        ) : null}
      </div>
      {group.settlement ? <SettlementDetail settlement={group.settlement} /> : null}
    </div>
  );
}

/** Order identity cell: sellers get a link into the order; promoters a copyable ID. */
function OrderCell({
  group,
  audience,
}: {
  group: SellerAffiliateGroupedStatement;
  audience: SellerAffiliateStatementAudience;
}) {
  const { t } = useI18n();
  const guest = groupHasGuestBuyer(group);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {audience === 'seller' ? (
        <Link
          href={orderDetailPath(group.orderID, 'sale')}
          className="font-mono text-xs text-primary underline-offset-2 hover:underline"
          title={group.orderID}
          onClick={event => event.stopPropagation()}
        >
          {truncateAddress(group.orderID)}
        </Link>
      ) : (
        <CopyableCode value={group.orderID} label={t('sellerAffiliate.copyOrderID')} />
      )}
      {guest ? (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('sellerAffiliate.guestOrder')}
        </span>
      ) : null}
    </span>
  );
}

export const SellerAffiliateStatementsPanel = memo(function SellerAffiliateStatementsPanel({
  audience,
  promoterTarget,
}: SellerAffiliateStatementsPanelProps) {
  const { t } = useI18n();
  const { localCurrency } = useCurrencyFormat();
  const { statements, loading, error, reload } = useSellerAffiliateStatements(
    audience,
    true,
    promoterTarget
  );
  const [statusFilter, setStatusFilter] = useState<StatementStatusFilter>('all');
  const [promoterFilter, setPromoterFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());

  const title = t(
    audience === 'seller'
      ? 'sellerAffiliate.sellerStatementTitle'
      : 'sellerAffiliate.promoterStatementTitle'
  );
  const statusLabels: Record<SellerAffiliateDisplayStatus, string> = {
    pending: t('sellerAffiliate.pending'),
    settling: t('sellerAffiliate.settling'),
    failed: t('sellerAffiliate.failed'),
    paid: t('sellerAffiliate.paid'),
    reversed: t('sellerAffiliate.reversed'),
    clawback_due: t('sellerAffiliate.clawbackDue'),
  };
  const groups = useMemo(() => groupSellerAffiliateStatementLines(statements), [statements]);
  const summary = useMemo(() => summarizeSellerAffiliateEarnings(groups), [groups]);

  const promoters = useMemo(() => {
    const seen = new Set<string>();
    for (const group of groups) seen.add(groupPromoter(group));
    return Array.from(seen);
  }, [groups]);

  // Resolve promoter and buyer peers to display names so the list shows
  // people, not hashes. Missing entries fall back to a truncated peer ID.
  const peerIDsToResolve = useMemo(() => {
    const ids = new Set<string>(promoters);
    for (const group of groups) {
      for (const line of group.lines) {
        if (line.attribution.buyerPeerID) ids.add(line.attribution.buyerPeerID);
      }
    }
    return Array.from(ids);
  }, [groups, promoters]);
  const profiles = usePeerDisplayProfiles(peerIDsToResolve);

  const hasFailed = groups.some(group => group.displayStatus === 'failed');
  const hasReversed = summary.reversedOrders > 0;

  const filtersActive =
    statusFilter !== 'all' || promoterFilter !== 'all' || dateFrom !== '' || dateTo !== '';

  const filteredGroups = useMemo(() => {
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    // The "to" bound is inclusive: anything before the end of that day matches.
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return groups.filter(group => {
      if (!matchesStatusFilter(group.displayStatus, statusFilter)) return false;
      if (promoterFilter !== 'all' && groupPromoter(group) !== promoterFilter) return false;
      if (fromTime !== null || toTime !== null) {
        const attributed = new Date(groupAttributedAt(group)).getTime();
        if (Number.isFinite(attributed)) {
          if (fromTime !== null && attributed < fromTime) return false;
          if (toTime !== null && attributed > toTime) return false;
        }
      }
      return true;
    });
  }, [groups, statusFilter, promoterFilter, dateFrom, dateTo]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedKeys(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setPromoterFilter('all');
    setDateFrom('');
    setDateTo('');
  }, []);

  const statusChips: { value: StatementStatusFilter; label: string }[] = [
    { value: 'all', label: t('sellerAffiliate.filterAll') },
    { value: 'paid', label: t('sellerAffiliate.paid') },
    { value: 'in_progress', label: t('sellerAffiliate.filterInProgress') },
    ...(hasReversed ? [{ value: 'reversed' as const, label: t('sellerAffiliate.reversed') }] : []),
    ...(hasFailed ? [{ value: 'failed' as const, label: t('sellerAffiliate.failed') }] : []),
  ];

  const formatDate = (iso: string): string => {
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
  };

  return (
    <Card data-testid={`seller-affiliate-statements-${audience}`} aria-busy={loading}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('sellerAffiliate.statementDescription')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => void reload()}
          disabled={loading}
          aria-label={t('sellerAffiliate.refresh')}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {t('sellerAffiliate.statementLoadFailed')}
          </p>
        ) : null}
        {!loading && !error && !groups.length ? (
          <p className="text-sm text-muted-foreground">
            {t(
              audience === 'promoter'
                ? 'sellerAffiliate.statementEmptyPromoter'
                : 'sellerAffiliate.statementEmptySeller'
            )}
          </p>
        ) : null}
        {groups.length ? (
          <div
            className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-4"
            data-testid={`seller-affiliate-earnings-summary-${audience}`}
          >
            <EarningsBucket
              label={t('sellerAffiliate.earningsPaidLabel')}
              countLine={t('sellerAffiliate.earningsOrders', { count: summary.paidOrders })}
              entries={summary.paidByCurrency}
              localCurrency={localCurrency}
              emphasis="primary"
              filter="paid"
              activeFilter={statusFilter}
              onFilter={setStatusFilter}
            />
            <EarningsBucket
              label={t('sellerAffiliate.earningsInProgressLabel')}
              countLine={t('sellerAffiliate.earningsOrders', { count: summary.pendingOrders })}
              entries={summary.pendingByCurrency}
              localCurrency={localCurrency}
              filter="in_progress"
              activeFilter={statusFilter}
              onFilter={setStatusFilter}
            />
            {audience === 'seller' ? (
              <div className="space-y-0.5 p-1" data-testid="seller-affiliate-converting-promoters">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('sellerAffiliate.earningsPromotersLabel')}
                </p>
                <p className="text-sm font-semibold">{summary.convertingPromoters}</p>
                <p className="text-xs text-muted-foreground">
                  {t('sellerAffiliate.earningsAttributedOrders', { count: summary.totalOrders })}
                </p>
              </div>
            ) : null}
            {hasReversed ? (
              <EarningsBucket
                label={t('sellerAffiliate.earningsReversedLabel')}
                countLine={t('sellerAffiliate.earningsOrders', { count: summary.reversedOrders })}
                entries={[]}
                localCurrency={localCurrency}
                headlineOverride={String(summary.reversedOrders)}
                emphasis="destructive"
                filter="reversed"
                activeFilter={statusFilter}
                onFilter={setStatusFilter}
                testId="seller-affiliate-reversed"
              />
            ) : null}
          </div>
        ) : null}
        {groups.length ? (
          <div className="flex flex-wrap items-center gap-2" data-testid="seller-affiliate-filters">
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label={t('sellerAffiliate.tableStatus')}
            >
              {statusChips.map(chip => (
                <Button
                  key={chip.value}
                  type="button"
                  size="sm"
                  variant={statusFilter === chip.value ? 'secondary' : 'ghost'}
                  className="min-h-9"
                  onClick={() => setStatusFilter(chip.value)}
                  aria-pressed={statusFilter === chip.value}
                  data-testid={`seller-affiliate-filter-${chip.value}`}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
            {audience === 'seller' && promoters.length > 1 ? (
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={promoterFilter}
                onChange={event => setPromoterFilter(event.target.value)}
                aria-label={t('sellerAffiliate.tablePromoter')}
                data-testid="seller-affiliate-filter-promoter"
              >
                <option value="all">{t('sellerAffiliate.filterPromoterAll')}</option>
                {promoters.map(promoter => (
                  <option key={promoter} value={promoter}>
                    {profiles.get(promoter)?.name || truncateAddress(promoter)}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="flex items-center gap-1">
              <Input
                type="date"
                className="h-9 w-auto px-2 text-xs"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                aria-label={t('sellerAffiliate.filterFrom')}
                data-testid="seller-affiliate-filter-from"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                className="h-9 w-auto px-2 text-xs"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                aria-label={t('sellerAffiliate.filterTo')}
                data-testid="seller-affiliate-filter-to"
              />
            </div>
            {filtersActive ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-9 text-xs"
                onClick={clearFilters}
              >
                {t('sellerAffiliate.clearFilters')}
              </Button>
            ) : null}
          </div>
        ) : null}
        {groups.length && !filteredGroups.length ? (
          <p className="text-sm text-muted-foreground" data-testid="seller-affiliate-no-matches">
            {t('sellerAffiliate.filterNoMatches')}
          </p>
        ) : null}

        {/* Desktop: dense table (one row per order, details expand in place). */}
        {filteredGroups.length ? (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('sellerAffiliate.tableDate')}</th>
                  <th className="py-2 pr-3 font-medium">{t('sellerAffiliate.tableOrder')}</th>
                  {audience === 'seller' ? (
                    <th className="py-2 pr-3 font-medium">{t('sellerAffiliate.tablePromoter')}</th>
                  ) : null}
                  <th className="py-2 pr-3 text-right font-medium">
                    {t('sellerAffiliate.commission')}
                  </th>
                  <th className="py-2 pr-3 font-medium">{t('sellerAffiliate.tableStatus')}</th>
                  <th className="w-10 py-2">
                    <span className="sr-only">{t('sellerAffiliate.tableDetails')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(group => {
                  const key = `${group.orderID}::${group.currency}`;
                  const expanded = expandedKeys.has(key);
                  const columns = audience === 'seller' ? 6 : 5;
                  return (
                    <React.Fragment key={key}>
                      <tr
                        className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40"
                        data-testid={`seller-affiliate-statement-row-${group.orderID}`}
                        onClick={event => {
                          // Links, copy buttons, etc. keep their own behavior.
                          if ((event.target as HTMLElement).closest('a, button, input, select'))
                            return;
                          toggleExpanded(key);
                        }}
                      >
                        <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted-foreground">
                          {formatDate(groupAttributedAt(group))}
                        </td>
                        <td className="py-2 pr-3">
                          <OrderCell group={group} audience={audience} />
                        </td>
                        {audience === 'seller' ? (
                          <td className="py-2 pr-3">
                            <PeerIdentity
                              peerID={groupPromoter(group)}
                              profile={profiles.get(groupPromoter(group))}
                            />
                          </td>
                        ) : null}
                        <td className="whitespace-nowrap py-2 pr-3 text-right font-medium">
                          {renderPairedPrice(
                            group.commissionAtomic,
                            group.currency,
                            localCurrency,
                            {
                              isMinimalUnit: true,
                            }
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(group.displayStatus)}`}
                          >
                            {statusLabels[group.displayStatus]}
                          </span>
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => toggleExpanded(key)}
                            aria-expanded={expanded}
                            aria-label={t(
                              expanded ? 'sellerAffiliate.collapseRow' : 'sellerAffiliate.expandRow'
                            )}
                          >
                            {expanded ? (
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-b border-border/60 bg-muted/20">
                          <td colSpan={columns} className="px-2 py-3">
                            <StatementDetailContent
                              group={group}
                              audience={audience}
                              profiles={profiles}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Mobile: card per order with the settlement detail inline. */}
        <div className="space-y-3 md:hidden">
          {filteredGroups.map(group => (
            <article
              key={`${group.orderID}::${group.currency}`}
              className="rounded-lg border border-border p-3"
              data-testid={`seller-affiliate-statement-${group.orderID}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatDate(groupAttributedAt(group))}
                </p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(group.displayStatus)}`}
                >
                  {statusLabels[group.displayStatus]}
                </span>
              </div>
              <div className="mt-1">
                <OrderCell group={group} audience={audience} />
              </div>
              {audience === 'seller' ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('sellerAffiliate.tablePromoter')}{' '}
                  <PeerIdentity
                    peerID={groupPromoter(group)}
                    profile={profiles.get(groupPromoter(group))}
                  />
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-muted-foreground">{t('sellerAffiliate.commission')}</p>
                <p className="font-medium">
                  {renderPairedPrice(group.commissionAtomic, group.currency, localCurrency, {
                    isMinimalUnit: true,
                  })}
                </p>
              </div>
              <div className="mt-2 border-t border-border pt-2">
                <StatementDetailContent group={group} audience={audience} profiles={profiles} />
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
