'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Package,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useI18n, fulfillmentApi, FULFILLMENT_PROVIDERS } from '@mobazha/core';
import type { SyncedProduct, ProviderConnection, FulfillmentProviderID } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { SourcingFeatureGuard } from '../SourcingFeatureGuard';

type StatusFilter = 'all' | 'synced' | 'pending' | 'error';

type KnownStatus = 'synced' | 'pending' | 'error';

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
};

function getStatusConfig(status: string) {
  return status in STATUS_CONFIG ? STATUS_CONFIG[status as KnownStatus] : STATUS_CONFIG.pending;
}

function ProductRow({
  product,
  onResync,
}: {
  product: SyncedProduct;
  onResync: (product: SyncedProduct) => void;
}) {
  const { t } = useI18n();
  const config = getStatusConfig(product.status);
  const StatusIcon = config.icon;
  const retailDisplay = product.retailPrice
    ? `$${(parseFloat(product.retailPrice) / 100).toFixed(2)}`
    : '—';
  const costDisplay = product.supplierCost
    ? `$${(parseFloat(product.supplierCost) / 100).toFixed(2)}`
    : '—';

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0 hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {product.thumbnailUrl ? (
            <img src={product.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {product.title || product.listingSlug}
          </p>
          <p className="text-xs text-muted-foreground">{product.providerId}</p>
        </div>
      </div>

      {/* Price info */}
      <div className="hidden sm:flex items-center gap-6 shrink-0 mx-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t('admin.sourcing.cost')}</p>
          <p className="text-sm text-foreground">{costDisplay}</p>
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
              href={`/product/${product.listingSlug}`}
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
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<FulfillmentProviderID | 'all'>('all');
  const [products, setProducts] = useState<SyncedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    (async () => {
      try {
        const conns = await fulfillmentApi.getFulfillmentProviders();
        setConnections(conns);
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

  const connectedProviders = connections.filter(c => c.status === 'connected');

  const filteredProducts =
    statusFilter === 'all' ? products : products.filter(p => p.status === statusFilter);

  const statusCounts = {
    all: products.length,
    synced: products.filter(p => p.status === 'synced').length,
    pending: products.filter(p => p.status === 'pending').length,
    error: products.filter(p => p.status === 'error').length,
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

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {(['all', 'synced', 'pending', 'error'] as StatusFilter[]).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              statusFilter === status
                ? 'border-primary text-primary'
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
            href="/admin/sourcing/designs"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            {t('admin.sourcing.myDesigns')}
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filteredProducts.map(product => (
            <ProductRow key={product.id} product={product} onResync={handleResync} />
          ))}
        </div>
      )}
    </div>
  );
}
