'use client';

import React from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import type { OnrampFundingSourceView } from '@mobazha/core';

export interface OnrampFundingSectionProps {
  source: OnrampFundingSourceView;
  refreshing?: boolean;
  refreshError?: boolean;
  resolvedWithoutView?: boolean;
  onRefresh?: () => void;
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
  source,
  refreshing = false,
  refreshError = false,
  resolvedWithoutView = false,
  onRefresh,
  className,
}) => {
  const { t } = useI18n();

  const statusLabel = (() => {
    if (resolvedWithoutView) return t('onramp.statusAwaitingChain');
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
          ) : source.status === 'delivered' || resolvedWithoutView ? (
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
          onClick={onRefresh}
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
