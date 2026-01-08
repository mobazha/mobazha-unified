'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { OrderCard, Order } from '@/components/Order';
import { useI18n, usePurchases, useSales, getImageUrl } from '@mobazha/core';
import type { OrderListItem } from '@mobazha/core';

type OrderStatus =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'disputed';
type OrderType = 'purchases' | 'sales';

// 将核心包的 OrderState 映射到 UI 的 OrderStatus
function mapOrderState(state: string): Order['status'] {
  const stateMap: Record<string, Order['status']> = {
    PENDING: 'pending',
    AWAITING_PAYMENT: 'pending',
    AWAITING_PICKUP: 'processing',
    AWAITING_FULFILLMENT: 'processing',
    PARTIALLY_FULFILLED: 'processing',
    FULFILLED: 'shipped',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    DECLINED: 'cancelled',
    REFUNDED: 'cancelled',
    DISPUTED: 'disputed',
    DECIDED: 'disputed',
    DISPUTE_EXPIRED: 'disputed',
    RESOLVED: 'completed',
    PAYMENT_FINALIZED: 'completed',
    PROCESSING_ERROR: 'pending',
  };
  return stateMap[state] || 'pending';
}

// 格式化价格金额（从最小单位转换为标准显示值）
function formatPriceAmount(total: OrderListItem['total']): string {
  if (!total) return '0.00';

  // 处理两种可能的格式
  // 格式1: { amount, currency: { code, divisibility } } - 后端实际格式
  // 格式2: { amount, currencyCode } - 简化格式
  const amount = total.amount || 0;
  const divisibility =
    (total as { currency?: { divisibility?: number } }).currency?.divisibility ?? 2;

  // 将最小单位转换为标准单位
  const normalAmount = amount / Math.pow(10, divisibility);
  return normalAmount.toFixed(2);
}

// 获取价格的货币代码
function getPriceCurrency(total: OrderListItem['total']): string {
  if (!total) return 'USD';
  // 优先使用 currency.code，回退到 currencyCode
  return (
    (total as { currency?: { code?: string } }).currency?.code ||
    (total as { currencyCode?: string }).currencyCode ||
    'USD'
  );
}

// 获取图片完整 URL（将 IPFS 哈希转换为网关 URL）
function getThumbnailUrl(thumbnail: OrderListItem['thumbnail']): string {
  if (!thumbnail) return '';

  // 如果是字符串格式（IPFS 哈希），使用 getImageUrl 转换
  if (typeof thumbnail === 'string') {
    return getImageUrl(thumbnail) || '';
  }

  // 如果是对象格式，按优先级获取哈希并转换为完整 URL
  const hash =
    thumbnail.medium ||
    thumbnail.small ||
    thumbnail.tiny ||
    thumbnail.large ||
    thumbnail.original ||
    '';
  return getImageUrl(hash) || '';
}

