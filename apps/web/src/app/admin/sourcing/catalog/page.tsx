'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2, Package, ExternalLink, Info } from 'lucide-react';
import { useI18n, fulfillmentApi, FULFILLMENT_PROVIDERS, useCurrency } from '@mobazha/core';
import type { CatalogProduct, ProviderConnection, FulfillmentProviderID } from '@mobazha/core';
import { SourcingFeatureGuard } from '../SourcingFeatureGuard';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function CatalogProductCard({
  product,
  providerID,
}: {
  product: CatalogProduct;
  providerID: string;
}) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const variants = product.variants ?? [];
  const currencyCode = product.currency ?? variants[0]?.currency ?? 'USD';
  const priceDisplay = product.minPrice
    ? `${formatPrice(parseFloat(product.minPrice), currencyCode)}+`
    : '';

  return (
    <Link
      href={`/admin/sourcing/import/catalog/${providerID}/${product.id}`}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors group block"
    >
      <div className="aspect-square bg-muted relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1">{product.title}</h3>
        {variants.length > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            {variants.length} {t('admin.sourcing.variants')}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">{priceDisplay}</span>
        </div>
      </div>
    </Link>
  );
}

export default function AdminSourcingCatalogPage() {
  return (
    <SourcingFeatureGuard>
      <AdminSourcingCatalogContent />
    </SourcingFeatureGuard>
  );
}

function AdminSourcingCatalogContent() {
  const { t } = useI18n();
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<FulfillmentProviderID | ''>('');
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const requestIdRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const conns = await fulfillmentApi.getFulfillmentProviders();
        setConnections(conns);
        const connected = conns.find(c => c.status === 'connected');
        if (connected) {
          setSelectedProvider(connected.providerId as FulfillmentProviderID);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchCatalog = useCallback(async () => {
    if (!selectedProvider) return;
    const currentId = ++requestIdRef.current;
    try {
      setCatalog([]);
      setCatalogLoading(true);
      const page = await fulfillmentApi.getFulfillmentCatalog(selectedProvider, {
        search: debouncedSearch || undefined,
      });
      if (currentId !== requestIdRef.current) return;
      setCatalog(page.products);
    } catch {
      if (currentId === requestIdRef.current) {
        setCatalog([]);
      }
    } finally {
      if (currentId === requestIdRef.current) {
        setCatalogLoading(false);
      }
    }
  }, [selectedProvider, debouncedSearch]);

  useEffect(() => {
    if (selectedProvider) {
      fetchCatalog();
    }
  }, [selectedProvider, fetchCatalog]);

  const connectedProviders = connections.filter(c => c.status === 'connected');
  const currentProviderInfo = FULFILLMENT_PROVIDERS.find(fp => fp.id === selectedProvider);
  const providerName = currentProviderInfo?.name || selectedProvider;
  const providerProductsUrl = currentProviderInfo?.productsUrl || '';
  const isPODProvider = currentProviderInfo?.workflow === 'pod';

  return (
    <div data-testid="admin-sourcing-catalog">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/admin/sourcing"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('admin.sourcing.title')}
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium">{t('admin.sourcing.catalog')}</span>
      </div>

      {/* Info Banner — only for POD providers */}
      {isPODProvider && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-info/10 border border-info/30 rounded-xl">
          <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm text-foreground font-medium">
              {t('admin.sourcing.catalogPodNotice')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.sourcing.catalogPodNoticeDesc')}
            </p>
            <div className="flex items-center gap-4 mt-3">
              {providerProductsUrl && (
                <a
                  href={providerProductsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-info hover:text-info/80 transition-colors"
                >
                  {t('admin.sourcing.createDesign', { provider: providerName })}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <Link
                href="/admin/sourcing/designs"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-info hover:text-info/80 transition-colors"
              >
                {t('admin.sourcing.myDesigns')} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header with search and provider selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {t('admin.sourcing.catalogTitle')}
        </h1>
        <div className="flex items-center gap-3">
          {connectedProviders.length > 1 && (
            <select
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value as FulfillmentProviderID)}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground"
            >
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('admin.sourcing.searchCatalog')}
              className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground w-48 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading || catalogLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : connectedProviders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">{t('admin.sourcing.noProviders')}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('admin.sourcing.noProvidersDesc')}
          </p>
          <Link
            href="/admin/settings/integrations?tab=fulfillment"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            {t('admin.sourcing.connectProvider')}
          </Link>
        </div>
      ) : catalog.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">{t('admin.sourcing.noCatalogItems')}</p>
          {providerProductsUrl && (
            <a
              href={providerProductsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              {t('admin.sourcing.goToProviderDashboard', { provider: providerName })}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {catalog.map(product => (
            <CatalogProductCard key={product.id} product={product} providerID={selectedProvider} />
          ))}
        </div>
      )}
    </div>
  );
}
