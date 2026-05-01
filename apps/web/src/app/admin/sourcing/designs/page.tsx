'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Package, Download } from 'lucide-react';
import { useI18n, fulfillmentApi, FULFILLMENT_PROVIDERS } from '@mobazha/core';
import type { StoreSyncProduct, ProviderConnection, FulfillmentProviderID } from '@mobazha/core';
import { SourcingFeatureGuard } from '../SourcingFeatureGuard';

function DesignCard({ product, providerID }: { product: StoreSyncProduct; providerID: string }) {
  const { t } = useI18n();
  const isImported = !!product.importedListingSlug;

  return (
    <Link
      href={`/admin/sourcing/import/design/${providerID}/${product.id}`}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors group block"
    >
      <div className="aspect-square bg-muted relative">
        {product.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {isImported && (
          <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {t('admin.sourcing.imported')}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1">{product.name}</h3>
        <p className="text-xs text-muted-foreground mb-2">
          {product.variantCount} {t('admin.sourcing.variants')}
        </p>
        <div className="flex items-center justify-end">
          {!isImported && (
            <span className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
              <Download className="w-3 h-3" />
              {t('admin.sourcing.import')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function AdminSourcingDesignsPage() {
  return (
    <SourcingFeatureGuard>
      <AdminSourcingDesignsContent />
    </SourcingFeatureGuard>
  );
}

function AdminSourcingDesignsContent() {
  const { t } = useI18n();
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<FulfillmentProviderID | ''>('');
  const [designs, setDesigns] = useState<StoreSyncProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [designsLoading, setDesignsLoading] = useState(false);

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

  const fetchDesigns = useCallback(async () => {
    if (!selectedProvider) return;
    try {
      setDesignsLoading(true);
      const page = await fulfillmentApi.getStoreSyncProducts(selectedProvider);
      setDesigns(page.products);
    } finally {
      setDesignsLoading(false);
    }
  }, [selectedProvider]);

  useEffect(() => {
    if (selectedProvider) {
      fetchDesigns();
    }
  }, [selectedProvider, fetchDesigns]);

  const connectedProviders = connections.filter(c => c.status === 'connected');

  return (
    <div data-testid="admin-sourcing-designs">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/admin/sourcing"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('admin.sourcing.title')}
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium">{t('admin.sourcing.myDesigns')}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('admin.sourcing.myDesigns')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('admin.sourcing.myDesignsPageDesc')}
          </p>
        </div>
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
      </div>

      {/* Content */}
      {loading || designsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : connectedProviders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">{t('admin.sourcing.noProviders')}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('admin.sourcing.connectToSeeDesigns')}
          </p>
          <Link
            href="/admin/settings/integrations"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            {t('admin.sourcing.connectProvider')}
          </Link>
        </div>
      ) : designs.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">{t('admin.sourcing.noDesigns')}</p>
          <p className="text-sm text-muted-foreground">{t('admin.sourcing.noDesignsDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {designs.map(product => (
            <DesignCard key={product.id} product={product} providerID={selectedProvider} />
          ))}
        </div>
      )}
    </div>
  );
}
