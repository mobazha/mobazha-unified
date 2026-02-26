'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useI18n,
  useUserStore,
  useCurrency,
  productDataService,
  useSales,
  isStandalone,
} from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { Package, ShoppingCart, TrendingUp, Star, Plus, Eye, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
  StatCard,
  RecentOrderRow,
  TopProductRow,
  EmptyState,
  ListSkeleton,
  getOrderCurrencyCode,
} from '@/components/admin/dashboard';

const REVENUE_STATES = new Set(['COMPLETED', 'FULFILLED', 'PAYMENT_FINALIZED']);

function useDashboardData() {
  const { profile } = useUserStore();
  const { formatPrice, localCurrency, convertToLocal } = useCurrency();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);

  const {
    orders: salesOrders,
    isLoading: salesLoading,
    error: salesError,
  } = useSales({ limit: 20 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await productDataService.getMyListings();
        if (!cancelled) setProducts(data);
      } catch (err) {
        if (!cancelled)
          setProductsError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile?.peerID) return;
    let cancelled = false;
    (async () => {
      try {
        const ratings = await productDataService.getStoreRatings(profile.peerID);
        if (!cancelled) {
          setRatingAvg(ratings.average);
          setRatingCount(ratings.count);
        }
      } catch {
        // Ratings are non-critical; silent fallback to defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.peerID]);

  const recentOrders = useMemo(() => salesOrders.slice(0, 5), [salesOrders]);

  const topProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => {
          const ratingDiff = (b.averageRating || 0) - (a.averageRating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return (b.ratingCount || 0) - (a.ratingCount || 0);
        })
        .slice(0, 5),
    [products]
  );

  const totalSalesDisplay = useMemo(() => {
    if (!salesOrders.length) return '—';
    let total = 0;
    for (const order of salesOrders) {
      if (!order.total?.amount || !REVENUE_STATES.has(order.state)) continue;
      const cc = getOrderCurrencyCode(order);
      try {
        total += convertToLocal(order.total.amount, cc);
      } catch {
        // Skip orders with unknown currencies
      }
    }
    if (total <= 0) return '—';
    return formatPrice(total, localCurrency);
  }, [salesOrders, convertToLocal, formatPrice, localCurrency]);

  return {
    profile,
    products,
    productsLoading,
    productsError,
    salesOrders,
    salesLoading,
    salesError,
    ratingAvg,
    ratingCount,
    recentOrders,
    topProducts,
    totalSalesDisplay,
  };
}

function DashboardHeader({ name }: { name: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">
        {t('admin.dashboard.welcome', { name })}
      </h1>
      <p className="text-muted-foreground mt-1">{t('admin.dashboard.subtitle')}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const {
    profile,
    products,
    productsLoading,
    productsError,
    salesOrders,
    salesLoading,
    salesError,
    ratingAvg,
    ratingCount,
    recentOrders,
    topProducts,
    totalSalesDisplay,
  } = useDashboardData();

  const isDataLoading = productsLoading || salesLoading;
  const hasProducts = products.length > 0;
  const hasOrders = salesOrders.length > 0;
  const isEmpty = !isDataLoading && !hasProducts && !hasOrders;
  const displayName = profile?.name || 'Seller';

  const standaloneMode = useMemo(() => isStandalone(), []);
  const storeUrl = profile?.peerID ? (standaloneMode ? '/' : `/store/${profile.peerID}`) : '/';

  if (isEmpty) {
    return (
      <div data-testid="admin-dashboard">
        <DashboardHeader name={displayName} />
        <EmptyState />
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard">
      <DashboardHeader name={displayName} />

      {productsError && <ErrorBanner message={productsError} />}
      {salesError && <ErrorBanner message={salesError} />}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Package}
          label={t('admin.dashboard.activeProducts')}
          value={String(products.length)}
          sublabel={t('admin.dashboard.published')}
          color="primary"
          loading={productsLoading}
        />
        <StatCard
          icon={ShoppingCart}
          label={t('admin.dashboard.totalOrders')}
          value={String(salesOrders.length)}
          sublabel={t('admin.dashboard.allTime')}
          color="info"
          loading={salesLoading}
        />
        <StatCard
          icon={TrendingUp}
          label={t('admin.dashboard.totalSales')}
          value={totalSalesDisplay}
          sublabel={t('admin.dashboard.completedOrders')}
          color="success"
          loading={salesLoading}
        />
        <StatCard
          icon={Star}
          label={t('admin.dashboard.avgRating')}
          value={ratingAvg != null && ratingAvg > 0 ? ratingAvg.toFixed(1) : '—'}
          sublabel={
            ratingCount > 0
              ? t('admin.dashboard.reviewCount', { count: ratingCount })
              : t('admin.dashboard.noReviews')
          }
          color="warning"
          loading={productsLoading && ratingAvg === null}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link
          href="/listing/new?from=admin"
          className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
        >
          <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{t('admin.dashboard.addProduct')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.dashboard.addProductDesc')}</p>
          </div>
        </Link>

        <Link
          href="/admin/orders"
          className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
        >
          <div className="p-3 rounded-lg bg-info/10 text-info group-hover:bg-info group-hover:text-primary-foreground transition-colors">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{t('admin.dashboard.manageOrders')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.dashboard.manageOrdersDesc')}</p>
          </div>
        </Link>

        <a
          href={storeUrl}
          target={standaloneMode ? undefined : '_blank'}
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
        >
          <div className="p-3 rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-primary-foreground transition-colors">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{t('admin.dashboard.viewStore')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.dashboard.viewStoreDesc')}</p>
          </div>
        </a>
      </div>

      {/* Lists: Recent Orders + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.dashboard.recentOrders')}
            </h2>
            <Link href="/admin/orders" className="text-sm text-primary hover:underline">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          {salesLoading ? (
            <ListSkeleton />
          ) : recentOrders.length > 0 ? (
            <div>
              {recentOrders.map(order => (
                <RecentOrderRow key={order.orderID} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('admin.dashboard.noOrdersYet')}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.dashboard.topProducts')}
            </h2>
            <Link href="/admin/products" className="text-sm text-primary hover:underline">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          {productsLoading ? (
            <ListSkeleton />
          ) : topProducts.length > 0 ? (
            <div>
              {topProducts.map(product => (
                <TopProductRow key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('admin.dashboard.noProductsYet')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
