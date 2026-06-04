'use client';

import { useEffect, useMemo, useState } from 'react';
import { productsApi } from '@mobazha/core/services/api';
import type { ListingSupplySummaryItem, ProductListItem } from '@mobazha/core';

const BATCH_SIZE = 50;
const EMPTY_SUMMARIES = new Map<string, ListingSupplySummaryItem>();

async function loadSummaries(slugs: string[]): Promise<Map<string, ListingSupplySummaryItem>> {
  const result = new Map<string, ListingSupplySummaryItem>();
  for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
    const batch = slugs.slice(i, i + BATCH_SIZE);
    try {
      const resp = await productsApi.getListingSupplySummary({
        slugs: batch,
        limit: BATCH_SIZE,
        offset: 0,
      });
      for (const item of resp.items ?? []) {
        if (item.listingSlug) result.set(item.listingSlug, item);
      }
    } catch {
      // Keep successful batches; callers can fall back per product.
    }
  }
  return result;
}

export function useSellerSupplySummaries(
  products: ProductListItem[],
  refreshVersion = 0,
  enabled = true
) {
  const slugs = useMemo(() => products.map(p => p.slug).filter(Boolean), [products]);
  const slugKey = slugs.join('\0');
  const [summaries, setSummaries] = useState<Map<string, ListingSupplySummaryItem>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || slugs.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const map = await loadSummaries(slugs);
        if (!cancelled) setSummaries(map);
      } catch {
        if (!cancelled) setSummaries(new Map());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugKey, slugs, refreshVersion, enabled]);

  const activeSummaries = enabled && slugs.length > 0 ? summaries : EMPTY_SUMMARIES;
  const activeLoading = enabled && slugs.length > 0 ? loading : false;

  const getSummary = (slug: string): ListingSupplySummaryItem | undefined =>
    activeSummaries.get(slug);

  return { getSummary, summaries: activeSummaries, loading: activeLoading };
}
