'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, getAdminFinancePath } from '@mobazha/core';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Copy,
  History,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  listXMRTransfers,
  piconeroToXMR,
  type MoneroListTransfersOptions,
  type MoneroTransferEntry,
  type MoneroTransfersResult,
} from '@mobazha/core/services/api/monero';

/**
 * XMR transaction history (Outpost only) — OP-MP-6
 *
 * Server-side gated by adminOnlyAuthSecurity (no API tokens). Each
 * request hits monero-wallet-rpc; nothing is cached server-side.
 *
 * Bucket filter chips mirror wallet-rpc get_transfers flags. The
 * default view ("Incoming + Outgoing") matches the backend's default
 * when no flags are sent — confirmed history only, no mempool noise.
 *
 * Amount and Fee come back as decimal piconero strings (1 XMR = 10^12
 * piconero) and MUST be formatted via {@link piconeroToXMR}; do not
 * parse to Number, balances above ~9000 XMR overflow JS Number's safe
 * integer range.
 */

type BucketKey = 'in' | 'out' | 'pool' | 'pending' | 'failed';

interface BucketDef {
  key: BucketKey;
  /** i18n label key */
  labelKey: string;
  defaultLabel: string;
}

const ALL_BUCKETS: BucketDef[] = [
  { key: 'in', labelKey: 'outpost.xmrTransfers.bucketIn', defaultLabel: 'Incoming' },
  { key: 'out', labelKey: 'outpost.xmrTransfers.bucketOut', defaultLabel: 'Outgoing' },
  { key: 'pool', labelKey: 'outpost.xmrTransfers.bucketPool', defaultLabel: 'Mempool' },
  { key: 'pending', labelKey: 'outpost.xmrTransfers.bucketPending', defaultLabel: 'Pending' },
  { key: 'failed', labelKey: 'outpost.xmrTransfers.bucketFailed', defaultLabel: 'Failed' },
];

// Default view: confirmed traffic in both directions. Mempool / pending /
// failed are off by default to keep the table readable; the operator
// flips them on when investigating a stuck payment.
const DEFAULT_BUCKETS: Record<BucketKey, boolean> = {
  in: true,
  out: true,
  pool: false,
  pending: false,
  failed: false,
};

function NotOutpostPlaceholder() {
  const { t } = useI18n();
  return (
    <div>
      <SettingsPageHeader
        title={t('outpost.xmrTransfers.title', { defaultValue: 'Monero Transactions' })}
        backHref={getAdminFinancePath()}
      />
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('outpost.xmrTransfers.notApplicable', {
            defaultValue: 'This page is only available on Outpost builds.',
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export default function XMRTransfersPage() {
  const { t } = useI18n();
  const [buckets, setBuckets] = useState<Record<BucketKey, boolean>>(DEFAULT_BUCKETS);
  const [data, setData] = useState<MoneroTransfersResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOpts = useMemo<MoneroListTransfersOptions>(() => {
    // Always send explicit flags — the operator's chip selection IS the
    // filter, even when it matches the backend default. This avoids the
    // confusing case where unselecting "Incoming" would silently fall
    // back to the in+out default and still show incoming rows.
    return {
      in: buckets.in,
      out: buckets.out,
      pool: buckets.pool,
      pending: buckets.pending,
      failed: buckets.failed,
    };
  }, [buckets]);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await listXMRTransfers(requestOpts);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('outpost.xmrTransfers.fetchError', {
              defaultValue: 'Failed to fetch transactions',
            })
      );
    } finally {
      setBusy(false);
    }
  }, [requestOpts, t]);

  useEffect(() => {
    if (!__OUTPOST__) return;
    refresh();
  }, [refresh]);

  if (!__OUTPOST__) {
    return <NotOutpostPlaceholder />;
  }

  const noneSelected = ALL_BUCKETS.every(b => !buckets[b.key]);

  return (
    <div data-testid="admin-xmr-transfers" className="space-y-6">
      <SettingsPageHeader
        title={t('outpost.xmrTransfers.title', { defaultValue: 'Monero Transactions' })}
        description={t('outpost.xmrTransfers.description', {
          defaultValue:
            'All payments seen by your Monero wallet. Live data — fetched from monero-wallet-rpc on every refresh.',
        })}
        backHref={getAdminFinancePath()}
      />

      <BucketFilters
        buckets={buckets}
        onToggle={key => {
          setBuckets(prev => ({ ...prev, [key]: !prev[key] }));
        }}
        onReset={() => setBuckets(DEFAULT_BUCKETS)}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data
            ? t('outpost.xmrTransfers.countAndAccount', {
                defaultValue: '{{n}} transaction(s) — account #{{idx}}',
                n: data.transfers.length,
                idx: data.accountIndex,
              })
            : ' '}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={busy}
          data-testid="xmr-transfers-refresh"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
          )}
          {t('outpost.xmrTransfers.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {noneSelected ? (
        <EmptyHint
          icon={<History className="w-8 h-8 text-muted-foreground" />}
          title={t('outpost.xmrTransfers.noBucketTitle', {
            defaultValue: 'No filters selected',
          })}
          description={t('outpost.xmrTransfers.noBucketDesc', {
            defaultValue: 'Pick at least one filter to load transactions.',
          })}
        />
      ) : busy && !data ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {t('outpost.xmrTransfers.loading', { defaultValue: 'Loading transactions…' })}
          </CardContent>
        </Card>
      ) : data && data.transfers.length === 0 ? (
        <EmptyHint
          icon={<History className="w-8 h-8 text-muted-foreground" />}
          title={t('outpost.xmrTransfers.emptyTitle', {
            defaultValue: 'No transactions yet',
          })}
          description={t('outpost.xmrTransfers.emptyDesc', {
            defaultValue: 'Payments will appear here once they hit the wallet.',
          })}
        />
      ) : data ? (
        <TransferTable transfers={data.transfers} />
      ) : null}

      <Link
        to={getAdminFinancePath()}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('outpost.xmrTransfers.backToPayments', { defaultValue: 'Back to Funds' })}
      </Link>
    </div>
  );
}

