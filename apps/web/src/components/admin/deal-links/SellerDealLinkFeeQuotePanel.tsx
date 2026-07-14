'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { Loader2, ReceiptText, RefreshCw } from 'lucide-react';
import {
  ApiError,
  isDealLinkFeeQuoteExpired,
  useSellerDealLinkFeeQuote,
  useCurrency,
  useI18n,
  type DealLinkFeeQuote,
  type SellerDealLink,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export interface SellerDealLinkFeeQuotePanelProps {
  link: SellerDealLink;
}

type SellerFeeLineKey =
  | 'grossOrderAmount'
  | 'discount'
  | 'sellerServiceCharge'
  | 'sellerPaymentCost'
  | 'sellerDistributionBudget';

// Server-authored seller-side components only; never derived or fabricated.
const SELLER_FEE_LINES: SellerFeeLineKey[] = [
  'grossOrderAmount',
  'discount',
  'sellerServiceCharge',
  'sellerPaymentCost',
  'sellerDistributionBudget',
];

/**
 * Map a typed hosting error from the fee-quote endpoint to honest,
 * capability-specific copy. Only the status carried by {@link ApiError} is
 * authoritative: 403 denied, 404 foreign/missing, 409 conflict. A 409 has
 * several current causes — the link is inactive or expired, the exact bound
 * product version is unpublished or no longer current, the selected options are
 * invalid, or delivery is unavailable — so the copy names all of them rather
 * than claiming "inactive" is the only reason. Anything else (network, plain
 * Error) falls back to the generic quote failure rather than inventing a reason
 * the backend did not give.
 */
function describeFeeQuoteError(
  error: unknown,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return t('admin.dealLinks.dealErrorDenied');
    if (error.status === 404) return t('admin.dealLinks.dealErrorGone');
    if (error.status === 409) return t('admin.dealLinks.feeQuoteConflictError');
  }
  return t('admin.dealLinks.feeQuoteError');
}

type FeeQuoteGate = 'quotable' | 'expired' | 'inactive';

/**
 * Classify why the link can or cannot be quoted, so the notice is honest about
 * the state. An `active` link whose expiry has passed (or one the backend has
 * already flipped to `expired`) is treated as expired — recoverable by
 * extending expiry or saving a revision — while `draft`/`paused`/`closed` are
 * plain inactive. `closed` is terminal and wins over a passed expiry. This is
 * only an early, client-side hint from status/expiry: the backend remains
 * authoritative and can still reject the request (catalog, options, or
 * delivery conflicts) even when this gate reads `quotable`.
 */
function classifyFeeQuoteGate(
  status: SellerDealLink['status'],
  expiresAt: string | undefined,
  now: number
): FeeQuoteGate {
  if (status === 'closed') return 'inactive';
  if (status === 'expired') return 'expired';
  if (status !== 'active') return 'inactive';
  if (expiresAt && new Date(expiresAt).getTime() <= now) return 'expired';
  return 'quotable';
}

