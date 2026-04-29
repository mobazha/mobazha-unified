'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Package, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useI18n, fulfillmentApi } from '@mobazha/core';
import type { SyncedProduct, FulfillmentProviderID } from '@mobazha/core';

interface SyncedProductsListProps {
  providerID: FulfillmentProviderID;
  providerName: string;
}

export function SyncedProductsList({ providerID, providerName }: SyncedProductsListProps) {
  const { t } = useI18n();
  const [products, setProducts] = useState<SyncedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchSynced = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fulfillmentApi.getSyncedProducts(providerID);
      setProducts(list);
    } catch {
      // silently fail — empty list shown
    } finally {
      setLoading(false);
    }
  }, [providerID]);

  useEffect(() => {
    fetchSynced();
  }, [fetchSynced]);

  const handleSync = useCallback(async (slug: string) => {
    try {
      setSyncing(slug);
      const status = await fulfillmentApi.syncProduct(slug);
      setProducts(prev =>
        prev.map(p =>
          p.listingSlug === slug
            ? { ...p, status: status.status, lastSyncAt: status.lastSyncAt }
            : p
        )
      );
    } catch {
      // silently fail
    } finally {
      setSyncing(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Package className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('admin.fulfillment.noSyncedProducts')}</p>
        <p className="text-xs mt-1">{t('admin.fulfillment.noSyncedProductsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {t('admin.fulfillment.syncedProducts')} ({products.length})
        </h4>
      </div>

      <div className="rounded-md border divide-y">
        {products.map(product => (
          <div key={product.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/listing/edit/${product.listingSlug}?from=admin`}
                  className="text-sm font-medium hover:underline truncate"
                >
                  {product.listingSlug}
                </Link>
                {statusBadge(product.status, t)}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span>
                  {t('admin.fulfillment.syncedCost')}:{' '}
                  {(parseFloat(product.supplierCost) / 100).toFixed(2)}
                </span>
                <span>
                  {t('admin.fulfillment.syncedRetail')}:{' '}
                  {(parseFloat(product.retailPrice) / 100).toFixed(2)}
                </span>
                {product.lastSyncAt && (
                  <span>
                    {t('admin.fulfillment.syncedAt')}:{' '}
                    {new Date(product.lastSyncAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleSync(product.listingSlug)}
                disabled={syncing === product.listingSlug}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={t('admin.fulfillment.syncNow')}
              >
                {syncing === product.listingSlug ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </button>
              <Link
                href={`/product/${product.listingSlug}`}
                target="_blank"
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={t('admin.fulfillment.viewListing')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case 'synced':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {t('admin.fulfillment.statusSynced')}
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          {t('admin.fulfillment.statusPending')}
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="w-3 h-3" />
          {t('admin.fulfillment.statusError')}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
          {status}
        </span>
      );
  }
}