// 将 OrderListItem 转换为 OrderCard 期望的 Order 格式
function transformOrderListItem(item: OrderListItem): Order {
  const imageUrl = getThumbnailUrl(item.thumbnail);

  // 防御性处理：确保字段存在（后端可能返回不同的字段名）
  const orderId = item.orderID || ((item as Record<string, unknown>).orderId as string) || '';
  const vendorId = item.vendorID || ((item as Record<string, unknown>).vendorId as string) || '';
  const buyerId = item.buyerID || ((item as Record<string, unknown>).buyerId as string) || '';

  // 获取格式化后的价格和货币
  const formattedPrice = formatPriceAmount(item.total);
  const currency = getPriceCurrency(item.total) || item.paymentCoin || 'USD';

  return {
    id: orderId,
    orderId: orderId,
    status: mapOrderState(item.state || 'PENDING'),
    items: [
      {
        id: orderId,
        title: item.title || 'Unknown Item',
        image: imageUrl,
        quantity: item.quantity || 1,
        price: formattedPrice,
        currency: currency,
      },
    ],
    total: formattedPrice,
    currency: currency,
    createdAt: item.timestamp || new Date().toISOString(),
    vendor: {
      id: vendorId,
      name:
        item.vendorHandle ||
        item.buyerHandle ||
        (vendorId
          ? vendorId.slice(0, 12) + '...'
          : buyerId
            ? buyerId.slice(0, 12) + '...'
            : 'Unknown'),
    },
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // 从 URL 参数读取 tab 值（使用 useMemo 响应 URL 变化）
  const orderType = useMemo<OrderType>(() => {
    const tab = searchParams.get('tab');
    return tab === 'sales' ? 'sales' : 'purchases';
  }, [searchParams]);

  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');

  // 使用核心包的 hooks 获取真实数据（支持分页）
  const {
    orders: purchaseOrders,
    isLoading: purchasesLoading,
    isLoadingMore: purchasesLoadingMore,
    error: purchasesError,
    hasMore: purchasesHasMore,
    loadMore: loadMorePurchases,
  } = usePurchases();

  const {
    orders: salesOrders,
    isLoading: salesLoading,
    isLoadingMore: salesLoadingMore,
    error: salesError,
    hasMore: salesHasMore,
    loadMore: loadMoreSales,
  } = useSales();

  // 根据当前选中的 tab 获取对应数据
  const rawOrders = orderType === 'purchases' ? purchaseOrders : salesOrders;
  const isLoading = orderType === 'purchases' ? purchasesLoading : salesLoading;
  const isLoadingMore = orderType === 'purchases' ? purchasesLoadingMore : salesLoadingMore;
  const error = orderType === 'purchases' ? purchasesError : salesError;
  const hasMore = orderType === 'purchases' ? purchasesHasMore : salesHasMore;
  const loadMore = orderType === 'purchases' ? loadMorePurchases : loadMoreSales;

  // 转换数据格式（确保 rawOrders 是数组）
  const orders = useMemo(() => {
    // 防御性处理：确保是数组
    const ordersArray = Array.isArray(rawOrders) ? rawOrders : [];
    return ordersArray.map(transformOrderListItem);
  }, [rawOrders]);

  const statusTabs: { value: OrderStatus; label: string }[] = [
    { value: 'all', label: t('order.allOrders') },
    { value: 'pending', label: t('order.pending') },
    { value: 'processing', label: t('order.processing') },
    { value: 'shipped', label: t('order.shipped') },
    { value: 'completed', label: t('order.completed') },
    { value: 'disputed', label: t('order.disputed') },
  ];

  // 根据状态过滤订单
  const filteredOrders = orders.filter(
    order => statusFilter === 'all' || order.status === statusFilter
  );

  const handleViewDetails = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleContact = (vendorId: string) => {
    // Navigate to chat with vendor
    router.push(`/chat/${vendorId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container>
          {/* Page Header */}
          <div className="mb-4 sm:mb-8">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              {t('nav.orders')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t('order.manageOrders')}</p>
          </div>

          {/* Order Type Toggle */}
          <div className="mb-4 sm:mb-6">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {(['purchases', 'sales'] as OrderType[]).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    // 更新 URL 参数，orderType 将通过 useMemo 自动更新
                    router.push(`/orders?tab=${type}`);
                  }}
                  className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    orderType === type
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type === 'purchases' ? t('order.myPurchases') : t('order.mySales')}
                </button>
              ))}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="mb-4 sm:mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <HStack gap="xs" className="min-w-max pb-2 sm:gap-2">
              {statusTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-border'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </HStack>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <VStack gap="lg">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <HStack gap="md" align="start" className="mb-4">
                      <Skeleton
                        variant="rectangular"
                        width={64}
                        height={64}
                        className="rounded-lg"
                      />
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
            <Card className="text-center">
              <CardContent className="py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{t('common.error')}</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">{error}</p>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card className="text-center">
              <CardContent className="py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t('order.noOrdersFound')}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {statusFilter === 'all'
                    ? t('order.noOrdersMessage', {
                        type: orderType === 'purchases' ? t('order.purchases') : t('order.sales'),
                      })
                    : t('order.noStatusOrders', {
                        status:
                          statusTabs.find(s => s.value === statusFilter)?.label || statusFilter,
                      })}
                </p>
              </CardContent>
            </Card>
          ) : (
            <VStack gap="md" className="sm:gap-4">
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type={orderType === 'purchases' ? 'purchase' : 'sale'}
                  onViewDetails={() => handleViewDetails(order.id)}
                  onContact={() => handleContact(order.vendor.id)}
                />
              ))}

              {/* 加载更多 */}
              {hasMore && filteredOrders.length > 0 && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-feedback"
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
            </VStack>
          )}
        </Container>
      </main>
    </div>
  );
}
