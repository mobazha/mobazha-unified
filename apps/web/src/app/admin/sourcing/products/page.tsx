'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Package,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  useI18n,
  fulfillmentApi,
  FULFILLMENT_PROVIDERS,
  useCurrency,
  useMyListings,
  getImageUrl,
  buildProductHref,
} from '@mobazha/core';
import type {
  ProductListItem,
  SyncedProduct,
  ProviderConnection,
  FulfillmentProviderID,
  SupplyChainAlert,
} from '@mobazha/core';
import { cn } from '@/lib/utils';
import { SourcingFeatureGuard } from '../SourcingFeatureGuard';

type StatusFilter = 'all' | 'synced' | 'pending' | 'error' | 'drift';

type KnownStatus = 'synced' | 'pending' | 'error' | 'drift';

const STATUS_CONFIG: Record<
  KnownStatus,
  {
    icon: typeof CheckCircle2;
    className: string;
    label: string;
  }
> = {
  synced: {
    icon: CheckCircle2,
    className: 'text-primary bg-primary/10',
    label: 'admin.sourcing.statusSynced',
  },
  pending: {
    icon: Clock,
    className: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
    label: 'admin.sourcing.statusPending',
  },
  error: {
    icon: AlertCircle,
    className: 'text-destructive bg-destructive/10',
    label: 'admin.sourcing.statusError',
  },
  drift: {
    // Use the shared "amber" warning palette already used by status=pending —
    // theme tokens (text-amber-* / bg-amber-*) keep dark mode legible. Raw
    // tailwind orange-* hardcodes the hue and breaks brand theming.
    icon: TrendingUp,
    className: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40',
    label: 'admin.sourcing.statusDrift',
  },
};

function getStatusConfig(status: string) {
  return status in STATUS_CONFIG ? STATUS_CONFIG[status as KnownStatus] : STATUS_CONFIG.pending;
}

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

