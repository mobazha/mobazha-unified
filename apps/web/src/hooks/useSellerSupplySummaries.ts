'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { productsApi } from '@mobazha/core/services/api';
import type { ListingSupplySummaryItem, ProductListItem } from '@mobazha/core';

const BATCH_SIZE = 50;
const MAX_CONCURRENT_BATCHES = 2;
const EMPTY_SUMMARIES = new Map<string, ListingSupplySummaryItem>();

function summaryKey(item: ListingSupplySummaryItem): string {
  return [
    item.listingSlug,
    item.supplyMode,
    item.status,
    item.availableQuantity ?? '',
    item.onHandQuantity ?? '',
    item.heldQuantity ?? '',
    item.manualActionRequired === true ? '1' : '0',
    item.reason ?? '',
  ].join(':');
}

function embeddedSummariesFromProducts(
  products: ProductListItem[]
): Map<string, ListingSupplySummaryItem> {
  const result = new Map<string, ListingSupplySummaryItem>();
  for (const product of products) {
    const summary = product.supplySummary;
    if (!summary) continue;
    const slug = summary.listingSlug || product.slug;
    if (slug) result.set(slug, { ...summary, listingSlug: slug });
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
  const embeddedSummaries = useMemo(() => embeddedSummariesFromProducts(products), [products]);
  const embeddedKey = useMemo(
    () => Array.from(embeddedSummaries.values()).map(summaryKey).join('\0'),
    [embeddedSummaries]
  );
  const missingSlugs = useMemo(
    () => slugs.filter(slug => !embeddedSummaries.has(slug)),
    [embeddedSummaries, slugKey, slugs]
  );
  const missingSlugKey = missingSlugs.join('\0');
  const [summaries, setSummaries] = useState<Map<string, ListingSupplySummaryItem>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || slugs.length === 0 || missingSlugs.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const missingSet = new Set(missingSlugs);
      setSummaries(prev => {
        const next = new Map<string, ListingSupplySummaryItem>();
        for (const [slug, summary] of prev) {
          if (missingSet.has(slug)) next.set(slug, summary);
        }
        return next;
      });
      try {
        const batches: string[][] = [];
        for (let i = 0; i < missingSlugs.length; i += BATCH_SIZE) {
          batches.push(missingSlugs.slice(i, i + BATCH_SIZE));
        }
        let cursor = 0;
        const worker = async () => {
          while (!cancelled && cursor < batches.length) {
            const batch = batches[cursor++];
            try {
              const resp = await productsApi.getListingSupplySummary({
                slugs: batch,
                limit: BATCH_SIZE,
                offset: 0,
              });
              if (cancelled) return;
              setSummaries(prev => {
                const next = new Map(prev);
                for (const item of resp.items ?? []) {
                  if (item.listingSlug) next.set(item.listingSlug, item);
                }
                return next;
              });
            } catch {
              // Keep successful batches; callers can fall back per product.
            }
          }
        };
        const workerCount = Math.min(MAX_CONCURRENT_BATCHES, batches.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
      } catch {
        // Keep any summaries already loaded incrementally.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missingSlugKey, missingSlugs, refreshVersion, enabled, slugs.length]);

  const activeSummaries = useMemo(() => {
    if (!enabled || slugs.length === 0) return EMPTY_SUMMARIES;
    const combined = new Map(summaries);
    for (const [slug, summary] of embeddedSummaries) {
      combined.set(slug, summary);
    }
    return combined;
  }, [embeddedKey, embeddedSummaries, enabled, slugKey, slugs.length, summaries]);
  const activeLoading = enabled && slugs.length > 0 ? loading : false;

  const getSummary = useCallback(
    (slug: string): ListingSupplySummaryItem | undefined => activeSummaries.get(slug),
    [activeSummaries]
  );

  return { getSummary, summaries: activeSummaries, loading: activeLoading };
}
