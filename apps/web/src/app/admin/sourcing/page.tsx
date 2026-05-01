'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, Compass, ArrowRight, Palette, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { useI18n, fulfillmentApi, FULFILLMENT_PROVIDERS } from '@mobazha/core';
import type { ProviderConnection, SyncedProduct } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { SourcingFeatureGuard } from './SourcingFeatureGuard';

function StatsCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      {loading ? (
        <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
      ) : (
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      )}
    </div>
  );
}

function ProviderCard({
  providerID,
  connection,
}: {
  providerID: string;
  connection: ProviderConnection | null;
}) {
  const { t } = useI18n();
  const provider = FULFILLMENT_PROVIDERS.find(p => p.id === providerID);
  if (!provider) return null;

  const connected = connection?.status === 'connected';
  const storeName = connection?.storeName;

  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{provider.name}</p>
            {connected && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {connected
              ? storeName || t('admin.sourcing.connected')
              : t('admin.sourcing.notConnected')}
          </p>
        </div>
      </div>
      {!connected && (
        <Link
          href="/admin/settings/integrations"
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('admin.sourcing.connect')}
        </Link>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  synced: 'bg-primary/10 text-primary',
  pending: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
  error: 'bg-destructive/10 text-destructive',
};

const MAX_RECENT_ITEMS = 5;

function RecentImportItem({ product }: { product: SyncedProduct }) {
  const displayName = product.title || product.listingSlug;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <span className="text-sm text-foreground truncate block">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            ${(parseFloat(product.retailPrice) / 100).toFixed(2)}
          </span>
        </div>
      </div>
      <span
        className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
          STATUS_STYLES[product.status] || STATUS_STYLES.pending
        )}
      >
        {product.status}
      </span>
    </div>
  );
}

export default function AdminSourcingPage() {
  return (
    <SourcingFeatureGuard>
      <AdminSourcingContent />
    </SourcingFeatureGuard>
  );
}

function AdminSourcingContent() {
  const { t } = useI18n();
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [syncedProducts, setSyncedProducts] = useState<SyncedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const conns = await fulfillmentApi.getFulfillmentProviders();
      setConnections(conns);

      const connected = conns.filter(c => c.status === 'connected');
      const allProducts = await Promise.all(
        connected.map(c =>
          fulfillmentApi.getSyncedProducts(c.providerId).catch(() => [] as SyncedProduct[])
        )
      );
      setSyncedProducts(allProducts.flat());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const connectionMap = Object.fromEntries(connections.map(c => [c.providerId, c]));

  return (
    <div data-testid="admin-sourcing">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('admin.sourcing.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('admin.sourcing.subtitle')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <StatsCard
          label={t('admin.sourcing.connectedProviders')}
          value={connectedCount}
          loading={loading}
        />
        <StatsCard
          label={t('admin.sourcing.totalProducts')}
          value={syncedProducts.length}
          loading={loading}
        />
      </div>

      {/* Connected Providers */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            {t('admin.sourcing.providers')}
          </h2>
          <Link
            href="/admin/settings/integrations"
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('admin.sourcing.addProvider')}
          </Link>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            FULFILLMENT_PROVIDERS.map(provider => (
              <ProviderCard
                key={provider.id}
                providerID={provider.id}
                connection={connectionMap[provider.id] || null}
              />
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Link
          href="/admin/sourcing/catalog"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">
              {t('admin.sourcing.browseCatalog')}
            </p>
            <p className="text-xs text-muted-foreground">{t('admin.sourcing.browseCatalogDesc')}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto shrink-0 transition-colors" />
        </Link>

        <Link
          href="/admin/sourcing/designs"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">{t('admin.sourcing.myDesigns')}</p>
            <p className="text-xs text-muted-foreground">{t('admin.sourcing.myDesignsDesc')}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto shrink-0 transition-colors" />
        </Link>

        <Link
          href="/admin/sourcing/products"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">
              {t('admin.sourcing.viewImported')}
            </p>
            <p className="text-xs text-muted-foreground">{t('admin.sourcing.viewImportedDesc')}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto shrink-0 transition-colors" />
        </Link>
      </div>

      {/* Recent Imports */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            {t('admin.sourcing.recentImports')}
          </h2>
          {syncedProducts.length > MAX_RECENT_ITEMS && (
            <Link
              href="/admin/sourcing/products"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {t('admin.sourcing.viewAll')}
            </Link>
          )}
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : syncedProducts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {t('admin.sourcing.noImports')}
          </div>
        ) : (
          <div>
            {syncedProducts.slice(0, MAX_RECENT_ITEMS).map(product => (
              <RecentImportItem key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