function ProductRow({
  product,
  listing,
  hasDrift,
  onResync,
}: {
  product: SyncedProduct;
  listing?: ProductListItem;
  hasDrift: boolean;
  onResync: (product: SyncedProduct) => void;
}) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const effectiveStatus = hasDrift && product.status === 'synced' ? 'drift' : product.status;
  const config = getStatusConfig(effectiveStatus);
  const StatusIcon = config.icon;
  // Fulfillment providers price in USD only (Printful, Printify); when per-mapping
  // currency lands on SyncedProduct switch this default to product.currency.
  const currency = 'USD';
  const listingPrice = priceToDisplayAmount(listing);
  const retailDisplay = listingPrice
    ? formatPrice(listingPrice.amount, listingPrice.currency)
    : product.retailPrice
      ? formatPrice(parseFloat(product.retailPrice) / 100, currency)
      : '—';
  const costDisplay = product.supplierCost
    ? formatPrice(parseFloat(product.supplierCost) / 100, currency)
    : '—';
  const thumbnailHash =
    listing?.thumbnail?.small || listing?.thumbnail?.tiny || listing?.thumbnail?.original;
  const thumbnailUrl = thumbnailHash
    ? getImageUrl(thumbnailHash)
    : getImageUrl(product.thumbnailUrl);
  const displayName = listing?.title || product.title || product.listingSlug;

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0 hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            {hasDrift && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                <TrendingUp className="w-2.5 h-2.5" />
                {t('admin.sourcing.driftBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {FULFILLMENT_PROVIDERS.find(fp => fp.id === product.providerId)?.name ||
              product.providerId}
          </p>
        </div>
      </div>

      {/* Price info */}
      <div className="hidden sm:flex items-center gap-6 shrink-0 mx-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t('admin.sourcing.cost')}</p>
          <p
            className={cn(
              'text-sm',
              hasDrift ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-foreground'
            )}
          >
            {costDisplay}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t('admin.sourcing.retail')}</p>
          <p className="text-sm font-medium text-foreground">{retailDisplay}</p>
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full', config.className)}
        >
          <StatusIcon className="w-3 h-3" />
          {t(config.label)}
        </span>
        <div className="flex items-center gap-1 ml-2">
          {product.status === 'error' && (
            <button
              onClick={() => onResync(product)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title={t('admin.sourcing.resync')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {product.listingSlug && (
            <Link
              href={buildProductHref(product.listingSlug, listing?.vendorPeerID)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title={t('admin.sourcing.viewListing')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSourcingProductsPage() {
  return (
    <SourcingFeatureGuard>
      <AdminSourcingProductsContent />
    </SourcingFeatureGuard>
  );
}

function AdminSourcingProductsContent() {
  const { t } = useI18n();
  const { listings: myListings } = useMyListings();
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<FulfillmentProviderID | 'all'>('all');
  const [products, setProducts] = useState<SyncedProduct[]>([]);
  const [alerts, setAlerts] = useState<SupplyChainAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const listingsBySlug = useMemo(
    () => new Map(myListings.map(listing => [listing.slug, listing])),
    [myListings]
  );

  useEffect(() => {
    (async () => {
      try {
        const [conns, activeAlerts] = await Promise.all([
          fulfillmentApi.getFulfillmentProviders(),
          fulfillmentApi.getAlerts({ dismissed: false }).catch(() => [] as SupplyChainAlert[]),
        ]);
        setConnections(conns);
        setAlerts(activeAlerts);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      if (selectedProvider !== 'all') {
        const items = await fulfillmentApi.getSyncedProducts(selectedProvider);
        setProducts(items);
      } else {
        const connected = connections.filter(c => c.status === 'connected');
        const perProvider = await Promise.all(
          connected.map(c =>
            fulfillmentApi.getSyncedProducts(c.providerId).catch(() => [] as SyncedProduct[])
          )
        );
        setProducts(perProvider.flat());
      }
    } finally {
      setProductsLoading(false);
    }
  }, [selectedProvider, connections]);

  useEffect(() => {
    if (!loading) {
      fetchProducts();
    }
  }, [loading, fetchProducts]);

  const handleResync = async (product: SyncedProduct) => {
    try {
      await fulfillmentApi.syncProduct(product.listingSlug);
      fetchProducts();
    } catch {
      // Error handled by API layer
    }
  };

  const driftSlugs = useMemo(() => {
    // Backend emits two related alert types for cost movement:
    //   - price_drift: poll-based detector noticing variant cost drifted past threshold
    //   - product_changed: webhook-driven cost-change notification
    // Both indicate "supplier price has moved relative to the import baseline",
    // which is exactly what this UI surfaces. Filtering on price_drift alone
    // hid all webhook-driven drifts, leaving the banner permanently empty.
    const slugs = new Set<string>();
    for (const a of alerts) {
      if (!a.listingSlug) continue;
      if (a.alertType === 'price_drift' || a.alertType === 'product_changed') {
        slugs.add(a.listingSlug);
      }
    }
    return slugs;
  }, [alerts]);

  const connectedProviders = connections.filter(c => c.status === 'connected');

  const preferCatalogCTA = useMemo(() => {
    if (selectedProvider !== 'all') {
      const info = FULFILLMENT_PROVIDERS.find(fp => fp.id === selectedProvider);
      return info?.workflow === 'catalog';
    }
    return connectedProviders.some(c => {
      const info = FULFILLMENT_PROVIDERS.find(fp => fp.id === c.providerId);
      return info?.workflow === 'catalog';
    });
  }, [selectedProvider, connectedProviders]);

  const filteredProducts = useMemo(() => {
    if (statusFilter === 'drift') {
      return products.filter(p => driftSlugs.has(p.listingSlug));
    }
    return statusFilter === 'all' ? products : products.filter(p => p.status === statusFilter);
  }, [statusFilter, products, driftSlugs]);

  const driftCount = products.filter(p => driftSlugs.has(p.listingSlug)).length;

  const statusCounts: Record<StatusFilter, number> = {
    all: products.length,
    synced: products.filter(p => p.status === 'synced').length,
    pending: products.filter(p => p.status === 'pending').length,
    error: products.filter(p => p.status === 'error').length,
    drift: driftCount,
  };

  return (
    <div data-testid="admin-sourcing-products">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/admin/sourcing"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('admin.sourcing.title')}
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium">
          {t('admin.sourcing.importedProducts')}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('admin.sourcing.importedProducts')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('admin.sourcing.importedProductsPageDesc')}
          </p>
        </div>
        {connectedProviders.length > 0 && (
          <select
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value as FulfillmentProviderID | 'all')}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground"
          >
            <option value="all">{t('admin.sourcing.allProviders')}</option>
            {connectedProviders.map(conn => {
              const p = FULFILLMENT_PROVIDERS.find(fp => fp.id === conn.providerId);
              return (
                <option key={conn.providerId} value={conn.providerId}>
                  {p?.name || conn.providerId}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Price drift banner */}
      {driftCount > 0 && statusFilter !== 'drift' && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
          <p className="text-sm text-amber-900 dark:text-amber-200 flex-1">
            {t(
              driftCount === 1 ? 'admin.sourcing.driftBanner' : 'admin.sourcing.driftBanner_plural',
              { count: driftCount }
            )}
          </p>
          <button
            onClick={() => setStatusFilter('drift')}
            className="text-xs font-medium text-amber-800 dark:text-amber-200 hover:underline shrink-0"
          >
            {t('admin.sourcing.reviewPricing')}
          </button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border overflow-x-auto">
        {(
          [
            'all',
            'synced',
            'pending',
            'error',
            ...(driftCount > 0 ? ['drift' as const] : []),
          ] as StatusFilter[]
        ).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
              statusFilter === status
                ? status === 'drift'
                  ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`admin.sourcing.filter${status.charAt(0).toUpperCase() + status.slice(1)}`)}
            <span className="ml-1.5 text-xs text-muted-foreground">({statusCounts[status]})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading || productsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">
            {t('admin.sourcing.noImportedProducts')}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('admin.sourcing.noImportedProductsDesc')}
          </p>
          <Link
            href={preferCatalogCTA ? '/admin/sourcing/catalog' : '/admin/sourcing/designs'}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            {preferCatalogCTA ? t('admin.sourcing.browseCatalog') : t('admin.sourcing.myDesigns')}
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filteredProducts.map(product => (
            <ProductRow
              key={product.id}
              product={product}
              listing={listingsBySlug.get(product.listingSlug)}
              hasDrift={driftSlugs.has(product.listingSlug)}
              onResync={handleResync}
            />
          ))}
        </div>
      )}
    </div>
  );
}
