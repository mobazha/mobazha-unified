'use client';

import React from 'react';
import { useI18n, useUserStore } from '@mobazha/core';
import {
  Package,
  ShoppingCart,
  DollarSign,
  Star,
  Plus,
  ArrowRight,
  TrendingUp,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = 'primary',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'info';
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5" data-testid="admin-stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
        <Package className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {t('admin.dashboard.emptyTitle')}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {t('admin.dashboard.emptyDescription')}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/listing/new?from=admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('admin.dashboard.createFirstProduct')}
        </Link>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
        >
          {t('admin.dashboard.setupStore')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const { profile } = useUserStore();

  return (
    <div data-testid="admin-dashboard">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {t('admin.dashboard.welcome', { name: profile?.name || 'Seller' })}
        </h1>
        <p className="text-muted-foreground mt-1">{t('admin.dashboard.subtitle')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={DollarSign}
          label={t('admin.dashboard.totalSales')}
          value="—"
          sublabel={t('admin.dashboard.allTime')}
          color="success"
        />
        <StatCard
          icon={ShoppingCart}
          label={t('admin.dashboard.newOrders')}
          value="—"
          sublabel={t('admin.dashboard.last7Days')}
          color="info"
        />
        <StatCard
          icon={Package}
          label={t('admin.dashboard.activeProducts')}
          value="—"
          sublabel={t('admin.dashboard.published')}
          color="primary"
        />
        <StatCard
          icon={Star}
          label={t('admin.dashboard.avgRating')}
          value="—"
          sublabel={t('admin.dashboard.storeRating')}
          color="warning"
        />
      </div>

      {/* Quick actions */}
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
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{t('admin.dashboard.manageOrders')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.dashboard.manageOrdersDesc')}</p>
          </div>
        </Link>

        <Link
          href={profile?.peerID ? `/store/${profile.peerID}` : '/'}
          className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
        >
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{t('admin.dashboard.viewStore')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.dashboard.viewStoreDesc')}</p>
          </div>
        </Link>
      </div>

      {/* Placeholder sections for PG-105 to fill */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders placeholder */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.dashboard.recentOrders')}
            </h2>
            <Link href="/admin/orders" className="text-sm text-primary hover:underline">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('admin.dashboard.noOrdersYet')}
          </div>
        </div>

        {/* Top products placeholder */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.dashboard.topProducts')}
            </h2>
            <Link href="/admin/products" className="text-sm text-primary hover:underline">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('admin.dashboard.noProductsYet')}
          </div>
        </div>
      </div>
    </div>
  );
}
