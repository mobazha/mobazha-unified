'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, ordersApi } from '@mobazha/core';
import type { OnrampFundingSourceView } from '@mobazha/core';

// Onramp purchase statuses that are still progressing toward delivery
// (mirrors the backend contract's Active set).
const ACTIVE_STATUSES = new Set(['created', 'awaiting_payment', 'processing', 'delivering']);

// Mount-refresh throttle, deliberately OUTSIDE the component: the payment
// page remounts this section when session refetches swap its subtree, and a
// per-instance guard dies with the instance. Keyed by order id.
const lastMountRefreshAt = new Map<string, number>();
const MOUNT_REFRESH_MIN_GAP_MS = 5_000;

export interface OnrampFundingSectionProps {
  orderID: string;
  /** The session's onramp funding source (session.onrampFunding). */
  source: OnrampFundingSourceView;
  /** Cross-store checkout routes through the seller node. */
  vendorPeerID?: string;
  /**
   * Called after a refresh persists a provider transition, so the page can
   * re-fetch the payment session (funding state may have refined).
   */
  onUpdated?: (source: OnrampFundingSourceView | null) => void;
  className?: string;
}

/**
 * Renders the onramp funding leg of a payment session (ADR-019).
 *
 * This section is descriptive: an onramp purchase is a funding source feeding
 * the frozen on-chain funding target. "Payment complete" is never shown here —
 * the session reaches funded/verified only through the on-chain observation,
 * which the surrounding payment page already gates on.
 */
export const OnrampFundingSection: React.FC<OnrampFundingSectionProps> = ({
  orderID,
  source: initialSource,
  vendorPeerID,
  onUpdated,
  className,
}) => {
  const { t } = useI18n();
  const [source, setSource] = useState<OnrampFundingSourceView>(initialSource);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  useEffect(() => {
    setSource(initialSource);
  }, [initialSource]);

  const isActive = ACTIVE_STATUSES.has(source.status);

  const sourceStatusRef = useRef(source.status);
  useEffect(() => {
    sourceStatusRef.current = source.status;
  }, [source.status]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await ordersApi.refreshOrderOnrampFunding(orderID, { vendorPeerID });
      setRefreshError(false);
      // Only a REAL provider transition propagates. A null refresh means
      // settled-or-nothing-in-flight; pushing that upward on every poll made
      // the page refetch the session unconditionally, and combined with
      // remount-driven mount refreshes that closed a response-paced request
      // loop (observed live at 19-34 req/s, rendered as page flicker). The
      // page's own status poll owns the endgame once the chain observation
      // verifies the session.
      if (next && next.status !== sourceStatusRef.current) {
        setSource(next);
        onUpdated?.(next);
      }
    } catch {
      // Best-effort: the stored record stands; the next tick retries.
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }, [orderID, vendorPeerID, onUpdated]);

  // The interval must not depend on refresh's identity. refresh closes over
  // onUpdated, which the payment page passes as an inline arrow — a new
  // identity on every one of its renders. Depending on it here tore the timer
  // down and rebuilt it on each parent render, and the page re-renders (its
  // own session poll, countdowns) far more often than every 10s, so the tick
  // never fired: the purchase sat at awaiting_payment forever in a real
  // browser even though the endpoint works. Route through a ref instead.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Poll the provider while the purchase is progressing toward delivery.
  // Refresh IMMEDIATELY on mount, then on the interval: the payment page can
  // remount this section (session refetches swap the subtree), and a poll
  // that only ever fires after a full quiet interval can be starved by that
  // churn — observed live as refreshes minutes apart while the purchase sat
  // at awaiting_payment. Refreshing on mount makes remounting itself drive
  // the poll, with the interval as the steady-state backstop.
  useEffect(() => {
    if (!isActive) return;
    const last = lastMountRefreshAt.get(orderID) ?? 0;
    if (Date.now() - last >= MOUNT_REFRESH_MIN_GAP_MS) {
      lastMountRefreshAt.set(orderID, Date.now());
      void refreshRef.current();
    }
    const interval = window.setInterval(() => {
      lastMountRefreshAt.set(orderID, Date.now());
      void refreshRef.current();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [isActive, orderID]);

  const statusLabel = (() => {
    switch (source.status) {
      case 'created':
      case 'awaiting_payment':
        return t('onramp.statusAwaitingPayment');
      case 'processing':
        return t('onramp.statusProcessing');
      case 'delivering':
        return t('onramp.statusDelivering');
      case 'delivered':
        return source.deliverToBuyerWallet
          ? t('onramp.statusForwarding')
          : t('onramp.statusAwaitingChain');
      case 'failed':
        return t('onramp.statusFailed');
      case 'reversed':
        return t('onramp.statusReversed');
      default:
        return source.status;
    }
  })();

  const isTerminalFailure = source.status === 'failed' || source.status === 'reversed';
  const showBuyerAction =
    (source.status === 'created' || source.status === 'awaiting_payment') &&
    !!source.buyerActionURL;

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4 space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isTerminalFailure ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : source.status === 'delivered' ? (
            <CheckCircle className="h-5 w-5 text-primary" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          <div>
            <div className="text-sm font-medium text-foreground">{t('onramp.title')}</div>
            <div className="text-sm text-muted-foreground">{statusLabel}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label={t('onramp.refresh')}
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {showBuyerAction && (
        <a
          href={source.buyerActionURL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('onramp.continuePayment')}
          <ArrowUpRight className="h-4 w-4" />
        </a>
      )}

      {/* Honest completion semantics: chain arrival is the only truth. */}
      <p className="text-xs text-muted-foreground">{t('onramp.chainConfirmationNote')}</p>

      {source.disclosure && <p className="text-xs text-muted-foreground">{source.disclosure}</p>}

      {refreshError && <p className="text-xs text-destructive">{t('onramp.refreshFailed')}</p>}
    </div>
  );
};
