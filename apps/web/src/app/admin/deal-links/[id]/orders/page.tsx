'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import {
  getPaymentCoinDisplayLabel,
  renderPairedPrice,
  truncateAddress,
  useCurrencyFormat,
  useI18n,
  useSellerDealLink,
  useSellerDealLinkOrders,
  type SellerDealLinkOrder,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

const PAGE_SIZE = 20;

// Acceptance lifecycle → label. 'completed' deliberately reads "Order created"
// (not "Completed"): it means the Node order was generated, not that it was
// paid, shipped, or fulfilled.
const STATUS_KEY: Record<string, string> = {
  completed: 'admin.dealLinks.orderStatusCompleted',
  processing: 'admin.dealLinks.orderStatusProcessing',
  manual_review: 'admin.dealLinks.orderStatusManualReview',
  failed: 'admin.dealLinks.orderStatusFailed',
};

const STATUS_CLASS: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600',
  processing: 'bg-muted text-muted-foreground',
  manual_review: 'bg-amber-500/10 text-amber-600',
  failed: 'bg-destructive/10 text-destructive',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OrderRow({ order }: { order: SellerDealLinkOrder }) {
  const { t } = useI18n();
  const router = useRouter();
  const { localCurrency } = useCurrencyFormat();
  const hasAmount = Boolean(order.amount && order.pricingCoin);
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`deal-link-order-${order.orderID}`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 break-all font-mono text-xs text-muted-foreground">
            {order.orderID}
          </p>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              STATUS_CLASS[order.acceptanceStatus] ?? 'bg-muted text-muted-foreground'
            }`}
            data-status={order.acceptanceStatus}
          >
            {t(STATUS_KEY[order.acceptanceStatus] ?? 'admin.dealLinks.statusUnknown')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('admin.dealLinks.orderBuyerLabel')}: {truncateAddress(order.buyerPeerID)}
          {' · '}
          {formatDate(order.createdAt)}
          {hasAmount ? (
            <>
              {' · '}
              <span className="font-medium text-foreground">
                {getPaymentCoinDisplayLabel(order.pricingCoin as string)}{' '}
                {renderPairedPrice(
                  order.amount as string,
                  order.pricingCoin as string,
                  localCurrency,
                  {
                    isMinimalUnit: true,
                    // Use the backend's authoritative divisibility; without it
                    // renderPairedPrice guesses from the currency registry and
                    // misrenders coins the registry does not know.
                    divisibility: order.currencyDivisibility,
                  }
                )}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 sm:min-h-9 sm:self-center"
        onClick={() => router.push(`/orders/${encodeURIComponent(order.orderID)}`)}
      >
        <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {t('admin.dealLinks.orderOpenCta')}
      </Button>
    </div>
  );
}

function DealLinkOrdersPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const dealLinkId = String(params?.id ?? '');
  const { link } = useSellerDealLink(dealLinkId);

  // Order history is append-only, so total only grows: paging forward is gated
  // by canNext (disabled once the last row is shown), which keeps the offset in
  // range without any clamp/effect.
  const [page, setPage] = useState(0);
  const offset = page * PAGE_SIZE;

  const {
    orders,
    total: fetchedTotal,
    loading,
    error,
  } = useSellerDealLinkOrders(dealLinkId, {
    limit: PAGE_SIZE,
    offset,
  });

  const from = fetchedTotal === 0 ? 0 : offset + 1;
  const to = offset + orders.length;
  const canPrev = page > 0 && !loading;
  const canNext = to < fetchedTotal && !loading;

  return (
    <div className="space-y-6" data-testid="admin-deal-links-orders-page">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          onClick={() => router.push('/admin/deal-links')}
          aria-label={t('admin.dealLinks.backToDealLinks')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t('admin.dealLinks.ordersTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {link?.title ?? t('admin.dealLinks.ordersSubtitle')}
          </p>
        </div>
      </div>

      <Card aria-busy={loading}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t('admin.dealLinks.ordersTitle')}</CardTitle>
          {!loading && !error && fetchedTotal > 0 ? (
            <span className="text-xs text-muted-foreground" data-testid="deal-link-orders-range">
              {t('admin.dealLinks.ordersRangeLabel', { from, to, total: fetchedTotal })}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
            {t('admin.dealLinks.ordersStatusNote')}
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive" role="alert">
              {t('admin.dealLinks.ordersLoadFailed')}
            </p>
          ) : !orders.length ? (
            <EmptyState
              icon={ShoppingBag}
              title={t('admin.dealLinks.ordersEmpty')}
              description={t('admin.dealLinks.ordersSubtitle')}
            />
          ) : (
            <>
              {orders.map(order => (
                <OrderRow key={order.orderID} order={order} />
              ))}
              {fetchedTotal > PAGE_SIZE ? (
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={!canPrev}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    data-testid="deal-link-orders-prev"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('admin.dealLinks.ordersPrevPage')}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t('admin.dealLinks.ordersRangeLabel', { from, to, total: fetchedTotal })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={!canNext}
                    onClick={() => setPage(p => p + 1)}
                    data-testid="deal-link-orders-next"
                  >
                    {t('admin.dealLinks.ordersNextPage')}
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDealLinkOrdersPage() {
  return <DealLinkOrdersPageContent />;
}
