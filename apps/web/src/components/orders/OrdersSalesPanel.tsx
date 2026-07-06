'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useI18n,
  useSales,
  ordersApi,
  useOrderAction,
  batchGetProfileDisplayInfo,
  orderUsesCancelableBackendSettlement,
  useCurrency,
  getOrderListShippedLabelKey,
  inferGuestOrderKindFromItems,
} from '@mobazha/core';
import type { ProfileDisplayInfo } from '@mobazha/core';
import type { TranslateFunction } from '@mobazha/core/i18n/types';
import {
  ShoppingCart,
  Package,
  Search,
  Download,
  CheckSquare,
  X,
  FileText,
  FileJson,
  ChevronDown,
  AlertCircle,
  Calendar,
  Copy,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderListCompact } from '@/components/Order';
import { OrderSettlementBadge } from '@/components/Order/OrderSettlementBadge';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { usePlatform } from '@mobazha/ui/hooks';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductImageNative } from '@/components/ui/product-image';
import {
  transformOrderListItem,
  ordersToExportRows,
  guestOrderToExportRow,
  formatGuestPaymentAmount,
  exportToCSV,
  exportToJSON,
  STATUS_FILTER_TO_STATES,
} from '@/components/admin/orders/utils';
import type { StatusFilter } from '@/components/admin/orders/utils';
import {
  listGuestOrders,
  getAdminGuestOrderDetail,
  shipGuestOrder,
  completeGuestOrder,
  guestOrderListThumbnailUrl,
  type GuestOrderSummary,
  type GuestOrderAdminDetail,
} from '@mobazha/core/services/api/guestCheckout';
import { useFeature } from '@mobazha/core/hooks/useFeature';
import { GuestOrderDetailDrawer } from '@/components/orders/GuestOrderDetailDrawer';
import {
  formatGuestOrderStateLabel,
  guestStateBadgeClass,
  isActiveGuestDetailRequest,
  truncateOrderToken,
} from '@/components/orders/guestOrderDisplay';
import {
  orderDetailPath,
  orderListSearchPath,
  patchOrderListSearchParams,
  parseGuestOrderToken,
  parseOrderListStatusFilter,
  resolveOrderSourceFilter,
  type OrderSourceFilter,
  type OrdersShell,
} from '@/lib/ordersNavigation';

