'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VStack, HStack } from '@/components/layouts';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { BottomSheet, BottomSheetItem } from '@/components/ui/bottom-sheet';
import { LoadError } from '@/components/ui/empty-state';
import { OrderTable, OrderListCompact } from '@/components/Order';
import { PullRefreshIndicator } from '@/components/ui/pull-refresh-indicator';
import { useI18n, usePurchases, useChatStore, batchGetProfileDisplayInfo } from '@mobazha/core';
import type { ProfileDisplayInfo } from '@mobazha/core';
import { useIsDesktop, useIsMobile } from '@/hooks/useMediaQuery';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { transformOrderListItem } from '@/components/admin/orders/utils';
import { orderDetailPath, type OrdersShell } from '@/lib/ordersNavigation';
import { usePlatform } from '@mobazha/ui/hooks';

type OrderStatus =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'disputed';

export interface OrdersPurchasesPanelProps {
  shell: OrdersShell;
}

export function OrdersPurchasesPanel({ shell }: OrdersPurchasesPanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const openChatDrawer = useChatStore(state => state.openDrawer);
  const isDesktop = useIsDesktop();
  const isMobile = useIsMobile();
  const { isEmbeddedApp } = usePlatform();

  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  const {
    orders: purchaseOrders,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = usePurchases();

  const rawOrders = purchaseOrders;

  // ============ Profile 异步获取（使用全局 profileCache） ============
  // 收集所有唯一的对方 peerID，异步获取 profile 数据以获取真实头像和名称
  const [profileMap, setProfileMap] = useState<Map<string, ProfileDisplayInfo>>(new Map());
  const fetchedPeerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const ordersArray = Array.isArray(rawOrders) ? rawOrders : [];
    if (ordersArray.length === 0) return;

    // 收集需要获取 profile 的唯一 peerID（排除已获取的）
    const peerIdsToFetch: string[] = [];
    for (const item of ordersArray) {
      const itemAny = item as unknown as Record<string, unknown>;
      const vendorId = item.vendorID || (itemAny.vendorId as string) || '';
      const counterpartyId = vendorId;
      if (counterpartyId && !fetchedPeerIdsRef.current.has(counterpartyId)) {
        peerIdsToFetch.push(counterpartyId);
        fetchedPeerIdsRef.current.add(counterpartyId);
      }
    }

    if (peerIdsToFetch.length === 0) return;

    let cancelled = false;

    async function fetchProfiles() {
      // 使用全局 profileCache 批量获取 profile 展示信息
      const newEntries = await batchGetProfileDisplayInfo(peerIdsToFetch);

      if (cancelled) return;

      if (newEntries.size > 0) {
        setProfileMap(prev => {
          const merged = new Map(prev);
          newEntries.forEach((value, key) => merged.set(key, value));
          return merged;
        });
      }
    }

    fetchProfiles();

    return () => {
      cancelled = true;
    };
  }, [rawOrders]);

  // 转换数据格式（确保 rawOrders 是数组），使用 profileMap 增强数据
  const roleLabels = useMemo(() => ({ seller: t('order.seller'), buyer: t('order.buyer') }), [t]);
  const orders = useMemo(() => {
    const ordersArray = Array.isArray(rawOrders) ? rawOrders : [];
    return ordersArray.map(item =>
      transformOrderListItem(item, 'purchases', profileMap, roleLabels)
    );
  }, [rawOrders, profileMap, roleLabels]);

  const statusTabs: { value: OrderStatus; label: string }[] = [
    { value: 'all', label: isMobile ? t('order.allPurchases') : t('order.allOrders') },
    { value: 'pending', label: t('order.pending') },
    { value: 'processing', label: t('order.processing') },
    { value: 'shipped', label: t('order.shipped') },
    { value: 'completed', label: t('order.completed') },
    { value: 'disputed', label: t('order.disputed') },
  ];

  // 根据状态过滤订单，并按时间降序排序（最新的在前面）
  const filteredOrders = orders
    .filter(order => statusFilter === 'all' || order.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleViewDetails = useCallback(
    (orderId: string) => {
      router.push(
        orderDetailPath(orderId, 'purchase', {
          fromShell: shell === 'admin' ? 'admin' : undefined,
        })
      );
    },
    [router, shell]
  );

  const handleContact = (_vendorId: string) => {
    // Open chat drawer
    // TODO: 后续可以添加逻辑来自动选择或创建与该用户的聊天房间
    openChatDrawer();
  };

  const {
    containerRef: pullRefreshRef,
    pullDistance,
    isRefreshing,
    canRelease,
  } = usePullRefresh({
    onRefresh: async () => {
      await refetch();
    },
    disabled: isDesktop || shell === 'admin',
  });

  const handleConfirmDelivery = useCallback(
    (orderId: string) => {
      router.push(
        orderDetailPath(orderId, 'purchase', {
          fromShell: shell === 'admin' ? 'admin' : undefined,
        })
      );
    },
    [router, shell]
  );

  return (
    <div
      ref={shell === 'consumer' ? pullRefreshRef : undefined}
      data-testid="orders-purchases-panel"
    >
      {shell === 'admin' && !isEmbeddedApp && (
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">
            {t('order.myPurchases')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('order.managePurchases')}</p>
        </div>
      )}

      {shell === 'consumer' && !isDesktop && (
        <PullRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          canRelease={canRelease}
        />
      )}

      {/* Status Filter */}
      <div className="mb-4 sm:mb-6">
        <div className="lg:hidden">
          <button
            onClick={() => setShowStatusSheet(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card text-foreground active:bg-muted/30"
          >
            <span className="text-sm font-medium">
              {statusTabs.find(t => t.value === statusFilter)?.label} ({filteredOrders.length})
            </span>
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <HStack gap="xs" className="min-w-max pb-2 sm:gap-2">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </HStack>
        </div>
      </div>

      {isLoading ? (
        <VStack gap="lg">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <HStack gap="md" align="start" className="mb-4">
                  <Skeleton variant="rectangular" width={64} height={64} className="rounded-lg" />
                  <div className="flex-1">
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="40%" height={16} className="mt-2" />
                  </div>
                  <Skeleton variant="rounded" width={100} height={28} />
                </HStack>
                <HStack justify="between" align="center">
                  <Skeleton variant="text" width={120} height={24} />
                  <HStack gap="sm">
                    <Skeleton variant="rounded" width={80} height={36} />
                    <Skeleton variant="rounded" width={100} height={36} />
                  </HStack>
                </HStack>
              </CardContent>
            </Card>
          ))}
        </VStack>
      ) : error ? (
        <LoadError message={error} onRetry={refetch} />
      ) : filteredOrders.length === 0 ? (
        <Card className="text-center">
          <CardContent className="py-10 sm:py-16">
            <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-7 h-7 sm:w-10 sm:h-10 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobile ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                )}
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1.5 sm:mb-2">
              {isMobile && statusFilter === 'all'
                ? t('order.noPurchasesFound')
                : t('order.noOrdersFound')}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
              {statusFilter === 'all'
                ? t('order.noPurchasesMessage')
                : t('order.noStatusOrders', {
                    status: statusTabs.find(s => s.value === statusFilter)?.label || statusFilter,
                  })}
            </p>
            {isMobile && statusFilter === 'all' && (
              <Link
                href="/"
                className="inline-block mt-4 sm:mt-6 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors touch-feedback"
              >
                {t('order.browseProducts')}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 桌面端：表格视图 */}
          {isDesktop ? (
            <OrderTable
              orders={filteredOrders}
              type="purchase"
              onViewDetails={handleViewDetails}
              onContact={handleContact}
            />
          ) : (
            /* 移动端：紧凑列表视图 with swipe actions */
            <Card className="overflow-hidden">
              <OrderListCompact
                orders={filteredOrders}
                type="purchase"
                onViewDetails={handleViewDetails}
                onContact={handleContact}
                onConfirmDelivery={handleConfirmDelivery}
              />
            </Card>
          )}

          {/* 加载更多 */}
          {hasMore && filteredOrders.length > 0 && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-feedback"
              >
                {isLoadingMore ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t('common.loading')}
                  </span>
                ) : (
                  t('common.loadMore')
                )}
              </button>
            </div>
          )}

          {/* 没有更多数据提示 */}
          {!hasMore && filteredOrders.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              {t('common.noMoreData')}
            </p>
          )}
        </>
      )}

      {/* 移动端状态选择底部弹窗 */}
      <BottomSheet open={showStatusSheet} onClose={() => setShowStatusSheet(false)}>
        {statusTabs.map(tab => {
          const count =
            tab.value === 'all' ? orders.length : orders.filter(o => o.status === tab.value).length;

          // 状态描述映射（使用 i18n）
          const descMap: Record<string, string> = {
            all: t('order.statusDesc.allPurchases'),
            pending: t('order.statusDesc.pending'),
            processing: t('order.statusDesc.processing'),
            shipped: t('order.statusDesc.shipped'),
            completed: t('order.statusDesc.completed'),
            disputed: t('order.statusDesc.disputed'),
          };

          return (
            <BottomSheetItem
              key={tab.value}
              title={tab.label}
              description={descMap[tab.value]}
              trailing={count}
              selected={statusFilter === tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setShowStatusSheet(false);
              }}
            />
          );
        })}
      </BottomSheet>
    </div>
  );
}
