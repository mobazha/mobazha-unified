'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/components/Order/utils';
import {
  getExplorerResourceUrl,
  useI18n,
  type CancellationContext,
  type SettlementActionSnapshot,
} from '@mobazha/core';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Copy,
  Check,
  ExternalLink,
  Link2,
  XCircle,
} from 'lucide-react';

export interface OrderSettlementCardProps {
  settlementAction?: SettlementActionSnapshot | null;
  paymentCoin?: string;
  chainId?: number;
  cancellation?: CancellationContext;
  className?: string;
}

interface StateConfig {
  icon: React.ElementType;
  labelKey: string;
  color: string;
  badgeClassName: string;
  hintKey: string;
}

function settlementActionKey(action?: string): string {
  switch ((action || '').trim().toLowerCase()) {
    case 'confirm':
      return 'actionConfirm';
    case 'cancel':
      return 'actionCancel';
    case 'complete':
      return 'actionComplete';
    case 'dispute_release':
      return 'actionDisputeRelease';
    default:
      return 'actionGeneric';
  }
}

function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export const OrderSettlementCard = memo(function OrderSettlementCard({
  settlementAction,
  paymentCoin,
  chainId,
  cancellation,
  className,
}: OrderSettlementCardProps) {
  const { t } = useI18n();

  const actionName = useMemo(
    () =>
      (settlementAction?.settlementAction || settlementAction?.action || '').trim().toLowerCase(),
    [settlementAction]
  );

  const actionLabel = t(`order.settlement.${settlementActionKey(actionName)}`);

  const cfg = useMemo<StateConfig | null>(() => {
    if (!settlementAction) return null;
    const state = (settlementAction.state || '').trim().toLowerCase();
    const isRefundAction = actionName === 'cancel' || actionName === 'refund';

    switch (state) {
      case 'submitting':
        return {
          icon: Clock3,
          labelKey: 'stateSubmitting',
          color: 'text-sky-700 dark:text-sky-300',
          badgeClassName:
            'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
          hintKey: 'hintSubmitting',
        };
      case 'submitted':
        return {
          icon: Clock3,
          labelKey: 'stateSubmitted',
          color: 'text-amber-700 dark:text-amber-300',
          badgeClassName:
            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
          hintKey: 'hintSubmitted',
        };
      case 'confirmed':
        return {
          icon: CheckCircle2,
          labelKey: 'stateConfirmed',
          color: isRefundAction
            ? 'text-sky-700 dark:text-sky-300'
            : 'text-emerald-700 dark:text-emerald-300',
          badgeClassName: isRefundAction
            ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
          hintKey: isRefundAction
            ? 'hintCancelConfirmed'
            : actionName === 'confirm' || actionName === 'complete'
              ? 'hintConfirmConfirmed'
              : 'hintGenericConfirmed',
        };
      case 'failed':
        return {
          icon: XCircle,
          labelKey: 'stateFailed',
          color: 'text-destructive',
          badgeClassName: 'bg-destructive/10 text-destructive border-destructive/20',
          hintKey: 'hintFailed',
        };
      case 'abandoned':
        return {
          icon: AlertCircle,
          labelKey: 'stateTimedOut',
          color: 'text-destructive',
          badgeClassName: 'bg-destructive/10 text-destructive border-destructive/20',
          hintKey: 'hintTimedOut',
        };
      default:
        return {
          icon: Link2,
          labelKey: 'stateSubmitted',
          color: 'text-muted-foreground',
          badgeClassName: 'bg-muted text-muted-foreground border-border',
          hintKey: 'hintSubmitted',
        };
    }
  }, [settlementAction, actionName]);

  if (!settlementAction || !cfg) return null;

  const Icon = cfg.icon;
  const txHash = settlementAction.txHash?.trim();
  const txUrl = txHash
    ? getExplorerResourceUrl(txHash, 'tx', { coin: paymentCoin, chainId }) || undefined
    : undefined;
  const updatedAt = settlementAction.updatedAt ? new Date(settlementAction.updatedAt) : null;
  const showConfirmationCount =
    typeof settlementAction.confirmations === 'number' &&
    (settlementAction.state || '').trim().toLowerCase() !== 'confirmed';

  const showTechnical =
    Boolean(settlementAction.actionId?.trim()) || Boolean(settlementAction.relayTaskId?.trim());

  const subtitle =
    cancellation?.kind === 'seller_decline' && actionName === 'cancel'
      ? `${actionLabel} · ${t('order.settlement.hintCancelConfirmed')}`
      : `${actionLabel} · ${t(`order.settlement.${cfg.hintKey}`)}`;

  return (
    <Card className={cn('border-border/60 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Icon className={cn('h-4 w-4 shrink-0', cfg.color)} />
            <span>{t('order.settlement.title')}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium',
            cfg.badgeClassName
          )}
        >
          {t(`order.settlement.${cfg.labelKey}`)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {txHash ? (
          <InfoRow
            label={t('order.settlement.labelTxHash')}
            value={truncateMiddle(txHash)}
            fullValue={txHash}
            mono
            href={txUrl}
          />
        ) : null}
        {showConfirmationCount ? (
          <InfoRow
            label={t('order.settlement.labelConfirmations')}
            value={String(settlementAction.confirmations)}
          />
        ) : null}
        {updatedAt && !Number.isNaN(updatedAt.getTime()) ? (
          <InfoRow label={t('order.settlement.labelUpdated')} value={updatedAt.toLocaleString()} />
        ) : null}
      </div>

      {showTechnical ? (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            {t('order.settlement.technicalDetails')}
          </summary>
          <div className="mt-2 grid gap-2">
            {settlementAction.actionId ? (
              <InfoRow
                label={t('order.settlement.labelActionId')}
                value={truncateMiddle(settlementAction.actionId, 12, 10)}
                fullValue={settlementAction.actionId}
                mono
                copyable
              />
            ) : null}
            {settlementAction.relayTaskId ? (
              <InfoRow
                label={t('order.settlement.labelRelayTask')}
                value={truncateMiddle(settlementAction.relayTaskId, 10, 8)}
                fullValue={settlementAction.relayTaskId}
                mono
                copyable
              />
            ) : null}
          </div>
        </details>
      ) : null}

      {settlementAction.lastError ? (
        <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {settlementAction.lastError}
        </div>
      ) : null}
    </Card>
  );
});

function InfoRow({
  label,
  value,
  fullValue,
  mono = false,
  href,
  copyable = false,
}: {
  label: string;
  value: string;
  /** 复制到剪贴板的完整值；未传时与 value 相同 */
  fullValue?: string;
  mono?: boolean;
  href?: string;
  copyable?: boolean;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copyTarget = fullValue || value;

  const handleCopy = useCallback(async () => {
    if (!copyTarget) return;
    const ok = await copyToClipboard(copyTarget);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [copyTarget]);

  const content = (
    <div
      className={cn(
        'mt-1 min-w-0 text-sm text-foreground',
        mono && 'font-mono text-xs break-all',
        !copyable && 'truncate',
        href && 'text-primary hover:underline'
      )}
      title={fullValue && fullValue !== value ? fullValue : undefined}
    >
      {value}
      {href ? <ExternalLink className="ml-1 inline h-3 w-3 align-[-2px]" /> : null}
    </div>
  );

  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        {copyable ? (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('order.actions.copyToClipboard')}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-primary" />
                <span className="text-primary">{t('common.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>{t('common.copy')}</span>
              </>
            )}
          </button>
        ) : null}
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" aria-label={`${label}: ${copyTarget}`}>
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
