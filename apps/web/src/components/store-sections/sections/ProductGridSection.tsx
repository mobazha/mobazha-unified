'use client';

/**
 * ProductGridSection — PG-201
 *
 * Full product catalog with optional filters and search.
 * Uses React Query via useStoreListings for cache-first data loading.
 */

import { useState, useMemo } from 'react';
import type { ProductGridProps } from '@mobazha/core';
import {
  useStoreListings,
  usePrefetchProduct,
  getImageUrl,
  useI18n,
  useCurrencyFormat,
  buildProductHref,
} from '@mobazha/core';

interface Props extends ProductGridProps {
  peerId: string;
}

const COL_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

const PREVIEW_PEER = 'preview';

export function ProductGridSection({ title, showSearch, columns, peerId }: Props) {
  const isPreview = peerId === PREVIEW_PEER;
  const { listings, isLoading } = useStoreListings(isPreview ? null : peerId);
  const prefetch = usePrefetchProduct();
  const [search, setSearch] = useState('');
  const { t } = useI18n();
  const { formatLocalPrice } = useCurrencyFormat();

  const colClass = COL_CLASS[columns] || COL_CLASS[4];
  const filtered = useMemo(
    () =>
      search
        ? listings.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
        : listings,
    [listings, search]
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        {title && (
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--store-font)', color: 'var(--store-primary)' }}
          >
            {title}
          </h2>
        )}
        {showSearch && (
          <input
            type="text"
            placeholder={t('admin.storeBranding.searchProducts')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              borderRadius: 'var(--store-radius)',
              fontFamily: 'var(--store-font)',
            }}
          />
        )}
      </div>
      {isPreview || isLoading ? (
        <div className={`grid gap-4 ${colClass}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm opacity-50">
          {search
            ? t('admin.storeBranding.noProductsMatch')
            : t('admin.storeBranding.noProductsAvailable')}
        </p>
      ) : (
        <div className={`grid gap-4 ${colClass}`}>
          {filtered.map(product => (
            <a
              key={product.slug}
              href={buildProductHref(product.slug, peerId)}
              className="group overflow-hidden border border-border transition-shadow hover:shadow-lg"
              style={{ borderRadius: 'var(--store-radius)' }}
              onMouseEnter={() => prefetch(product.slug, peerId)}
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
