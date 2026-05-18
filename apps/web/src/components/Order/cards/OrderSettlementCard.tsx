'use client';

import React, { memo, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SettlementActionSnapshot } from '@mobazha/core';
import { AlertCircle, CheckCircle2, Clock3, Link2, XCircle } from 'lucide-react';

export interface OrderSettlementCardProps {
  settlementAction?: SettlementActionSnapshot | null;
  className?: string;
}

interface StateConfig {
  icon: React.ElementType;
  label: string;
  color: string;
  badgeClassName: string;
  hint?: string;
}

function formatActionLabel(action?: string): string {
  switch ((action || '').trim().toLowerCase()) {
    case 'confirm':
      return 'Confirm';
    case 'cancel':
      return 'Cancel';
    case 'complete':
      return 'Complete';
    case 'dispute_release':
      return 'Dispute release';
    default:
      return action || 'Settlement';
  }
}

function formatStateLabel(state?: string): string {
  switch ((state || '').trim().toLowerCase()) {
    case 'submitting':
      return 'Submitting';
    case 'submitted':
      return 'Submitted';
    case 'confirmed':
      return 'Confirmed';
    case 'failed':
      return 'Failed';
    case 'abandoned':
      return 'Timed out';
    default:
      return state || 'Unknown';
  }
}

function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export const OrderSettlementCard = memo(function OrderSettlementCard({
  settlementAction,
  className,
}: OrderSettlementCardProps) {
  const cfg = useMemo<StateConfig | null>(() => {
    if (!settlementAction) return null;
    switch ((settlementAction.state || '').trim().toLowerCase()) {
      case 'submitting':
        return {
          icon: Clock3,
          label: 'Submitting',
          color: 'text-sky-700 dark:text-sky-300',
          badgeClassName:
            'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
          hint: 'Preparing relay submission.',
        };
      case 'submitted':
        return {
          icon: Clock3,
          label: 'Submitted',
          color: 'text-amber-700 dark:text-amber-300',
          badgeClassName:
            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
          hint: 'Waiting for on-chain confirmation.',
        };
      case 'confirmed':
        return {
          icon: CheckCircle2,
          label: 'Confirmed',
          color: 'text-emerald-700 dark:text-emerald-300',
          badgeClassName:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
          hint: 'Settlement transaction confirmed on-chain.',
        };
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          color: 'text-destructive',
          badgeClassName: 'bg-destructive/10 text-destructive border-destructive/20',
          hint: 'Settlement transaction failed.',
        };
      case 'abandoned':
        return {
          icon: AlertCircle,
          label: 'Timed out',
          color: 'text-destructive',
          badgeClassName: 'bg-destructive/10 text-destructive border-destructive/20',
          hint: 'Confirmation polling timed out.',
        };
      default:
        return {
          icon: Link2,
          label: formatStateLabel(settlementAction.state),
          color: 'text-muted-foreground',
          badgeClassName: 'bg-muted text-muted-foreground border-border',
        };
    }
  }, [settlementAction]);

  if (!settlementAction || !cfg) return null;

  const Icon = cfg.icon;
  const actionLabel = formatActionLabel(
    settlementAction.settlementAction || settlementAction.action
  );
  const txHash = settlementAction.txHash?.trim();
  const updatedAt = settlementAction.updatedAt ? new Date(settlementAction.updatedAt) : null;

  return (
    <Card className={cn('border-border/60 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Icon className={cn('h-4 w-4 shrink-0', cfg.color)} />
            <span>Settlement</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {actionLabel}
            {cfg.hint ? ` · ${cfg.hint}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium',
            cfg.badgeClassName
          )}
        >
          {cfg.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoRow label="Action ID" value={truncateMiddle(settlementAction.actionId)} mono />
        <InfoRow label="Action" value={actionLabel} />
        {txHash ? <InfoRow label="Tx Hash" value={truncateMiddle(txHash)} mono /> : null}
        {typeof settlementAction.confirmations === 'number' ? (
          <InfoRow label="Confirmations" value={String(settlementAction.confirmations)} />
        ) : null}
        {updatedAt && !Number.isNaN(updatedAt.getTime()) ? (
          <InfoRow label="Updated" value={updatedAt.toLocaleString()} />
        ) : null}
        {settlementAction.relayTaskId ? (
          <InfoRow
            label="Relay Task"
            value={truncateMiddle(settlementAction.relayTaskId, 8, 6)}
            mono
          />
        ) : null}
      </div>

      {settlementAction.lastError ? (
        <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {settlementAction.lastError}
        </div>
      ) : null}
    </Card>
  );
});

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-1 truncate text-sm text-foreground', mono && 'font-mono text-xs')}>
        {value}
      </div>
    </div>
  );
}