export const SellerDealLinkFeeQuotePanel = memo(function SellerDealLinkFeeQuotePanel({
  link,
}: SellerDealLinkFeeQuotePanelProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const { requestQuote: requestFeeQuote } = useSellerDealLinkFeeQuote(link.id);
  const [quote, setQuote] = useState<DealLinkFeeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A link past its expiry cannot be quoted even if hosting still reports it
  // active; closed is terminal and wins over a passed expiry. This mirrors the
  // row's gate, but it is only an early status/expiry hint — the backend still
  // has the final say and can reject a `quotable` link's request with 409.
  const [renderedAt] = useState(() => Date.now());
  const gate = useMemo(
    () => classifyFeeQuoteGate(link.status, link.expiresAt, renderedAt),
    [link.status, link.expiresAt, renderedAt]
  );

  const handleRequestQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestFeeQuote();
      setQuote(result);
    } catch (cause) {
      setError(describeFeeQuoteError(cause, t));
    } finally {
      setLoading(false);
    }
  }, [requestFeeQuote, t]);

  const quoteExpired = quote ? isDealLinkFeeQuoteExpired(quote) : false;

  return (
    <section
      className="space-y-3 rounded-lg border border-border p-4"
      aria-labelledby="deal-link-fee-quote-title"
      data-testid="deal-link-fee-quote-panel"
    >
      <div className="space-y-1">
        <h3
          id="deal-link-fee-quote-title"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('admin.dealLinks.feeQuoteTitle')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('admin.dealLinks.feeQuoteSubtitle')}</p>
      </div>

      {gate === 'expired' ? (
        <p
          className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
          data-testid="deal-link-fee-quote-expired-notice"
        >
          {t('admin.dealLinks.feeQuoteExpiredNotice')}
        </p>
      ) : gate === 'inactive' ? (
        <p
          className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
          data-testid="deal-link-fee-quote-inactive"
        >
          {t('admin.dealLinks.feeQuoteInactiveNotice')}
        </p>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={loading}
            onClick={() => void handleRequestQuote()}
            data-testid="deal-link-fee-quote-request"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : quote ? (
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : null}
            {t(quote ? 'admin.dealLinks.feeQuoteRefreshCta' : 'admin.dealLinks.feeQuoteRequestCta')}
          </Button>

          {error ? (
            <p
              className="text-xs text-destructive"
              role="alert"
              data-testid="deal-link-fee-quote-error"
            >
              {error}
            </p>
          ) : null}

          {quote ? (
            <dl className="space-y-3" data-testid="deal-link-fee-quote-summary">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border p-3">
                  <dt className="text-xs text-muted-foreground">
                    {t('admin.dealLinks.feeQuoteBuyerTotal')}
                  </dt>
                  <dd
                    className="text-lg font-semibold tabular-nums"
                    data-testid="deal-link-fee-quote-buyer-total"
                  >
                    {formatPrice(quote.buyerTotal, quote.priceCurrency)}
                  </dd>
                </div>
                <div className="rounded-md border border-border p-3">
                  <dt className="text-xs text-muted-foreground">
                    {t('admin.dealLinks.feeQuoteSellerNet')}
                  </dt>
                  <dd
                    className="text-lg font-semibold text-primary tabular-nums"
                    data-testid="deal-link-fee-quote-seller-net"
                  >
                    {formatPrice(quote.estimatedSellerNet, quote.priceCurrency)}
                  </dd>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('admin.dealLinks.feeQuoteComponentsTitle')}
                </p>
                {SELLER_FEE_LINES.map(key => (
                  <div key={key} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-muted-foreground">
                      {t(`admin.dealLinks.feeQuoteLine.${key}`)}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatPrice(quote[key], quote.priceCurrency)}
                    </dd>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {t('admin.dealLinks.revisionLabel')}:{' '}
                  <span className="font-medium text-foreground">
                    {t('admin.dealLinks.revisionValue', { revision: quote.dealRevision })}
                  </span>
                </span>
                <span>
                  {t('admin.dealLinks.feeQuotePolicyLabel')}:{' '}
                  <span className="font-medium text-foreground">{quote.policyVersion}</span>
                </span>
                <span data-testid="deal-link-fee-quote-expiry">
                  {t('admin.dealLinks.feeQuoteExpiresLabel')}:{' '}
                  <span
                    className={
                      quoteExpired ? 'font-medium text-destructive' : 'font-medium text-foreground'
                    }
                  >
                    {quoteExpired
                      ? t('admin.dealLinks.feeQuoteExpired')
                      : new Date(quote.expiresAt).toLocaleString()}
                  </span>
                </span>
              </div>
            </dl>
          ) : !error ? (
            <p className="text-xs text-muted-foreground">{t('admin.dealLinks.feeQuoteEmpty')}</p>
          ) : null}
        </>
      )}
    </section>
  );
});
