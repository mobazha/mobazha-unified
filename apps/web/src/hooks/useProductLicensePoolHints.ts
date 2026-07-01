'use client';

import { useEffect, useMemo, useState } from 'react';
import { digitalAssetsApi } from '@mobazha/core';
import type { LicensePoolListHint } from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';

const CONCURRENCY = 5;
const EMPTY_HINTS = new Map<string, LicensePoolListHint>();

async function mapPoolHint(slug: string): Promise<LicensePoolListHint> {
  try {
    const assets = await digitalAssetsApi.listAssets(slug);
    const hasLicenseAsset = assets.some(a => a.assetType === 'license_key');
    if (!hasLicenseAsset) {
      return { hasPool: false };
    }
    const stats = await digitalAssetsApi.getLicenseKeyPoolStats(slug);
    return {
      hasPool: true,
      available: stats.available,
      total: stats.total,
      dispensed: stats.dispensed,
    };
  } catch {
    return { hasPool: false };
  }
}

async function loadHints(slugs: string[]): Promise<Map<string, LicensePoolListHint>> {
  const result = new Map<string, LicensePoolListHint>();
  for (let i = 0; i < slugs.length; i += CONCURRENCY) {
    const batch = slugs.slice(i, i + CONCURRENCY);
    const entries = await Promise.all(
      batch.map(async slug => [slug, await mapPoolHint(slug)] as const)
    );
    for (const [slug, hint] of entries) {
      result.set(slug, hint);
    }
  }
  return result;
}

/**
 * Phase A: resolve license pool hints for digital listings on the products list.
 */
export function useProductLicensePoolHints(
  products: ProductListItem[],
  refreshVersion = 0,
  enabled = true
) {
  const digitalSlugs = useMemo(
    () => products.filter(p => p.contractType === 'DIGITAL_GOOD').map(p => p.slug),
    [products]
  );
  const slugKey = digitalSlugs.join('\0');
  const [hints, setHints] = useState<Map<string, LicensePoolListHint>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || digitalSlugs.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setHints(prev => {
        const next = new Map(prev);
        for (const slug of digitalSlugs) {
          if (!next.has(slug)) next.set(slug, { hasPool: false, loading: true });
        }
        return next;
      });
      try {
        const map = await loadHints(digitalSlugs);
        if (!cancelled) setHints(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugKey, digitalSlugs, refreshVersion, enabled]);

  const activeHints = enabled && digitalSlugs.length > 0 ? hints : EMPTY_HINTS;
  const activeLoading = enabled && digitalSlugs.length > 0 ? loading : false;

  const getHint = (slug: string): LicensePoolListHint | undefined => {
    const hint = activeHints.get(slug);
    if (!hint)
      return digitalSlugs.includes(slug) ? { hasPool: false, loading: activeLoading } : undefined;
    return { ...hint, loading: activeLoading && hint.loading };
  };

  return { getHint, loading: activeLoading };
}
