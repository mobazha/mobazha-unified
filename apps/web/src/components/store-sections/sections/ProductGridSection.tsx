'use client';

/**
 * ProductGridSection — PG-201
 *
 * Full product catalog with optional filters and search.
 * This is a simplified version; the store page's existing product tab
 * will be reused for full functionality.
 */

import { useEffect, useState, useCallback } from 'react';
import type { ProductGridProps, ProductListItem } from '@mobazha/core';
import { productDataService, getImageUrl } from '@mobazha/core';

interface Props extends ProductGridProps {
  peerId: string;
}

const COL_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export function ProductGridSection({ title, showSearch, columns, peerId }: Props) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await productDataService.getStoreListings(peerId);
      setProducts(items || []);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [peerId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const colClass = COL_CLASS[columns] || COL_CLASS[4];
  const filtered = search
    ? products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : products;

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
            placeholder="Search products..."
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
      {isLoading ? (
        <div className={`grid gap-4 ${colClass}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm opacity-50">
          {search ? 'No products match your search' : 'No products available'}
        </p>
      ) : (
        <div className={`grid gap-4 ${colClass}`}>
          {filtered.map(product => (
            <a
              key={product.slug}
              href={`/store/${peerId}/products/${product.slug}`}
              className="group overflow-hidden border border-gray-200 transition-shadow hover:shadow-lg dark:border-gray-700"
              style={{ borderRadius: 'var(--store-radius)' }}
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                {product.thumbnail && (
                  <img
                    src={getImageUrl(product.thumbnail?.medium)}
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
                  <p className="mt-1 text-sm opacity-70">
                    {product.price.currency?.code} {product.price.amount}
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
