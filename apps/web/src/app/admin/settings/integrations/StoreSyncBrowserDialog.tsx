'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Package, Palette, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n, fulfillmentApi } from '@mobazha/core';
import type { StoreSyncProduct, StoreSyncPage } from '@mobazha/core';
import { SyncProductImportPanel } from './SyncProductImportPanel';

interface StoreSyncBrowserDialogProps {
  providerID: string;
  providerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoreSyncBrowserDialog({
  providerID,
  providerName,
  open,
  onOpenChange,
}: StoreSyncBrowserDialogProps) {
  const { t } = useI18n();

  const [products, setProducts] = useState<StoreSyncProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<StoreSyncProduct | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const LIMIT = 20;

  const fetchProducts = useCallback(
    async (pageOffset: number) => {
      try {
        setLoading(true);
        const page: StoreSyncPage = await fulfillmentApi.getStoreSyncProducts(providerID, {
          offset: pageOffset,
          limit: LIMIT,
        });
        setProducts(pageOffset === 0 ? page.products : prev => [...prev, ...page.products]);
        setTotal(page.total);
        setOffset(pageOffset);
      } catch {
        // user can retry by reopening
      } finally {
        setLoading(false);
      }
    },
    [providerID]
  );

  useEffect(() => {
    if (open) {
      setProducts([]);
      setSelectedProduct(null);
      fetchProducts(0);
    }
  }, [open, fetchProducts]);

  const handleLoadMore = useCallback(() => {
    fetchProducts(offset + LIMIT);
  }, [fetchProducts, offset]);

  const handleSelectProduct = useCallback(
    async (summary: StoreSyncProduct) => {
      try {
        setLoading(true);
        setFetchError(null);
        const detail = await fulfillmentApi.getStoreSyncProduct(providerID, summary.id);
        setSelectedProduct(detail);
      } catch (err) {
        console.error('Failed to fetch sync product detail:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load product details';
        setFetchError(msg);
      } finally {
        setLoading(false);
      }
    },
    [providerID]
  );

  const handleImportSuccess = useCallback((productId: string) => {
    setImportedIds(prev => new Set(prev).add(productId));
    setSelectedProduct(null);
  }, []);

  if (selectedProduct) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <Package className="w-5 h-5" />
              </button>
              <DialogTitle>{t('admin.fulfillment.importDesign')}</DialogTitle>
            </div>
          </DialogHeader>
          <SyncProductImportPanel
            providerID={providerID}
            product={selectedProduct}
            onSuccess={() => handleImportSuccess(selectedProduct.id)}
            onCancel={() => setSelectedProduct(null)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {providerName} — {t('admin.fulfillment.myDesigns')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.fulfillment.myDesignsDesc')}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {fetchError && (
            <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm mb-2">
              {fetchError}
            </div>
          )}
          {loading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">{t('admin.fulfillment.catalogLoading')}</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Palette className="w-8 h-8 mb-2" />
              <span className="font-medium">{t('admin.fulfillment.noDesigns')}</span>
              <span className="text-sm mt-1">{t('admin.fulfillment.noDesignsDesc')}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2">
                {products.map(product => {
                  const isImported = importedIds.has(product.id);

                  return (
                    <button
                      key={product.id}
                      onClick={() => !isImported && handleSelectProduct(product)}
                      disabled={isImported}
                      className="group relative rounded-lg border p-2 text-left hover:border-primary/50 hover:shadow-sm transition-all disabled:opacity-60"
                    >
                      {isImported && (
                        <div className="absolute top-1 right-1 z-10">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                      <div className="aspect-square rounded-md bg-muted mb-2 overflow-hidden">
                        {product.thumbnailUrl ? (
                          <img
                            src={product.thumbnailUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Palette className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium line-clamp-2 leading-tight">
                        {product.name}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {t('admin.fulfillment.catalogVariants', {
                            count: String(product.variantCount),
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {products.length < total && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('admin.fulfillment.loadMore', {
                      loaded: String(products.length),
                      total: String(total),
                    })}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
