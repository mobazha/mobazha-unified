'use client';

/**
 * FeaturedProductsSection — PG-201
 *
 * Displays a curated or auto-selected grid of product cards.
 * Fetches products on mount based on mode (manual slugs, newest, popular).
 */

import { useEffect, useState, useCallback } from 'react';
import type { FeaturedProductsProps, ProductListItem } from '@mobazha/core';
import { productDataService, getImageUrl, useI18n, useCurrencyFormat } from '@mobazha/core';

interface Props extends FeaturedProductsProps {
  peerId: string;
}

const COL_CLASS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const PREVIEW_PEER = 'preview';

export function FeaturedProductsSection({
  title,
  mode,
  productSlugs,
  count,
  columns,
  peerId,
}: Props) {
  const { t } = useI18n();
  const { formatLocalPrice } = useCurrencyFormat();
  const isPreview = peerId === PREVIEW_PEER;
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(!isPreview);

  const fetchProducts = useCallback(async () => {
    if (isPreview) return;
    setIsLoading(true);
    try {
      const all = await productDataService.getStoreListings(peerId);
      let items = all || [];

      if (mode === 'manual' && productSlugs?.length) {
        const slugSet = new Set(productSlugs);
        items = items.filter(p => slugSet.has(p.slug));
      } else {
        items = items.slice(0, count || 4);
      }

      setProducts(items);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [peerId, mode, productSlugs, count, isPreview]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const colClass = COL_CLASS[columns] || COL_CLASS[4];

  return (
    <div>
      {title && (
        <h2
          className="mb-6 text-2xl font-bold text-foreground"
          style={{ fontFamily: 'var(--store-font)' }}
        >
          {title}
        </h2>
      )}
      {isPreview ? (
        <div className={`grid gap-4 ${colClass}`}>
          {Array.from({ length: count || 4 }).map((_, i) => (
            <div
              key={i}
              className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30"
            >
              <span className="text-xs text-muted-foreground">
                {t('admin.storeBranding.sectionFeatured')}
              </span>
            </div>
          ))}
        </div>
      ) : isLoading ? (
        <div className={`grid gap-4 ${colClass}`}>
          {Array.from({ length: count || 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-lg bg-muted animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? null : (
        <div className={`grid gap-4 ${colClass}`}>
          {products.map(product => (
            <a
              key={product.slug}
              href={`/product/${product.slug}?peerID=${peerId}`}
              className="group overflow-hidden transition-shadow hover:shadow-lg"
              style={{ borderRadius: 'var(--store-radius)' }}
            >
              <div className="aspect-square bg-muted">
                {product.thumbnail && (
                  <img
                    src={getImageUrl(product.thumbnail?.medium, peerId)}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-3">
                <h3
                  className="truncate text-sm font-medium"
                  style={{ fontFamily: 'var(--store-font)' }}
                >
                  {product.title}
                </h3>
                {product.price && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatLocalPrice(
                      Number(product.price.amount || 0),
                      product.price.currency?.code || 'USD',
                      { divisibility: product.price.currency?.divisibility }
                    )}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
