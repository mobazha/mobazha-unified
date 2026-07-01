'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  ArrowRight,
  Palette,
  Plus,
  Loader2,
  CheckCircle2,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  BellOff,
  LayoutGrid,
} from 'lucide-react';
import {
  useI18n,
  fulfillmentApi,
  FULFILLMENT_PROVIDERS,
  useCurrency,
  useMyListings,
  getImageUrl,
} from '@mobazha/core';
import type {
  ProviderConnection,
  ProductListItem,
  SyncedProduct,
  SupplyChainAlert,
  AlertSeverity,
} from '@mobazha/core';
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
            {connected && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
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
          href="/admin/settings/integrations?tab=fulfillment"
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
  pending: 'bg-warning/15 text-warning',
  error: 'bg-destructive/10 text-destructive',
};

const MAX_RECENT_ITEMS = 5;

const STATUS_LABELS: Record<string, string> = {
  synced: 'admin.sourcing.statusSynced',
  pending: 'admin.sourcing.statusPending',
  error: 'admin.sourcing.statusError',
};

function priceToDisplayAmount(
  listing?: ProductListItem
): { amount: number; currency: string } | null {
  if (!listing?.price) return null;
  const divisibility = listing.price.currency?.divisibility ?? 2;
  return {
    amount: Number(listing.price.amount) / 10 ** divisibility,
    currency: listing.price.currency?.code || 'USD',
  };
}

function priceToUsdCents(listing?: ProductListItem): number | null {
  const display = priceToDisplayAmount(listing);
  if (!display) return null;
  if (display.currency !== 'USD') return null;
  return Math.round(display.amount * 100);
}

function RecentImportItem({
  product,
  listing,
}: {
  product: SyncedProduct;
  listing?: ProductListItem;
}) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const displayName = listing?.title || product.title || product.listingSlug;
  const listingPrice = priceToDisplayAmount(listing);
  const retailDisplay = listingPrice
    ? formatPrice(listingPrice.amount, listingPrice.currency)
    : product.retailPrice
      ? formatPrice(parseFloat(product.retailPrice) / 100, 'USD')
      : '—';
  const thumbnailHash =
    listing?.thumbnail?.small || listing?.thumbnail?.tiny || listing?.thumbnail?.original;
  const thumbnailUrl = thumbnailHash
    ? getImageUrl(thumbnailHash)
    : getImageUrl(product.thumbnailUrl);

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <span className="text-sm text-foreground truncate block">{displayName}</span>
          <span className="text-xs text-muted-foreground">{retailDisplay}</span>
        </div>
      </div>
      <span
        className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
          STATUS_STYLES[product.status] || STATUS_STYLES.pending
        )}
      >
        {t(STATUS_LABELS[product.status] || STATUS_LABELS.pending)}
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

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/15 text-warning',
  info: 'bg-info/15 text-info',
};

const SEVERITY_ICON: Record<AlertSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function AlertsPanel({
  alerts,
  onDismiss,
}: {
  alerts: SupplyChainAlert[];
  onDismiss: (id: string) => void;
}) {
  const { t } = useI18n();
  const active = alerts.filter(a => !a.dismissed).slice(0, 3);

  if (active.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            {t('admin.sourcing.recentAlerts')}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({active.length})
            </span>
          </h2>
        </div>
        <Link
          href="/admin/sourcing/alerts"
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {t('admin.sourcing.viewAllAlerts')}
        </Link>
      </div>
      <div className="space-y-2">
        {active.map(alert => {
          const SevIcon = SEVERITY_ICON[alert.severity] || Info;
          return (
            <div
              key={alert.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg text-sm',
                SEVERITY_STYLES[alert.severity]
              )}
            >
              <SevIcon className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{alert.title}</span>
                <span className="opacity-70 ml-2 text-xs hidden sm:inline">{alert.message}</span>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className="p-1 rounded hover:bg-background/50 transition-colors shrink-0"
                title={t('admin.sourcing.dismissAlert')}
              >
                <BellOff className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminSourcingContent() {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const { listings: myListings } = useMyListings();
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [syncedProducts, setSyncedProducts] = useState<SyncedProduct[]>([]);
  const [alerts, setAlerts] = useState<SupplyChainAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const listingsBySlug = useMemo(
    () => new Map(myListings.map(listing => [listing.slug, listing])),
    [myListings]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [conns, fetchedAlerts] = await Promise.all([
        fulfillmentApi.getFulfillmentProviders(),
        fulfillmentApi.getAlerts({ limit: 10 }).catch(() => [] as SupplyChainAlert[]),
      ]);
      setConnections(conns);
      setAlerts(fetchedAlerts);

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

  const totalCost = syncedProducts.reduce(
    (sum, p) => sum + (p.supplierCost ? parseFloat(p.supplierCost) : 0),
    0
  );
  const totalRetail = syncedProducts.reduce(
    (sum, p) =>
      sum +
      (priceToUsdCents(listingsBySlug.get(p.listingSlug)) ??
        (p.retailPrice ? parseFloat(p.retailPrice) : 0)),
    0
  );
  const estProfit = totalRetail - totalCost;

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
        <StatsCard
          label={t('admin.sourcing.totalCost')}
          value={loading ? '' : formatPrice(totalCost / 100, 'USD')}
          loading={loading}
        />
        <StatsCard
          label={t('admin.sourcing.estProfit')}
          value={loading ? '' : formatPrice(estProfit / 100, 'USD')}
          loading={loading}
        />
      </div>

      {/* Alerts Panel */}
      <AlertsPanel
        alerts={alerts}
        onDismiss={async id => {
          await fulfillmentApi.dismissAlert(id);
          setAlerts(prev => prev.map(a => (a.id === id ? { ...a, dismissed: true } : a)));
        }}
      />

      {/* Connected Providers */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            {t('admin.sourcing.providers')}
          </h2>
          <Link
            href="/admin/settings/integrations?tab=fulfillment"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
          href="/admin/sourcing/catalog"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5 text-primary" />
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

        <Link
          href="/admin/sourcing/alerts"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">
              {t('admin.sourcing.alertsAndRules')}
            </p>
            <p className="text-xs text-muted-foreground">{t('admin.sourcing.alertsDesc')}</p>
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
              <RecentImportItem
                key={product.id}
                product={product}
                listing={listingsBySlug.get(product.listingSlug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
