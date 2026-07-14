'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, ShoppingBag } from 'lucide-react';
import {
  truncateAddress,
  useI18n,
  useSellerDealLink,
  useSellerDealLinkOrders,
  type SellerDealLinkOrder,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

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
              STATUS_CLASS[order.status] ?? 'bg-muted text-muted-foreground'
            }`}
            data-status={order.status}
          >
            {t(STATUS_KEY[order.status] ?? 'admin.dealLinks.statusUnknown')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('admin.dealLinks.orderBuyerLabel')}: {truncateAddress(order.buyerPeerID)}
          {' · '}
          {formatDate(order.createdAt)}
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
  const { orders, total, loading, error } = useSellerDealLinkOrders(dealLinkId);

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
          {!loading && !error && total > 0 ? (
            <span className="text-xs text-muted-foreground">
              {t('admin.dealLinks.ordersCountLabel', { count: total })}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
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
            orders.map(order => <OrderRow key={order.orderID} order={order} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDealLinkOrdersPage() {
  return <DealLinkOrdersPageContent />;
}
