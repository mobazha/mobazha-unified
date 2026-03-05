'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useI18n,
  useUserStore,
  useCurrency,
  productDataService,
  useSales,
  isStandalone,
  useReceivingAccounts,
} from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Star,
  Plus,
  Eye,
  Palette,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  StatCard,
  RecentOrderRow,
  TopProductRow,
  EmptyState,
  ListSkeleton,
  getOrderCurrencyCode,
} from '@/components/admin/dashboard';
import OnboardingWizard, { isOnboardingDismissed } from '@/components/admin/OnboardingWizard';

const REVENUE_STATES = new Set(['COMPLETED', 'FULFILLED', 'PAYMENT_FINALIZED']);

function useDashboardData() {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const { formatPrice, fromMinimalUnit, localCurrency, convertToLocal } = useCurrency();

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
          setProductsError(
            err instanceof Error ? err.message : t('admin.dashboard.failedToLoadProducts')
          );
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
        total += convertToLocal(fromMinimalUnit(order.total.amount, cc), cc);
      } catch {
        // Skip orders with unknown currencies
      }
    }
    if (total <= 0) return '—';
    return formatPrice(total, localCurrency);
  }, [salesOrders, convertToLocal, fromMinimalUnit, formatPrice, localCurrency]);

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
    <div className="mb-5 sm:mb-8">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">
        {t('admin.dashboard.welcome', { name })}
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground mt-1">
        {t('admin.dashboard.subtitle')}
      </p>
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

  const searchParams = useSearchParams();
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const isDataLoading = productsLoading || salesLoading;
  const hasProducts = products.length > 0;
  const hasOrders = salesOrders.length > 0;
  const isEmpty = !isDataLoading && !hasProducts && !hasOrders;
  const displayName = profile?.name || t('common.seller');

  const cameFromOnboarding = searchParams.get('onboarding') === 'complete';

  const showOnboarding = useMemo(
    () => (!sessionDismissed && isEmpty && !isOnboardingDismissed()) || cameFromOnboarding,
    [sessionDismissed, isEmpty, cameFromOnboarding]
  );

  const handleOnboardingComplete = useCallback(() => {
    setSessionDismissed(true);
    window.location.reload();
  }, []);

  const handleOnboardingSkip = useCallback(() => {
    setSessionDismissed(true);
  }, []);

  const standaloneMode = useMemo(() => isStandalone(), []);
  const storeUrl = profile?.peerID ? (standaloneMode ? '/' : `/store/${profile.peerID}`) : '/';

  const { data: receivingAccounts } = useReceivingAccounts();
  const hasNoPaymentMethods = !!(
    hasProducts &&
    receivingAccounts &&
    Array.isArray(receivingAccounts) &&
    receivingAccounts.filter(a => a.isActive !== false).length === 0
  );

  if (showOnboarding) {
    return (
      <div data-testid="admin-dashboard">
        <OnboardingWizard onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
      </div>
    );
  }

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

      {hasNoPaymentMethods && (
        <div className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              {t('admin.dashboard.noPaymentMethodsWarning')}
            </p>
            <Link
              href="/admin/settings/payments"
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:underline"
            >
              {t('admin.dashboard.setUpPayments')} →
            </Link>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
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

      {/* Quick Actions — Mobile: 2x2 icon grid, Desktop: 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link
          href="/listing/new?from=admin"
          className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group min-h-[44px]"
        >
          <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-base font-medium text-foreground">
              {t('admin.dashboard.addProduct')}
            </p>
            <p className="hidden sm:block text-sm text-muted-foreground">
              {t('admin.dashboard.addProductDesc')}
            </p>
          </div>
        </Link>

        <Link
          href="/admin/orders"
          className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group min-h-[44px]"
        >
          <div className="p-2.5 sm:p-3 rounded-lg bg-info/10 text-info group-hover:bg-info group-hover:text-primary-foreground transition-colors">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-base font-medium text-foreground">
              {t('admin.dashboard.manageOrders')}
            </p>
            <p className="hidden sm:block text-sm text-muted-foreground">
              {t('admin.dashboard.manageOrdersDesc')}
            </p>
          </div>
        </Link>

        <Link
          href="/admin/storefront"
          className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group min-h-[44px]"
        >
          <div className="p-2.5 sm:p-3 rounded-lg bg-warning/10 text-warning group-hover:bg-warning group-hover:text-primary-foreground transition-colors">
            <Palette className="w-5 h-5" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-base font-medium text-foreground">
              {t('admin.dashboard.designStore')}
            </p>
            <p className="hidden sm:block text-sm text-muted-foreground">
              {t('admin.dashboard.designStoreDesc')}
            </p>
          </div>
        </Link>

        <a
          href={storeUrl}
          target={standaloneMode ? undefined : '_blank'}
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group min-h-[44px]"
        >
          <div className="p-2.5 sm:p-3 rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-primary-foreground transition-colors">
            <Eye className="w-5 h-5" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-base font-medium text-foreground">
              {t('admin.dashboard.viewStore')}
            </p>
            <p className="hidden sm:block text-sm text-muted-foreground">
              {t('admin.dashboard.viewStoreDesc')}
            </p>
          </div>
        </a>
      </div>

      {/* Lists: Recent Orders + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              {t('admin.dashboard.recentOrders')}
            </h2>
            <Link
              href="/admin/orders"
              className="text-sm text-primary hover:underline min-h-[44px] sm:min-h-0 flex items-center"
            >
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          {salesLoading ? (
            <ListSkeleton />
          ) : recentOrders.length > 0 ? (
            <div className="-mx-4 sm:mx-0">
              <div className="flex sm:block overflow-x-auto sm:overflow-visible gap-3 sm:gap-0 px-4 sm:px-0 pb-2 sm:pb-0 snap-x snap-mandatory">
                {recentOrders.map(order => (
                  <div key={order.orderID} className="min-w-[260px] sm:min-w-0 snap-start">
                    <RecentOrderRow order={order} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('admin.dashboard.noOrdersYet')}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              {t('admin.dashboard.topProducts')}
            </h2>
            <Link
              href="/admin/products"
              className="text-sm text-primary hover:underline min-h-[44px] sm:min-h-0 flex items-center"
            >
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          {productsLoading ? (
            <ListSkeleton />
          ) : topProducts.length > 0 ? (
            <div className="-mx-4 sm:mx-0">
              <div className="flex sm:block overflow-x-auto sm:overflow-visible gap-3 sm:gap-0 px-4 sm:px-0 pb-2 sm:pb-0 snap-x snap-mandatory">
                {topProducts.map(product => (
                  <div key={product.slug} className="min-w-[220px] sm:min-w-0 snap-start">
                    <TopProductRow product={product} />
                  </div>
                ))}
              </div>
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