function useAdminOrders() {
  const { t } = useI18n();
  const {
    orders: salesOrders,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useSales();

  const [profileMap, setProfileMap] = useState<Map<string, ProfileDisplayInfo>>(new Map());
  const fetchedPeerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const ordersArray = Array.isArray(salesOrders) ? salesOrders : [];
    if (ordersArray.length === 0) return;

    const peerIdsToFetch: string[] = [];
    for (const item of ordersArray) {
      const itemAny = item as unknown as Record<string, unknown>;
      const buyerId = item.buyerID || (itemAny.buyerId as string) || '';
      if (buyerId && !fetchedPeerIdsRef.current.has(buyerId)) {
        peerIdsToFetch.push(buyerId);
        fetchedPeerIdsRef.current.add(buyerId);
      }
    }

    if (peerIdsToFetch.length === 0) return;
    let cancelled = false;

    (async () => {
      const newEntries = await batchGetProfileDisplayInfo(peerIdsToFetch);
      if (cancelled) return;
      if (newEntries.size > 0) {
        setProfileMap(prev => {
          const merged = new Map(prev);
          newEntries.forEach((value, key) => merged.set(key, value));
          return merged;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [salesOrders]);

  const roleLabels = useMemo(() => ({ seller: t('order.seller'), buyer: t('order.buyer') }), [t]);

  const orders = useMemo(() => {
    const ordersArray = Array.isArray(salesOrders) ? salesOrders : [];
    return ordersArray.map(item => transformOrderListItem(item, 'sales', profileMap, roleLabels));
  }, [salesOrders, profileMap, roleLabels]);

  return { orders, salesOrders, isLoading, isLoadingMore, error, hasMore, loadMore, refetch };
}

type UnifiedAdminOrder =
  | {
      id: string;
      source: 'standard';
      rawState: string;
      createdAt: string;
      searchText: string;
      standardOrder: ReturnType<typeof transformOrderListItem>;
    }
  | {
      id: string;
      source: 'guest';
      rawState: string;
      createdAt: string;
      searchText: string;
      guestOrder: GuestOrderSummary;
    };

const GUEST_STATUS_FILTER_TO_STATES: Partial<Record<StatusFilter, string[]>> = {
  pending: ['AWAITING_PAYMENT', 'PAYMENT_DETECTED'],
  processing: ['FUNDED'],
  shipped: ['SHIPPED'],
  completed: ['COMPLETED'],
  cancelled: ['EXPIRED'],
};

function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function formatOrderDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatGuestContact(order: GuestOrderSummary, t: TranslateFunction): string {
  return order.contactEmail?.trim() || t('common.none');
}

function formatOrderItemCount(count: number | undefined, t: TranslateFunction): string | null {
  if (!count || count <= 1) return null;
  return t('admin.orders.orderItemCount', { count });
}

function copyToClipboard(text: string): void {
  void navigator.clipboard.writeText(text);
}

function standardStateLabelKey(rawState: string, status: string, contractType?: string): string {
  switch (rawState) {
    case 'AWAITING_PAYMENT':
      return 'order.statusLabels.awaitingPayment';
    case 'AWAITING_PAYMENT_VERIFICATION':
    case 'PENDING':
      return 'order.pending';
    case 'AWAITING_PICKUP':
    case 'AWAITING_SHIPMENT':
    case 'PARTIALLY_SHIPPED':
    case 'PROCESSING_ERROR':
      return 'order.processing';
    case 'SHIPPED':
      return getOrderListShippedLabelKey(contractType);
    case 'COMPLETED':
    case 'PAYMENT_FINALIZED':
    case 'RESOLVED':
      return 'order.completed';
    case 'CANCELED':
    case 'DECLINED':
    case 'REFUNDED':
      return 'order.cancelled';
    case 'DISPUTED':
    case 'DECIDED':
    case 'DISPUTE_EXPIRED':
      return 'order.disputed';
    default:
      return `order.${status}`;
  }
}

function statusBadgeClass(kind: string): string {
  switch (kind) {
    case 'pending':
    case 'awaiting_payment':
      return 'bg-warning/15 text-warning border-warning/30';
    case 'processing':
      return 'bg-info/15 text-info border-info/30';
    case 'shipped':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'completed':
      return 'bg-success/15 text-success border-success/30';
    case 'disputed':
      return 'bg-error/15 text-error border-error/30';
    case 'cancelled':
    case 'EXPIRED':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-transparent';
  }
}

function GuestOrderRow({ order, onClick }: { order: GuestOrderSummary; onClick: () => void }) {
  const { t } = useI18n();
  const thumbUrl = guestOrderListThumbnailUrl(order);
  const title = order.items[0]?.listingTitle || t('admin.orders.guestOrderTitle');
  const qty = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const itemLabel = formatOrderItemCount(qty, t);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-amber-500/10 text-amber-600">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {itemLabel ? (
            <>
              <span>{itemLabel}</span>
              <span>·</span>
            </>
          ) : null}
          <span>{formatGuestPaymentAmount(order)}</span>
          <span>·</span>
          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          order.state === 'FUNDED' || order.state === 'COMPLETED'
            ? 'bg-success/15 text-success'
            : order.state === 'EXPIRED' || order.state === 'CANCELLED'
              ? 'bg-destructive/15 text-destructive'
              : 'bg-info/15 text-info'
        }`}
      >
        {formatGuestOrderStateLabel(
          order.state,
          inferGuestOrderKindFromItems(order.items) ?? 'unknown',
          t
        )}
      </span>
    </button>
  );
}

function UnifiedOrderRow({
  entry,
  onStandardOrderClick,
  onGuestOrderClick,
}: {
  entry: UnifiedAdminOrder;
  onStandardOrderClick: (orderId: string) => void;
  onGuestOrderClick: (token: string) => void;
}) {
  const { t } = useI18n();

  if (entry.source === 'guest') {
    const order = entry.guestOrder;
    const thumbUrl = guestOrderListThumbnailUrl(order);
    const title = order.items[0]?.listingTitle || t('admin.orders.guestOrderTitle');
    const qty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const itemLabel = formatOrderItemCount(qty, t);

    return (
      <button
        type="button"
        onClick={() => onGuestOrderClick(order.orderToken)}
        className="w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 mt-0.5 flex items-center justify-center bg-amber-500/10 text-amber-600">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{title}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {itemLabel ? (
              <>
                <span>{itemLabel}</span>
                <span>·</span>
              </>
            ) : null}
            <span>{formatGuestPaymentAmount(order)}</span>
            <span>·</span>
            <span>{formatOrderDate(order.createdAt)}</span>
            {order.contactEmail && (
              <>
                <span>·</span>
                <span className="truncate">{order.contactEmail}</span>
              </>
            )}
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
            order.state === 'FUNDED' || order.state === 'COMPLETED'
              ? 'bg-success/15 text-success'
              : order.state === 'EXPIRED'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-info/15 text-info'
          }`}
        >
          {formatGuestOrderStateLabel(
            order.state,
            inferGuestOrderKindFromItems(order.items) ?? 'unknown',
            t
          )}
        </span>
      </button>
    );
  }

  const order = entry.standardOrder;
  const lineImage = order.items[0]?.image?.trim() || '';
  const title = order.items[0]?.title || t('order.unknownItem');
  const buyer = order.vendor.name || t('admin.orders.sourceStandard');

  return (
    <button
      type="button"
      onClick={() => onStandardOrderClick(order.orderId)}
      className="w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 mt-0.5 flex items-center justify-center bg-muted">
        {lineImage ? (
          <img src={lineImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {t('admin.orders.sourceStandard')}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{buyer}</span>
          <span>·</span>
          <span>
            {order.total} {order.currency}
          </span>
          <span>·</span>
          <span>{formatOrderDate(order.createdAt)}</span>
        </div>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-muted text-muted-foreground">
        {order.rawState}
      </span>
    </button>
  );
}

function AdminOrdersTable({
  entries,
  onStandardOrderClick,
  onGuestOrderClick,
  onAccept,
  onReject,
}: {
  entries: UnifiedAdminOrder[];
  onStandardOrderClick: (orderId: string) => void;
  onGuestOrderClick: (token: string) => void;
  onAccept?: (orderId: string, paymentCoin?: string, paymentEscrowType?: string) => void;
  onReject?: (orderId: string, paymentCoin?: string, paymentEscrowType?: string) => void;
}) {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const isGuestOnly = entries.length > 0 && entries.every(entry => entry.source === 'guest');

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table className="table-fixed">
        {isGuestOnly ? (
          <colgroup>
            <col className="w-[160px]" />
            <col className="w-[180px]" />
            <col />
            <col className="w-[220px]" />
            <col className="w-[150px]" />
            <col className="w-[150px]" />
          </colgroup>
        ) : (
          <colgroup>
            <col className="w-[160px]" />
            <col className="w-[180px]" />
            <col />
            <col className="w-[190px]" />
            <col className="w-[120px]" />
            <col className="w-[240px]" />
          </colgroup>
        )}
        <TableHeader>
          <TableRow className="border-border/70 bg-muted/30 hover:bg-muted/30">
            <TableHead>{t('order.table.orderId')}</TableHead>
            <TableHead>{t('order.table.date')}</TableHead>
            <TableHead>{t('order.table.listing')}</TableHead>
            <TableHead>{isGuestOnly ? t('admin.orders.contactLabel') : t('order.buyer')}</TableHead>
            <TableHead className="text-right">{t('order.table.total')}</TableHead>
            <TableHead>{t('order.table.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-border/70">
          {entries.map(entry => {
            const isGuest = entry.source === 'guest';
            const standardOrder = entry.source === 'standard' ? entry.standardOrder : null;
            const guestOrder = entry.source === 'guest' ? entry.guestOrder : null;
            const orderId = standardOrder?.orderId || guestOrder?.orderToken || '';
            const title =
              standardOrder?.items[0]?.title ||
              guestOrder?.items[0]?.listingTitle ||
              t('admin.orders.guestOrderTitle');
            const image =
              standardOrder?.items[0]?.image ||
              (guestOrder ? guestOrderListThumbnailUrl(guestOrder) : '');
            const buyerName = isGuest
              ? guestOrder?.contactEmail || t('admin.orders.sourceGuest')
              : standardOrder?.vendor.name || t('order.buyer');
            const guestContact = guestOrder ? formatGuestContact(guestOrder, t) : '';
            const itemCount = isGuest
              ? guestOrder?.items.reduce((sum, item) => sum + item.quantity, 0)
              : standardOrder?.items.reduce((sum, item) => sum + item.quantity, 0);
            const itemCountLabel = formatOrderItemCount(itemCount, t);
            const total = guestOrder
              ? formatGuestPaymentAmount(guestOrder)
              : standardOrder
                ? formatCurrencyPrice(standardOrder.total, standardOrder.currency || 'USD')
                : '';
            const statusLabel = guestOrder
              ? formatGuestOrderStateLabel(
                  guestOrder.state,
                  inferGuestOrderKindFromItems(guestOrder.items) ?? 'unknown',
                  t
                )
              : standardOrder
                ? t(
                    standardStateLabelKey(
                      standardOrder.rawState || '',
                      standardOrder.status,
                      standardOrder.contractType
                    )
                  )
                : '';
            const statusClass = guestOrder
              ? guestStateBadgeClass(guestOrder.state, t)
              : standardOrder
                ? statusBadgeClass(standardOrder.status)
                : statusBadgeClass('');
            const showStandardActions = standardOrder?.rawState === 'PENDING';

            return (
              <TableRow
                key={entry.id}
                tabIndex={0}
                role="link"
                className="cursor-pointer hover:bg-muted/40"
                aria-label={`${t('order.table.orderId')} ${truncateOrderToken(orderId, 8, 6)}`}
                onClick={() =>
                  isGuest ? onGuestOrderClick(orderId) : onStandardOrderClick(orderId)
                }
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (isGuest) {
                      onGuestOrderClick(orderId);
                    } else {
                      onStandardOrderClick(orderId);
                    }
                  }
                }}
              >
                <TableCell className="font-mono text-sm">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate whitespace-nowrap text-foreground">
                      {truncateOrderToken(orderId, 10, 4)}
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={event => {
                        event.stopPropagation();
                        copyToClipboard(orderId);
                      }}
                      aria-label={t('order.actions.copyOrderId')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatOrderDateTime(entry.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {image ? (
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ProductImageNative src={undefined} alt="" iconSize="sm" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {title || t('order.unknownItem')}
                        </span>
                        {isGuest && !isGuestOnly ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
                          >
                            {t('admin.orders.sourceGuest')}
                          </Badge>
                        ) : null}
                      </div>
                      {itemCountLabel ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">{itemCountLabel}</div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {isGuestOnly ? (
                    <span className="block truncate text-sm text-foreground">{guestContact}</span>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      {!isGuest && standardOrder?.vendor.avatar ? (
                        <img
                          src={standardOrder.vendor.avatar}
                          alt={buyerName}
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            isGuest
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {isGuest
                            ? t('admin.orders.sourceGuest').charAt(0)
                            : buyerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate text-sm text-foreground">{buyerName}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm font-semibold text-foreground">
                  {total}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {showStandardActions && standardOrder ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={event => {
                            event.stopPropagation();
                            onReject?.(
                              standardOrder.id,
                              standardOrder.paymentCoin,
                              standardOrder.paymentEscrowType
                            );
                          }}
                        >
                          {t('order.actions.decline')}
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={event => {
                            event.stopPropagation();
                            onAccept?.(
                              standardOrder.id,
                              standardOrder.paymentCoin,
                              standardOrder.paymentEscrowType
                            );
                          }}
                        >
                          {t('order.actions.accept')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className={`text-xs ${statusClass}`}>
                          {statusLabel}
                        </Badge>
                        {standardOrder ? (
                          <OrderSettlementBadge
                            settlementState={standardOrder.settlementState}
                            settlementAction={standardOrder.settlementAction}
                            settlementActionId={standardOrder.settlementActionId}
                            settlementTxHash={standardOrder.settlementTxHash}
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export interface OrdersSalesPanelProps {
  shell?: OrdersShell;
  defaultSource?: OrderSourceFilter;
  sovereignSellerOnly?: boolean;
}

export function OrdersSalesPanel({
  shell = 'admin',
  defaultSource = 'all',
  sovereignSellerOnly = false,
}: OrdersSalesPanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const { isEmbeddedApp } = usePlatform();

  const { orders, isLoading, isLoadingMore, error, hasMore, loadMore, refetch } = useAdminOrders();

  const [orderView, setOrderView] = useState<OrderSourceFilter>(() => {
    return resolveOrderSourceFilter(searchParams, defaultSource, sovereignSellerOnly);
  });
  const [guestOrders, setGuestOrders] = useState<GuestOrderSummary[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const guestEnabled = useFeature('guestCheckout');

  // PM-3a: Admin guest order detail drawer state.
  const [selectedGuestToken, setSelectedGuestToken] = useState<string | null>(null);
  const [guestDetail, setGuestDetail] = useState<GuestOrderAdminDetail | null>(null);
  const [guestDetailLoading, setGuestDetailLoading] = useState(false);
  const [guestDetailError, setGuestDetailError] = useState(false);
  const [guestActionLoading, setGuestActionLoading] = useState<'ship' | 'complete' | null>(null);
  const [guestShipCarrier, setGuestShipCarrier] = useState('');
  const [guestShipTracking, setGuestShipTracking] = useState('');
  const suppressedGuestTokenRef = useRef<string | null>(null);
  const guestDetailRequestTokenRef = useRef<string | null>(null);

  const refreshGuestOrders = useCallback(async () => {
    if (!guestEnabled) return;
    setGuestLoading(true);
    try {
      const res = await listGuestOrders({ page: 0, pageSize: 50 });
      setGuestOrders(res);
    } catch {
      // Keep standard order management usable if guest order loading fails.
    } finally {
      setGuestLoading(false);
    }
  }, [guestEnabled]);

  useEffect(() => {
    void refreshGuestOrders();
  }, [refreshGuestOrders]);

  const refreshGuestOrderDetail = useCallback(
    async (token: string) => {
      guestDetailRequestTokenRef.current = token;
      setGuestDetailLoading(true);
      setGuestDetailError(false);
      try {
        const detail = await getAdminGuestOrderDetail(token);
        if (!isActiveGuestDetailRequest(token, guestDetailRequestTokenRef.current)) {
          return;
        }
        setGuestDetail(detail);
      } catch {
        if (!isActiveGuestDetailRequest(token, guestDetailRequestTokenRef.current)) {
          return;
        }
        setGuestDetail(null);
        setGuestDetailError(true);
        toast({
          title: t('common.loadFailed'),
          description: t('admin.orders.guestDetailLoadFailed'),
          variant: 'destructive',
        });
      } finally {
        if (isActiveGuestDetailRequest(token, guestDetailRequestTokenRef.current)) {
          setGuestDetailLoading(false);
        }
      }
    },
    [t, toast]
  );

  const openGuestOrderDetail = useCallback(
    (token: string) => {
      setSelectedGuestToken(token);
      setGuestDetail(null);
      setGuestDetailError(false);
      setGuestShipCarrier('');
      setGuestShipTracking('');
      void refreshGuestOrderDetail(token);
    },
    [refreshGuestOrderDetail]
  );

  const handleGuestOrderClick = useCallback(
    (token: string) => {
      openGuestOrderDetail(token);
    },
    [openGuestOrderDetail]
  );

  useEffect(() => {
    if (!guestDetail) return;
    setGuestShipCarrier(guestDetail.shippingCarrier ?? '');
    setGuestShipTracking(guestDetail.trackingNumber ?? '');
  }, [guestDetail]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    return parseOrderListStatusFilter(searchParams) ?? 'all';
  });

  useEffect(() => {
    setStatusFilter(parseOrderListStatusFilter(searchParams) ?? 'all');
  }, [searchParams]);

  useEffect(() => {
    setOrderView(resolveOrderSourceFilter(searchParams, defaultSource, sovereignSellerOnly));
  }, [defaultSource, searchParams, sovereignSellerOnly]);

  useEffect(() => {
    const tokenFromUrl = parseGuestOrderToken(searchParams);
    if (!tokenFromUrl) {
      suppressedGuestTokenRef.current = null;
      return;
    }
    if (tokenFromUrl === selectedGuestToken || tokenFromUrl === suppressedGuestTokenRef.current) {
      return;
    }
    setOrderView('guest');
    openGuestOrderDetail(tokenFromUrl);
  }, [openGuestOrderDetail, searchParams, selectedGuestToken]);

  const handleGuestShip = useCallback(async () => {
    if (!selectedGuestToken || guestActionLoading) return;
    if (guestDetail && guestDetail.orderToken !== selectedGuestToken) return;

    setGuestActionLoading('ship');
    try {
      await shipGuestOrder(selectedGuestToken, {
        carrier: guestShipCarrier.trim() || undefined,
        trackingNumber: guestShipTracking.trim() || undefined,
      });
      const kind = guestDetail ? inferGuestOrderKindFromItems(guestDetail.items) : 'unknown';
      const successKey =
        kind === 'physical'
          ? 'admin.orders.guestPhysicalShipSuccess'
          : kind === 'service'
            ? 'admin.orders.guestServiceDeliverSuccess'
            : kind === 'digital'
              ? 'admin.orders.guestDigitalDeliverSuccess'
              : 'admin.orders.guestShipSuccess';
      toast({ title: t(successKey), variant: 'success' });
      await Promise.all([refreshGuestOrderDetail(selectedGuestToken), refreshGuestOrders()]);
    } catch (err) {
      toast({
        title: t('admin.orders.guestActionFailed'),
        description: err instanceof Error ? err.message : t('common.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setGuestActionLoading(null);
    }
  }, [
    guestActionLoading,
    guestShipCarrier,
    guestShipTracking,
    guestDetail,
    refreshGuestOrderDetail,
    refreshGuestOrders,
    selectedGuestToken,
    t,
    toast,
  ]);

  const handleGuestComplete = useCallback(async () => {
    if (!selectedGuestToken || guestActionLoading) return;
    if (guestDetail && guestDetail.orderToken !== selectedGuestToken) return;

    setGuestActionLoading('complete');
    try {
      await completeGuestOrder(selectedGuestToken);
      toast({ title: t('admin.orders.guestCompleteSuccess'), variant: 'success' });
      await Promise.all([refreshGuestOrderDetail(selectedGuestToken), refreshGuestOrders()]);
    } catch (err) {
      toast({
        title: t('admin.orders.guestActionFailed'),
        description: err instanceof Error ? err.message : t('common.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setGuestActionLoading(null);
    }
  }, [
    guestActionLoading,
    guestDetail,
    refreshGuestOrderDetail,
    refreshGuestOrders,
    selectedGuestToken,
    t,
    toast,
  ]);

  const replaceListSearchParams = useCallback(
    (patch: Parameters<typeof patchOrderListSearchParams>[1]) => {
      const next = patchOrderListSearchParams(searchParams, patch);
      router.replace(orderListSearchPath(shell, next), { scroll: false });
    },
    [router, searchParams, shell]
  );

  const dismissGuestOrderDetail = useCallback(() => {
    guestDetailRequestTokenRef.current = null;
    setSelectedGuestToken(null);
    setGuestDetail(null);
    setGuestDetailLoading(false);
    setGuestDetailError(false);
    setGuestActionLoading(null);
    setGuestShipCarrier('');
    setGuestShipTracking('');
  }, []);

  const closeGuestOrderDetail = useCallback(() => {
    const tokenFromUrl = parseGuestOrderToken(searchParams);
    if (tokenFromUrl) {
      suppressedGuestTokenRef.current = tokenFromUrl;
    }
    dismissGuestOrderDetail();
    if (!tokenFromUrl) return;
    replaceListSearchParams({ guestOrder: null });
  }, [dismissGuestOrderDetail, replaceListSearchParams, searchParams]);

  const handleOrderViewChange = useCallback(
    (view: OrderSourceFilter) => {
      if (view !== 'guest') {
        dismissGuestOrderDetail();
      }
      replaceListSearchParams({
        source: view,
        ...(view !== 'guest' ? { guestOrder: null } : {}),
      });
    },
    [dismissGuestOrderDetail, replaceListSearchParams]
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const { execute: executeOrderAction, isLoading: isOrderActionLoading } = useOrderAction();

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== 'all') {
      const allowedStates = STATUS_FILTER_TO_STATES[statusFilter];
      if (allowedStates) {
        result = result.filter(o => o.rawState && allowedStates.includes(o.rawState));
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        o =>
          o.orderId.toLowerCase().includes(term) ||
          o.items[0]?.title?.toLowerCase().includes(term) ||
          o.vendor.name?.toLowerCase().includes(term)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(o => new Date(o.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(o => new Date(o.createdAt) <= to);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, statusFilter, searchTerm, dateFrom, dateTo]);

  const unifiedOrders = useMemo<UnifiedAdminOrder[]>(() => {
    const standardEntries: UnifiedAdminOrder[] = filteredOrders.map(order => ({
      id: `std:${order.orderId}`,
      source: 'standard',
      rawState: order.rawState || '',
      createdAt: order.createdAt,
      searchText:
        `${order.orderId} ${order.items[0]?.title || ''} ${order.vendor.name || ''}`.toLowerCase(),
      standardOrder: order,
    }));

    const guestEntries: UnifiedAdminOrder[] = guestOrders.map(order => ({
      id: `gst:${order.orderToken}`,
      source: 'guest',
      rawState: order.state,
      createdAt: order.createdAt,
      searchText:
        `${order.orderToken} ${order.items.map(item => item.listingTitle).join(' ')} ${order.contactEmail || ''}`.toLowerCase(),
      guestOrder: order,
    }));

    return [...standardEntries, ...guestEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredOrders, guestOrders]);

  const unifiedVisibleOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return unifiedOrders.filter(entry => {
      if (orderView !== 'all' && entry.source !== orderView) return false;

      if (statusFilter !== 'all') {
        if (entry.source === 'standard') {
          const allowedStandardStates = STATUS_FILTER_TO_STATES[statusFilter];
          if (allowedStandardStates && !allowedStandardStates.includes(entry.rawState))
            return false;
        } else {
          const allowedGuestStates = GUEST_STATUS_FILTER_TO_STATES[statusFilter];
          if (!allowedGuestStates || !allowedGuestStates.includes(entry.rawState)) return false;
        }
      }

      if (term && !entry.searchText.includes(term)) return false;

      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(entry.createdAt) < from) return false;
      }

      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(entry.createdAt) > to) return false;
      }

      return true;
    });
  }, [unifiedOrders, orderView, statusFilter, searchTerm, dateFrom, dateTo]);

  const visibleGuestOrders = useMemo(
    () =>
      unifiedVisibleOrders.flatMap(entry => (entry.source === 'guest' ? [entry.guestOrder] : [])),
    [unifiedVisibleOrders]
  );

  const standardOrderCount = orders.length;
  const guestOrderCount = guestOrders.length;

  const getStatusCount = useCallback(
    (filter: StatusFilter): number | undefined => {
      if (filter === 'all') {
        if (orderView === 'guest') return guestOrderCount;
        if (orderView === 'all') return standardOrderCount + guestOrderCount;
        return standardOrderCount;
      }

      const standardStates = STATUS_FILTER_TO_STATES[filter];
      const guestStates = GUEST_STATUS_FILTER_TO_STATES[filter];
      const standardCount = standardStates
        ? orders.filter(order => order.rawState && standardStates.includes(order.rawState)).length
        : 0;
      const guestCount = guestStates
        ? guestOrders.filter(order => guestStates.includes(order.state)).length
        : 0;

      if (orderView === 'guest') return guestCount;
      if (orderView === 'all') return standardCount + guestCount;
      return standardCount;
    },
    [guestOrderCount, guestOrders, orderView, orders, standardOrderCount]
  );

  const statusTabs: { value: StatusFilter; label: string; count?: number }[] = useMemo(
    () => [
      { value: 'all', label: t('admin.orders.filterAll'), count: getStatusCount('all') },
      {
        value: 'pending',
        label: t('admin.orders.filterPending'),
        count: getStatusCount('pending'),
      },
      {
        value: 'processing',
        label: t('admin.orders.filterProcessing'),
        count: getStatusCount('processing'),
      },
      {
        value: 'shipped',
        label: t('admin.orders.filterShipped'),
        count: getStatusCount('shipped'),
      },
      {
        value: 'completed',
        label: t('admin.orders.filterCompleted'),
        count: getStatusCount('completed'),
      },
      {
        value: 'disputed',
        label: t('admin.orders.filterDisputed'),
        count: getStatusCount('disputed'),
      },
      {
        value: 'cancelled',
        label: t('admin.orders.filterCancelled'),
        count: getStatusCount('cancelled'),
      },
    ],
    [getStatusCount, t]
  );

  // Selection
  const isAllSelected =
    orderView === 'standard' &&
    filteredOrders.length > 0 &&
    selectedIds.size === filteredOrders.length;
  const isSomeSelected = orderView === 'standard' && selectedIds.size > 0;

  useEffect(() => {
    if (orderView !== 'standard' && selectedIds.size > 0) {
      setSelectedIds(new Set());
    }
  }, [orderView, selectedIds.size]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  }, [isAllSelected, filteredOrders]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Batch confirm
  const handleBatchConfirm = useCallback(async () => {
    if (isProcessing || isOrderActionLoading) return;
    const pendingIds = filteredOrders
      .filter(o => selectedIds.has(o.id) && o.rawState === 'PENDING')
      .map(o => ({
        id: o.id,
        paymentCoin: o.paymentCoin,
        paymentEscrowType: o.paymentEscrowType,
      }));

    if (pendingIds.length === 0) {
      toast({ title: t('admin.orders.noPendingSelected'), variant: 'default' });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    for (const { id, paymentCoin, paymentEscrowType } of pendingIds) {
      try {
        await executeOrderAction({
          executeBackendSettlementAction: () =>
            ordersApi.executeSettlementAction({
              orderID: id,
              action: 'confirm',
            }),
          attemptBackendSettlementAction: orderUsesCancelableBackendSettlement({
            paymentProductMode: 'cancelable',
            escrowType: paymentEscrowType,
            paymentCoin,
          }),
          executeAction: txID =>
            ordersApi.confirmOrder({ orderID: id, decline: false, transactionID: txID }),
          onSuccess: () => {
            successCount++;
          },
          onError: () => {},
        });
      } catch {
        // continue with remaining orders
      }
    }
    setIsProcessing(false);
    clearSelection();
    if (successCount > 0) {
      toast({
        title: t('admin.orders.batchConfirmSuccess', { count: successCount }),
        variant: 'success',
      });
      await refetch();
    }
  }, [
    isProcessing,
    isOrderActionLoading,
    filteredOrders,
    selectedIds,
    executeOrderAction,
    toast,
    t,
    clearSelection,
    refetch,
  ]);

  // Export
  const handleExport = useCallback(
    (format: 'csv' | 'json') => {
      const rows =
        orderView === 'guest'
          ? visibleGuestOrders.map(guestOrderToExportRow)
          : orderView === 'all'
            ? unifiedVisibleOrders.map(entry =>
                entry.source === 'guest'
                  ? guestOrderToExportRow(entry.guestOrder)
                  : ordersToExportRows([entry.standardOrder])[0]
              )
            : ordersToExportRows(
                isSomeSelected ? filteredOrders.filter(o => selectedIds.has(o.id)) : filteredOrders
              );
      const timestamp = new Date().toISOString().slice(0, 10);
      if (format === 'csv') exportToCSV(rows, `orders-${timestamp}.csv`);
      else exportToJSON(rows, `orders-${timestamp}.json`);
      setShowExportMenu(false);
    },
    [
      filteredOrders,
      isSomeSelected,
      orderView,
      selectedIds,
      unifiedVisibleOrders,
      visibleGuestOrders,
    ]
  );

  // Order actions
  const handleAccept = useCallback(
    async (orderId: string, paymentCoin?: string, paymentEscrowType?: string) => {
      if (isProcessing || isOrderActionLoading) return;
      setIsProcessing(true);
      try {
        await executeOrderAction({
          executeBackendSettlementAction: () =>
            ordersApi.executeSettlementAction({
              orderID: orderId,
              action: 'confirm',
            }),
          attemptBackendSettlementAction: orderUsesCancelableBackendSettlement({
            paymentProductMode: 'cancelable',
            escrowType: paymentEscrowType,
            paymentCoin,
          }),
          executeAction: txID =>
            ordersApi.confirmOrder({ orderID: orderId, decline: false, transactionID: txID }),
          onSuccess: async () => {
            toast({
              title: t('order.dialogs.acceptOrder.title'),
              description: t('common.success'),
              variant: 'success',
            });
            await refetch();
          },
          onError: err => {
            toast({
              title: t('common.error'),
              description: err.message || t('common.unknownError'),
              variant: 'destructive',
            });
          },
        });
      } catch {
        /* handled by onError */
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, isOrderActionLoading, executeOrderAction, t, toast, refetch]
  );

  const handleReject = useCallback(
    async (orderId: string, paymentCoin?: string, paymentEscrowType?: string) => {
      if (isProcessing || isOrderActionLoading) return;
      setIsProcessing(true);
      try {
        await executeOrderAction({
          executeBackendSettlementAction: () =>
            ordersApi.executeSettlementAction({
              orderID: orderId,
              action: 'cancel',
            }),
          attemptBackendSettlementAction: orderUsesCancelableBackendSettlement({
            paymentProductMode: 'cancelable',
            escrowType: paymentEscrowType,
            paymentCoin,
          }),
          executeAction: txID =>
            ordersApi.confirmOrder({ orderID: orderId, decline: true, transactionID: txID }),
          onSuccess: async () => {
            toast({
              title: t('order.dialogs.declineOrder.title'),
              description: t('common.success'),
              variant: 'success',
            });
            await refetch();
          },
          onError: err => {
            toast({
              title: t('common.error'),
              description: err.message || t('common.unknownError'),
              variant: 'destructive',
            });
          },
        });
      } catch {
        /* handled by onError */
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, isOrderActionLoading, executeOrderAction, t, toast, refetch]
  );

  const handleViewDetails = useCallback(
    (orderId: string) => {
      router.push(orderDetailPath(orderId, 'sale'));
    },
    [router]
  );

  const hasActiveFilters = statusFilter !== 'all' || searchTerm.trim() || dateFrom || dateTo;

  const clearFilters = useCallback(() => {
    replaceListSearchParams({ status: 'all' });
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  }, [replaceListSearchParams]);

  const renderExportButton = () => (
    <div className="relative shrink-0">
      <Button
        variant="outline"
        size={isDesktop ? 'default' : 'icon'}
        className={isDesktop ? 'gap-2' : 'h-9 w-9'}
        onClick={() => setShowExportMenu(!showExportMenu)}
        aria-haspopup="menu"
        aria-expanded={showExportMenu}
        aria-controls="admin-orders-export-menu"
      >
        <Download className="w-4 h-4" />
        {isDesktop && (
          <>
            {t('admin.orders.export')}
            {isSomeSelected && <span className="text-xs opacity-70">({selectedIds.size})</span>}
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </Button>
      {showExportMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
          <div
            id="admin-orders-export-menu"
            role="menu"
            className="absolute right-0 top-full mt-1 z-50 w-44 bg-popover border border-border rounded-lg shadow-lg py-1"
          >
            <button
              role="menuitem"
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
              onClick={() => handleExport('csv')}
            >
              <FileText className="w-4 h-4" /> CSV
            </button>
            <button
              role="menuitem"
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
              onClick={() => handleExport('json')}
            >
              <FileJson className="w-4 h-4" /> JSON
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div data-testid="admin-orders">
      {/* Header — hidden in TMA; export button moves to search row */}
      {!isEmbeddedApp && (
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">
              {shell === 'consumer' ? t('order.mySales') : t('admin.orders.title')}
            </h1>
            <p className="hidden sm:block text-sm text-muted-foreground mt-1">
              {shell === 'consumer' ? t('order.manageOrders') : t('admin.orders.subtitle')}
            </p>
          </div>
          {renderExportButton()}
        </div>
      )}

      {/* Order type toggle */}
      {guestEnabled && (
        <div
          className={`flex gap-1 ${isEmbeddedApp ? 'mb-2' : 'mb-4'} p-1 bg-muted rounded-lg w-fit`}
        >
          <button
            type="button"
            onClick={() => handleOrderViewChange('guest')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              orderView === 'guest'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('admin.orders.guestOrders')}
          </button>
          {!sovereignSellerOnly || orders.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => handleOrderViewChange('standard')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  orderView === 'standard'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {sovereignSellerOnly
                  ? t('admin.orders.legacyOrders')
                  : t('admin.orders.standardOrders')}
              </button>
              <button
                type="button"
                onClick={() => handleOrderViewChange('all')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  orderView === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('admin.orders.allOrders')}
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Filters */}
      <div className={`flex flex-col gap-3 ${isEmbeddedApp ? 'mb-2' : 'mb-4 sm:mb-6'}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.orders.searchPlaceholder')}
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant={showDateFilter || dateFrom || dateTo ? 'default' : 'outline'}
              size="icon"
              className="sm:hidden h-9 w-9 shrink-0"
              onClick={() => setShowDateFilter(prev => !prev)}
              aria-label={t('admin.orders.dateFilter')}
            >
              <Calendar className="w-4 h-4" />
            </Button>
            {isEmbeddedApp && renderExportButton()}
          </div>
          <div className="hidden sm:flex gap-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-9 pl-8 pr-2 text-sm rounded-md border border-input bg-background text-foreground dark:[color-scheme:dark]"
                aria-label={t('admin.orders.dateFrom')}
              />
            </div>
            <span className="self-center text-muted-foreground text-sm">–</span>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-9 pl-8 pr-2 text-sm rounded-md border border-input bg-background text-foreground dark:[color-scheme:dark]"
                aria-label={t('admin.orders.dateTo')}
              />
            </div>
          </div>
        </div>

        {showDateFilter && (
          <div className="flex gap-2 sm:hidden">
            <div className="relative flex-1">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-11 w-full pl-8 pr-2 text-sm rounded-md border border-input bg-background text-foreground dark:[color-scheme:dark]"
                aria-label={t('admin.orders.dateFrom')}
              />
            </div>
            <span className="self-center text-muted-foreground text-sm">–</span>
            <div className="relative flex-1">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-11 w-full pl-8 pr-2 text-sm rounded-md border border-input bg-background text-foreground dark:[color-scheme:dark]"
                aria-label={t('admin.orders.dateTo')}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => replaceListSearchParams({ status: tab.value })}
              className={`${isEmbeddedApp ? 'px-3 py-1.5' : 'px-4 py-2 sm:px-3 sm:py-1.5'} rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isEmbeddedApp ? '' : 'min-h-[44px] sm:min-h-0'} snap-start ${
                statusFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
              }`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
              )}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={`${isEmbeddedApp ? 'px-3 py-1.5' : 'px-4 py-2 sm:px-3 sm:py-1.5'} rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors ${isEmbeddedApp ? '' : 'min-h-[44px] sm:min-h-0'} snap-start`}
            >
              {t('admin.orders.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {orderView === 'all' ? (
        isLoading || guestLoading ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : unifiedVisibleOrders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="text-center py-10">
              <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? t('admin.orders.noMatchDescription')
                  : t('admin.orders.emptyDescription')}
              </p>
            </div>
          </div>
        ) : isDesktop ? (
          <AdminOrdersTable
            entries={unifiedVisibleOrders}
            onStandardOrderClick={handleViewDetails}
            onGuestOrderClick={handleGuestOrderClick}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {unifiedVisibleOrders.map(entry => (
              <UnifiedOrderRow
                key={entry.id}
                entry={entry}
                onStandardOrderClick={handleViewDetails}
                onGuestOrderClick={handleGuestOrderClick}
              />
            ))}
          </div>
        )
      ) : orderView === 'guest' ? (
        guestLoading ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : visibleGuestOrders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="text-center py-10">
              <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? t('admin.orders.noMatchDescription')
                  : t('admin.orders.noGuestOrders')}
              </p>
            </div>
          </div>
        ) : isDesktop ? (
          <AdminOrdersTable
            entries={unifiedVisibleOrders}
            onStandardOrderClick={handleViewDetails}
            onGuestOrderClick={handleGuestOrderClick}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {visibleGuestOrders.map(go => (
              <GuestOrderRow
                key={go.orderToken}
                order={go}
                onClick={() => handleGuestOrderClick(go.orderToken)}
              />
            ))}
          </div>
        )
      ) : (
        <>
          {/* Batch action bar */}
          {isSomeSelected && (
            <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={toggleSelectAll}
                aria-label={t('admin.orders.selectAll')}
              />
              <span className="text-sm font-medium text-foreground">
                {t('admin.orders.selectedCount', { count: selectedIds.size })}
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleBatchConfirm}
                disabled={isProcessing}
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                {t('admin.orders.batchConfirm')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                aria-label={t('admin.orders.clearSelection')}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-10 sm:py-16 border border-dashed border-border rounded-xl">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted mb-3 sm:mb-4">
                <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                {hasActiveFilters ? t('admin.orders.noMatchTitle') : t('admin.orders.emptyTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                {hasActiveFilters
                  ? t('admin.orders.noMatchDescription')
                  : t('admin.orders.emptyDescription')}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                  {t('admin.orders.clearFilters')}
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Select all checkbox (above table) */}
              {isDesktop && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label={t('admin.orders.selectAll')}
                  />
                  <span className="text-xs text-muted-foreground">
                    {t('admin.orders.selectAll')} ({filteredOrders.length})
                  </span>
                </div>
              )}

              {isDesktop ? (
                <AdminOrdersTable
                  entries={unifiedVisibleOrders}
                  onStandardOrderClick={handleViewDetails}
                  onGuestOrderClick={handleGuestOrderClick}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <OrderListCompact
                    orders={filteredOrders}
                    type="sale"
                    onViewDetails={handleViewDetails}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                </div>
              )}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? t('common.loading') : t('common.loadMore')}
                  </Button>
                </div>
              )}

              {!hasMore && filteredOrders.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  {t('admin.orders.showingCount', { count: filteredOrders.length })}
                </p>
              )}
            </>
          )}
        </>
      )}

      <GuestOrderDetailDrawer
        open={Boolean(selectedGuestToken)}
        loading={guestDetailLoading}
        loadError={guestDetailError}
        detail={guestDetail}
        shipCarrier={guestShipCarrier}
        shipTracking={guestShipTracking}
        actionLoading={guestActionLoading}
        onClose={closeGuestOrderDetail}
        onRetry={() => {
          if (selectedGuestToken) {
            void refreshGuestOrderDetail(selectedGuestToken);
          }
        }}
        onShipCarrierChange={setGuestShipCarrier}
        onShipTrackingChange={setGuestShipTracking}
        onShip={handleGuestShip}
        onComplete={handleGuestComplete}
      />
    </div>
  );
}
