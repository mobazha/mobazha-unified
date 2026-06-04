'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildSupplySummaryView,
  digitalAssetsApi,
  sumListingSkuQuantity,
  type ContractType,
  type LicensePoolListHint,
  type ListingSupplySummaryItem,
  type ProductListItem,
  type SkuItem,
  type SupplySummaryView,
} from '@mobazha/core';
import { productsApi } from '@mobazha/core/services/api';
import { useSyncedListingProviders } from './useSyncedListingProviders';

interface UseListingSupplySummaryOptions {
  listingSlug: string;
  contractType: ContractType;
  skus: SkuItem[];
  enabled?: boolean;
}

export function useListingSupplySummary({
  listingSlug,
  contractType,
  skus,
  enabled = true,
}: UseListingSupplySummaryOptions) {
  const { getProvider } = useSyncedListingProviders();
  const [licenseHint, setLicenseHint] = useState<LicensePoolListHint | null>(null);
  const [hasDigitalAssets, setHasDigitalAssets] = useState<boolean | null>(null);
  const [apiSummary, setApiSummary] = useState<ListingSupplySummaryItem | undefined>();
  const [loading, setLoading] = useState(true);
  const isDigital = enabled && contractType === 'DIGITAL_GOOD';

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const resp = await productsApi.getListingSupplySummary({
          slugs: [listingSlug],
          limit: 1,
          offset: 0,
        });
        if (!cancelled) {
          setApiSummary(resp.items?.find(item => item.listingSlug === listingSlug));
        }
      } catch {
        if (!cancelled) setApiSummary(undefined);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingSlug, enabled]);

  useEffect(() => {
    if (!isDigital) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const assets = await digitalAssetsApi.listAssets(listingSlug);
        if (cancelled) return;
        const hasAssets = assets.length > 0;
        setHasDigitalAssets(hasAssets);
        const hasLicenseAsset = assets.some(a => a.assetType === 'license_key');
        if (!hasLicenseAsset) {
          setLicenseHint({ hasPool: false });
          return;
        }
        const stats = await digitalAssetsApi.getLicenseKeyPoolStats(listingSlug);
        if (cancelled) return;
        setLicenseHint({
          hasPool: true,
          available: stats.available,
          total: stats.total,
          dispensed: stats.dispensed,
        });
      } catch {
        if (!cancelled) {
          setHasDigitalAssets(null);
          setLicenseHint({ hasPool: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingSlug, isDigital]);

  const product = useMemo((): ProductListItem => {
    const quantity = contractType === 'PHYSICAL_GOOD' ? sumListingSkuQuantity(skus) : undefined;
    return {
      slug: listingSlug,
      title: '',
      thumbnail: { tiny: '', small: '', medium: '', large: '', original: '' },
      price: { amount: 0, currency: { code: 'USD', divisibility: 2 } },
      vendorPeerID: '',
      contractType,
      quantity,
    };
  }, [listingSlug, contractType, skus]);

  const displayApiSummary = enabled ? apiSummary : undefined;
  const displayLicenseHint = isDigital ? licenseHint : null;
  const displayHasDigitalAssets = isDigital ? hasDigitalAssets : null;
  const displayLoading = enabled ? loading : false;

  const context = useMemo(
    () => ({
      product,
      syncedProvider: getProvider(listingSlug),
      licenseHint: displayLicenseHint,
      hasDigitalAssets: displayHasDigitalAssets,
      summary: displayApiSummary,
    }),
    [
      product,
      getProvider,
      listingSlug,
      displayLicenseHint,
      displayHasDigitalAssets,
      displayApiSummary,
    ]
  );

  const summary: SupplySummaryView = useMemo(() => buildSupplySummaryView(context), [context]);

  return { context, summary, loading: displayLoading };
}
