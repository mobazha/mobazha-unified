'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useI18n,
  useSales,
  useChatStore,
  ordersApi,
  useOrderAction,
  batchGetProfileDisplayInfo,
} from '@mobazha/core';
import type { ProfileDisplayInfo } from '@mobazha/core';
import {
  ShoppingCart,
  Search,
  Download,
  CheckSquare,
  X,
  FileText,
  FileJson,
  ChevronDown,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderTable, OrderListCompact } from '@/components/Order';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useToast } from '@/components/ui/use-toast';
import {
  transformOrderListItem,
  ordersToExportRows,
  exportToCSV,
  exportToJSON,
  STATUS_FILTER_TO_STATES,
} from '@/components/admin/orders/utils';
import type { StatusFilter } from '@/components/admin/orders/utils';

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

export default function AdminOrdersPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const openChatDrawer = useChatStore(state => state.openDrawer);
  const isDesktop = useIsDesktop();

  const { orders, isLoading, isLoadingMore, error, hasMore, loadMore, refetch } = useAdminOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
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

  const pendingCount = useMemo(
    () => orders.filter(o => o.rawState === 'PENDING' || o.rawState === 'AWAITING_PAYMENT').length,
    [orders]
  );

  const statusTabs: { value: StatusFilter; label: string; count?: number }[] = useMemo(
    () => [
      { value: 'all', label: t('admin.orders.filterAll'), count: orders.length },
      { value: 'pending', label: t('admin.orders.filterPending'), count: pendingCount },
      { value: 'processing', label: t('admin.orders.filterProcessing') },
      { value: 'shipped', label: t('admin.orders.filterShipped') },
      { value: 'completed', label: t('admin.orders.filterCompleted') },
      { value: 'disputed', label: t('admin.orders.filterDisputed') },
      { value: 'cancelled', label: t('admin.orders.filterCancelled') },
    ],
    [t, orders.length, pendingCount]
  );

  // Selection
  const isAllSelected = filteredOrders.length > 0 && selectedIds.size === filteredOrders.length;
  const isSomeSelected = selectedIds.size > 0;

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
      .map(o => ({ id: o.id, paymentCoin: o.paymentCoin }));

    if (pendingIds.length === 0) {
      toast({ title: t('admin.orders.noPendingSelected'), variant: 'default' });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    for (const { id, paymentCoin } of pendingIds) {
      try {
        await executeOrderAction({
          paymentCoin,
          getInstructions: initiatorAddress =>
            ordersApi.getConfirmInstructions({ orderID: id, decline: false, initiatorAddress }),
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
      const dataToExport = isSomeSelected
        ? filteredOrders.filter(o => selectedIds.has(o.id))
        : filteredOrders;
      const rows = ordersToExportRows(dataToExport);
      const timestamp = new Date().toISOString().slice(0, 10);
      if (format === 'csv') exportToCSV(rows, `orders-${timestamp}.csv`);
      else exportToJSON(rows, `orders-${timestamp}.json`);
      setShowExportMenu(false);
    },
    [isSomeSelected, filteredOrders, selectedIds]
  );

  // Order actions
  const handleAccept = useCallback(
    async (orderId: string, paymentCoin?: string) => {
      if (isProcessing || isOrderActionLoading) return;
      setIsProcessing(true);
      try {
        await executeOrderAction({
          paymentCoin,
          getInstructions: addr =>
            ordersApi.getConfirmInstructions({
              orderID: orderId,
              decline: false,
              initiatorAddress: addr,
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
    async (orderId: string, paymentCoin?: string) => {
      if (isProcessing || isOrderActionLoading) return;
      setIsProcessing(true);
      try {
        await executeOrderAction({
          paymentCoin,
          getInstructions: addr =>
            ordersApi.getConfirmInstructions({
              orderID: orderId,
              decline: true,
              initiatorAddress: addr,
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
      router.push(`/orders/${orderId}?type=sale`);
    },
    [router]
  );

  const handleContact = useCallback(
    (_peerId: string) => {
      openChatDrawer();
    },
    [openChatDrawer]
  );

  const hasActiveFilters = statusFilter !== 'all' || searchTerm.trim() || dateFrom || dateTo;

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  }, []);

  return (
    <div data-testid="admin-orders">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('admin.orders.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.orders.subtitle')}</p>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowExportMenu(!showExportMenu)}
            aria-haspopup="menu"
            aria-expanded={showExportMenu}
            aria-controls="admin-orders-export-menu"
          >
            <Download className="w-4 h-4" />
            {t('admin.orders.export')}
            {isSomeSelected && <span className="text-xs opacity-70">({selectedIds.size})</span>}
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div
                id="admin-orders-export-menu"
                role="menu"
                className="absolute right-0 top-full mt-1 z-20 w-44 bg-popover border border-border rounded-lg shadow-lg py-1"
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
      </div>

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
          <Button size="sm" variant="outline" onClick={handleBatchConfirm} disabled={isProcessing}>
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

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.orders.searchPlaceholder')}
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-11 sm:h-9 pl-8 pr-2 text-sm rounded-md border border-input bg-background text-foreground"
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
                className="h-11 sm:h-9 pl-8 pr-2 text-sm rounded-md border border-input bg-background text-foreground"
                aria-label={t('admin.orders.dateTo')}
              />
            </div>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] sm:min-h-0 snap-start ${
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
              className="px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0 snap-start"
            >
              {t('admin.orders.clearFilters')}
            </button>
          )}
        </div>
      </div>

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
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
            <ShoppingCart className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {hasActiveFilters ? t('admin.orders.noMatchTitle') : t('admin.orders.emptyTitle')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
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
            <OrderTable
              orders={filteredOrders}
              type="sale"
              onViewDetails={handleViewDetails}
              onContact={handleContact}
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
    </div>
  );
}
