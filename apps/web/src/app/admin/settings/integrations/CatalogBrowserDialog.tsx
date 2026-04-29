'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Loader2, Package, ChevronLeft, X, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n, fulfillmentApi } from '@mobazha/core';
import type { CatalogProduct, CatalogPage } from '@mobazha/core';
import { ProductImportPanel } from './ProductImportPanel';

interface CatalogBrowserDialogProps {
  providerID: string;
  providerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogBrowserDialog({
  providerID,
  providerName,
  open,
  onOpenChange,
}: CatalogBrowserDialogProps) {
  const { t } = useI18n();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [importedSlugs, setImportedSlugs] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const LIMIT = 20;

  const fetchCatalog = useCallback(
    async (searchTerm: string, pageOffset: number) => {
      try {
        setLoading(true);
        const page: CatalogPage = await fulfillmentApi.getFulfillmentCatalog(providerID, {
          search: searchTerm || undefined,
          offset: pageOffset,
          limit: LIMIT,
        });
        setProducts(pageOffset === 0 ? page.products : prev => [...prev, ...page.products]);
        setTotal(page.total);
        setOffset(pageOffset);
      } catch {
        // silently handle — user can retry
      } finally {
        setLoading(false);
      }
    },
    [providerID]
  );

  useEffect(() => {
    if (open) {
      fetchCatalog('', 0);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [open, fetchCatalog]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        setProducts([]);
        fetchCatalog(value, 0);
      }, 400);
    },
    [fetchCatalog]
  );

  const handleLoadMore = useCallback(() => {
    fetchCatalog(search, offset + LIMIT);
  }, [fetchCatalog, search, offset]);

  const handleImportSuccess = useCallback((slug: string) => {
    setImportedSlugs(prev => new Set(prev).add(slug));
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
                <ChevronLeft className="w-5 h-5" />
              </button>
              <DialogTitle>{t('admin.fulfillment.importTitle')}</DialogTitle>
            </div>
          </DialogHeader>
          <ProductImportPanel
            providerID={providerID}
            product={selectedProduct}
            onSuccess={handleImportSuccess}
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
            {providerName} — {t('admin.fulfillment.catalogTitle')}
          </DialogTitle>
        </DialogHeader>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={t('admin.fulfillment.catalogSearch')}
            className="w-full pl-9 pr-8 py-2 rounded-md border bg-background text-sm"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">{t('admin.fulfillment.catalogLoading')}</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="w-8 h-8 mb-2" />
              <span className="font-medium">{t('admin.fulfillment.catalogEmpty')}</span>
              <span className="text-sm mt-1">{t('admin.fulfillment.catalogEmptyDesc')}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2">
                {products.map(product => {
                  const isImported = importedSlugs.has(product.id);
                  const prices = product.variants.map(v => parseFloat(v.price) || 0);
                  const lowestPrice = prices.length ? Math.min(...prices) : 0;
                  const currency = product.currency ?? product.variants[0]?.currency ?? 'USD';

                  return (
                    <button
                      key={product.id}
                      onClick={() => !isImported && setSelectedProduct(product)}
                      disabled={isImported}
                      className="group relative rounded-lg border p-2 text-left hover:border-primary/50 hover:shadow-sm transition-all disabled:opacity-60"
                    >
                      {isImported && (
                        <div className="absolute top-1 right-1 z-10">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                      <div className="aspect-square rounded-md bg-muted mb-2 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium line-clamp-2 leading-tight">
                        {product.title}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {t('admin.fulfillment.catalogVariants', {
                            count: String(product.variants.length),
                          })}
                        </span>
                        {lowestPrice > 0 && (
                          <span className="text-xs font-medium">
                            {t('admin.fulfillment.catalogPrice', {
                              price: `${lowestPrice.toFixed(2)} ${currency}`,
                            })}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Load more */}
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