// =====================================================================
// Bucket filters
// =====================================================================

function BucketFilters({
  buckets,
  onToggle,
  onReset,
}: {
  buckets: Record<BucketKey, boolean>;
  onToggle: (key: BucketKey) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const isDefault = ALL_BUCKETS.every(b => buckets[b.key] === DEFAULT_BUCKETS[b.key]);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bucket filters">
      {ALL_BUCKETS.map(b => {
        const active = buckets[b.key];
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => onToggle(b.key)}
            data-testid={`xmr-transfers-bucket-${b.key}`}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted/40'
            }`}
            aria-pressed={active}
          >
            {t(b.labelKey, { defaultValue: b.defaultLabel })}
          </button>
        );
      })}
      {!isDefault && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
        >
          {t('outpost.xmrTransfers.resetFilters', { defaultValue: 'Reset' })}
        </button>
      )}
    </div>
  );
}

// =====================================================================
// Table
// =====================================================================

function TransferTable({ transfers }: { transfers: MoneroTransferEntry[] }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left font-medium px-4 py-2">
                  {t('outpost.xmrTransfers.colDirection', { defaultValue: 'Direction' })}
                </th>
                <th className="text-right font-medium px-4 py-2">
                  {t('outpost.xmrTransfers.colAmount', { defaultValue: 'Amount (XMR)' })}
                </th>
                <th className="text-right font-medium px-4 py-2">
                  {t('outpost.xmrTransfers.colFee', { defaultValue: 'Fee' })}
                </th>
                <th className="text-left font-medium px-4 py-2">
                  {t('outpost.xmrTransfers.colTxHash', { defaultValue: 'Tx Hash' })}
                </th>
                <th className="text-left font-medium px-4 py-2">
                  {t('outpost.xmrTransfers.colHeight', { defaultValue: 'Height' })}
                </th>
                <th className="text-left font-medium px-4 py-2">
                  {t('outpost.xmrTransfers.colWhen', { defaultValue: 'When' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(tr => (
                <TransferRow
                  key={`${tr.direction}-${tr.txHash}-${tr.subAddrIndex}`}
                  transfer={tr}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TransferRow({ transfer: tr }: { transfer: MoneroTransferEntry }) {
  const { t } = useI18n();
  const dir = directionMeta(tr.direction);
  const sign = tr.direction === 'in' ? '+' : tr.direction === 'out' ? '−' : '';
  const failed = tr.direction === 'failed';

  return (
    <tr
      className="border-b border-border/50 last:border-b-0 hover:bg-muted/30"
      data-testid={`xmr-transfer-row-${tr.txHash}`}
    >
      <td className="px-4 py-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${dir.classes}`}
        >
          {dir.icon}
          {t(dir.labelKey, { defaultValue: dir.defaultLabel })}
        </span>
      </td>
      <td
        className={`px-4 py-2 text-right font-mono tabular-nums ${
          failed ? 'line-through text-muted-foreground' : ''
        }`}
      >
        {sign}
        {piconeroToXMR(tr.amount)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-xs text-muted-foreground">
        {tr.fee && tr.fee !== '0' ? piconeroToXMR(tr.fee) : '—'}
      </td>
      <td className="px-4 py-2">
        <TxHashCell hash={tr.txHash} />
      </td>
      <td className="px-4 py-2 text-xs">
        {tr.height > 0 ? (
          <div className="flex flex-col">
            <span className="font-mono tabular-nums">{tr.height.toLocaleString()}</span>
            <span className="text-muted-foreground">
              {tr.confirmations >= 10
                ? t('outpost.xmrTransfers.confirmedDeep', { defaultValue: '10+ confirmations' })
                : t('outpost.xmrTransfers.confirmations', {
                    defaultValue: '{{n}} confirmation(s)',
                    n: tr.confirmations,
                  })}
            </span>
          </div>
        ) : tr.direction === 'pending' ? (
          <div className="flex flex-col">
            <span className="font-mono tabular-nums">0</span>
            <span className="text-muted-foreground">
              {t('outpost.xmrTransfers.awaitingFirstConfirmation', {
                defaultValue: 'Waiting for first confirmation',
              })}
            </span>
          </div>
        ) : tr.direction === 'pool' ? (
          <div className="flex flex-col">
            <span className="font-mono tabular-nums">0</span>
            <span className="text-muted-foreground">
              {t('outpost.xmrTransfers.seenInMempool', {
                defaultValue: 'Seen in mempool',
              })}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-xs text-muted-foreground">
        {tr.timestamp > 0 ? new Date(tr.timestamp * 1000).toLocaleString() : '—'}
      </td>
    </tr>
  );
}

function TxHashCell({ hash }: { hash: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Same fallback story as in xmr-secrets/page.tsx — clipboard
      // permission can be denied; visible text remains selectable.
    }
  }, [hash]);

  const truncated = hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground"
      title={hash}
      aria-label={t('outpost.xmrTransfers.copyTxHash', {
        defaultValue: 'Copy transaction hash',
      })}
    >
      <span>{truncated}</span>
      <Copy className="w-3 h-3" />
      {copied && (
        <span className="text-green-600 dark:text-green-400 ml-1">
          {t('outpost.xmrTransfers.copied', { defaultValue: 'Copied' })}
        </span>
      )}
    </button>
  );
}

