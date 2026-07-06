'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useI18n,
  isStandalone,
  useReceivingAccounts,
  useUserContext,
  getAdminStorePaymentsPath,
} from '@mobazha/core';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Star,
  Zap,
  Eye,
  Palette,
  AlertCircle,
  AlertTriangle,
  Lock,
  Tag,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData';
import { usePlatform } from '@mobazha/ui/hooks';
import {
  StatCard,
  AdminRecentOrderRow,
  TopProductRow,
  EmptyState,
  ListSkeleton,
  SetupChecklist,
  MnemonicBackupBanner,
  ActionItems,
  SupplyNeedsAttentionCard,
} from '@/components/admin/dashboard';
import OnboardingWizard, { isOnboardingDismissed } from '@/components/admin/OnboardingWizard';
import StandaloneSetupWizard from '@/components/admin/StandaloneSetupWizard';
import { getSetupStatus } from '@mobazha/core/services/api/system';
import type { SetupCompletedSteps } from '@mobazha/core/services/api/system';
import { useFeature } from '@mobazha/core/hooks/useFeature';

function DashboardHeader({ name }: { name: string }) {
  const { t } = useI18n();
  const { isEmbeddedApp } = usePlatform();

  if (isEmbeddedApp) return null;

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
  const router = useRouter();
  const isMobile = useIsMobile();
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');
  const searchParams = useSearchParams();
  const {
    profile,
    products,
    productsLoading,
    productsError,
    salesOrders,
    salesLoading,
    guestLoading,
    salesError,
    ratingAvg,
    ratingCount,
    recentOrders,
    topProducts,
    totalSalesDisplay,
    totalOrderCount,
  } = useAdminDashboardData();

  const { hasStore } = useUserContext();
  const [sessionDismissed, setSessionDismissed] = useState(false);

  useEffect(() => {
    if (aiWorkspaceEnabled && searchParams.get('tab') === 'workspace') {
      router.replace('/admin/ai/workspace');
    }
  }, [aiWorkspaceEnabled, searchParams, router]);

  const standaloneMode = useMemo(() => isStandalone(), []);

  // Standalone first-run setup detection — always wait for GET /v1/system/setup.
  const [standaloneSetupNeeded, setStandaloneSetupNeeded] = useState<boolean | null>(
    standaloneMode ? null : false
  );
  const [standaloneCompletedSteps, setStandaloneCompletedSteps] = useState<
    SetupCompletedSteps | undefined
  >();

  useEffect(() => {
    if (!standaloneMode) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await getSetupStatus();
        if (!cancelled) {
          setStandaloneSetupNeeded(!status.setupComplete);
          setStandaloneCompletedSteps(status.completedSteps);
        }
      } catch {
        // Tor latency / transient errors: prefer admin login over re-onboarding.
        if (!cancelled) setStandaloneSetupNeeded(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [standaloneMode]);

  const isDataLoading = productsLoading || salesLoading;
  const hasProducts = products.length > 0;
  const hasOrders = salesOrders.length > 0;
  const isEmpty = !isDataLoading && !hasProducts && !hasOrders;
  const displayName = profile?.name || t('common.seller');

  const cameFromOnboarding = searchParams.get('onboarding') === 'complete';
  const needsStoreSetup = !standaloneMode && !hasStore;

  const showOnboarding = useMemo(
    () =>
      (!sessionDismissed && (needsStoreSetup || (isEmpty && !isOnboardingDismissed()))) ||
      cameFromOnboarding,
    [sessionDismissed, needsStoreSetup, isEmpty, cameFromOnboarding]
  );

  const handleOnboardingComplete = useCallback(() => {
    setSessionDismissed(true);
    window.location.reload();
  }, []);

  const handleOnboardingSkip = useCallback(() => {
    setSessionDismissed(true);
  }, []);

  const storeUrl = profile?.peerID ? (standaloneMode ? '/' : `/store/${profile.peerID}`) : '/';

  const { data: receivingAccounts } = useReceivingAccounts();
  const hasNoPaymentMethods = !!(
    hasProducts &&
    receivingAccounts &&
    Array.isArray(receivingAccounts) &&
    receivingAccounts.filter(a => a.isActive !== false).length === 0
  );

  if (standaloneSetupNeeded === null) {
    return null;
  }

  if (standaloneSetupNeeded) {
    return (
      <div data-testid="admin-dashboard">
        <StandaloneSetupWizard initialCompletedSteps={standaloneCompletedSteps} />
      </div>
    );
  }

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
        <SetupChecklist hasProducts={false} productsLoading={false} />
        {profile?.visibility === 'private' && (
          <div className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-primary/10 border border-primary/20">
            <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('admin.dashboard.privateStoreActive')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('admin.dashboard.privateStoreActiveDesc')}
              </p>
              {!(typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) && (
                <Link
                  href="/admin/settings/access-control/privacy"
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:underline"
                >
                  {t('admin.dashboard.managePrivacy')} →
                </Link>
              )}
            </div>
          </div>
        )}
        <EmptyState />
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard">
      <DashboardHeader name={displayName} />

      <SetupChecklist hasProducts={hasProducts} productsLoading={productsLoading} />

      <MnemonicBackupBanner />

      {profile?.visibility === 'private' && (
        <div className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-primary/10 border border-primary/20">
          <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t('admin.dashboard.privateStoreActive')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('admin.dashboard.privateStoreActiveDesc')}
            </p>
            {!(typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) && (
              <Link
                href="/admin/settings/access-control/privacy"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:underline"
              >
                {t('admin.dashboard.managePrivacy')} →
              </Link>
            )}
          </div>
        </div>
      )}

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
              href={getAdminStorePaymentsPath()}
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:underline"
            >
              {t('admin.dashboard.setUpPayments')} →
            </Link>
          </div>
        </div>
      )}

      {/* Action Items — seller to-dos */}
      <ActionItems orders={salesOrders} loading={salesLoading} />

      <SupplyNeedsAttentionCard products={products} loading={productsLoading} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          icon={Package}
          label={t('admin.dashboard.activeProducts')}
          value={String(products.length)}
          sublabel={t('admin.dashboard.published')}
          color="primary"
          loading={productsLoading}
          href="/admin/products"
        />
        <StatCard
          icon={ShoppingCart}
          label={t('admin.dashboard.totalOrders')}
          value={String(totalOrderCount)}
          sublabel={t('admin.dashboard.allTime')}
          color="info"
          loading={salesLoading || guestLoading}
          href="/admin/orders"
        />
        <StatCard
          icon={TrendingUp}
          label={t('admin.dashboard.totalSales')}
          value={totalSalesDisplay}
          sublabel={t('admin.dashboard.completedOrders')}
          color="success"
          loading={salesLoading}
          href={
            typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__
              ? '/admin/orders'
              : '/admin/analytics'
          }
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
          href={
            typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__
              ? '/admin/products'
              : '/admin/analytics'
          }
        />
      </div>

      {/* Quick Actions — Mobile: 2x2 icon grid, Desktop: 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="relative">
          <Link
            href={
              typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__
                ? '/listing/new?from=admin'
                : '/listing/quick'
            }
            className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group min-h-[44px]"
          >
            <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400 group-hover:from-purple-500 group-hover:to-blue-500 group-hover:text-white transition-all">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-base font-medium text-foreground">
                {t('admin.dashboard.quickCreate')}
              </p>
              <p className="hidden sm:block text-sm text-muted-foreground">
                {t('admin.dashboard.quickCreateDesc')}
              </p>
            </div>
          </Link>
          {!(typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) && (
            <Link
              href="/listing/new?from=admin"
              className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground hover:text-primary transition-colors hidden sm:inline"
            >
              {t('admin.dashboard.fullEditor')}
            </Link>
          )}
        </div>

        {!isMobile && (
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
        )}

        {!(typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) && (
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
        )}

        {isMobile ? (
          <>
            <Link
              href="/admin/collections"
              className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group min-h-[44px]"
            >
              <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground">{t('admin.nav.collections')}</p>
              </div>
            </Link>
            {!(typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) && (
              <Link
                href="/admin/discounts"
                className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group min-h-[44px]"
              >
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground">{t('admin.nav.discounts')}</p>
                </div>
              </Link>
            )}
          </>
        ) : (
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
        )}
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
          {salesLoading || guestLoading ? (
            <ListSkeleton />
          ) : recentOrders.length > 0 ? (
            <div className="-mx-4 sm:mx-0">
              <div className="flex sm:block overflow-x-auto sm:overflow-visible gap-3 sm:gap-0 px-4 sm:px-0 pb-2 sm:pb-0 snap-x snap-mandatory">
                {recentOrders.map(entry => (
                  <div
                    key={entry.source === 'standard' ? entry.order.orderID : entry.order.orderToken}
                    className="min-w-[260px] sm:min-w-0 snap-start"
                  >
                    <AdminRecentOrderRow entry={entry} />
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