// =====================================================================
// Direction badge metadata
// =====================================================================

interface DirectionMeta {
  icon: React.ReactNode;
  classes: string;
  labelKey: string;
  defaultLabel: string;
}

function directionMeta(d: MoneroTransferEntry['direction']): DirectionMeta {
  switch (d) {
    case 'in':
      return {
        icon: <ArrowDownLeft className="w-3 h-3" />,
        classes: 'bg-green-500/10 text-green-700 dark:text-green-400',
        labelKey: 'outpost.xmrTransfers.bucketIn',
        defaultLabel: 'Incoming',
      };
    case 'out':
      return {
        icon: <ArrowUpRight className="w-3 h-3" />,
        classes: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
        labelKey: 'outpost.xmrTransfers.bucketOut',
        defaultLabel: 'Outgoing',
      };
    case 'pool':
      return {
        icon: <Clock className="w-3 h-3" />,
        classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        labelKey: 'outpost.xmrTransfers.bucketPool',
        defaultLabel: 'Mempool',
      };
    case 'pending':
      return {
        icon: <Clock className="w-3 h-3" />,
        classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        labelKey: 'outpost.xmrTransfers.bucketPending',
        defaultLabel: 'Pending',
      };
    case 'failed':
      return {
        icon: <XCircle className="w-3 h-3" />,
        classes: 'bg-red-500/10 text-red-700 dark:text-red-400',
        labelKey: 'outpost.xmrTransfers.bucketFailed',
        defaultLabel: 'Failed',
      };
    default: {
      // Defensive fallback: backend might add a new bucket later. Keep
      // the row visible rather than crashing the table render.
      const _exhaustive: never = d;
      void _exhaustive;
      return {
        icon: <AlertTriangle className="w-3 h-3" />,
        classes: 'bg-muted text-muted-foreground',
        labelKey: 'outpost.xmrTransfers.bucketUnknown',
        defaultLabel: 'Unknown',
      };
    }
  }
}

// =====================================================================
// Empty hint
// =====================================================================

function EmptyHint({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center justify-center gap-2 text-center">
        {icon}
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground max-w-md">{description}</p>
      </CardContent>
    </Card>
  );
}
