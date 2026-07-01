'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useI18n,
  useUserStore,
  useCurrency,
  productDataService,
  useSales,
  useFeature,
} from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { listGuestOrders, type GuestOrderSummary } from '@mobazha/core/services/api/guestCheckout';
import { getOrderCurrencyCode } from '@/components/admin/dashboard';

const REVENUE_STATES = new Set(['COMPLETED', 'SHIPPED', 'PAYMENT_FINALIZED']);

export function useAdminDashboardData() {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const { formatPrice, fromMinimalUnit, localCurrency, convertToLocal } = useCurrency();
  const guestEnabled = useFeature('guestCheckout');
  const supplyAvailabilityEnabled = useFeature('supplyAvailabilityEnabled');

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [guestOrders, setGuestOrders] = useState<GuestOrderSummary[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);

  const {
    orders: salesOrders,
    isLoading: salesLoading,
    error: salesError,
  } = useSales({ limit: 20 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await productDataService.getMyListings({
          includeSupplySummary: supplyAvailabilityEnabled,
        });
        if (!cancelled) setProducts(data);
      } catch (err) {
        if (!cancelled)
          setProductsError(
            err instanceof Error ? err.message : t('admin.dashboard.failedToLoadProducts')
          );
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supplyAvailabilityEnabled, t]);

  useEffect(() => {
    if (!profile?.peerID) return;
    let cancelled = false;
    (async () => {
      try {
        const ratings = await productDataService.getStoreRatings(profile.peerID);
        if (!cancelled) {
          setRatingAvg(ratings.average);
          setRatingCount(ratings.count);
        }
      } catch {
        // Ratings are non-critical; silent fallback to defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.peerID]);

  useEffect(() => {
    if (!guestEnabled) {
      setGuestOrders([]);
      setGuestLoading(false);
      return;
    }
    let cancelled = false;
    setGuestLoading(true);
    listGuestOrders({ page: 0, pageSize: 10 })
      .then(rows => {
        if (!cancelled) setGuestOrders(rows);
      })
      .catch(() => {
        if (!cancelled) setGuestOrders([]);
      })
      .finally(() => {
        if (!cancelled) setGuestLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [guestEnabled]);

  const recentOrders = useMemo(
    () =>
      [
        ...salesOrders.map(order => ({
          source: 'standard' as const,
          createdAt: order.timestamp || '',
          order,
        })),
        ...guestOrders.map(order => ({
          source: 'guest' as const,
          createdAt: order.createdAt,
          order,
        })),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [salesOrders, guestOrders]
  );

  const topProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => {
          const ratingDiff = (b.averageRating || 0) - (a.averageRating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return (b.ratingCount || 0) - (a.ratingCount || 0);
        })
        .slice(0, 5),
    [products]
  );

  const totalSalesDisplay = useMemo(() => {
    if (!salesOrders.length) return '—';
    let total = 0;
    for (const order of salesOrders) {
      if (!order.total?.amount || !REVENUE_STATES.has(order.state)) continue;
      const cc = getOrderCurrencyCode(order);
      try {
        total += convertToLocal(fromMinimalUnit(order.total.amount, cc), cc);
      } catch {
        // Skip orders with unknown currencies
      }
    }
    if (total <= 0) return '—';
    return formatPrice(total, localCurrency);
  }, [salesOrders, convertToLocal, fromMinimalUnit, formatPrice, localCurrency]);

  return {
    profile,
    products,
    productsLoading,
    productsError,
    salesOrders,
    salesLoading,
    guestLoading,
    salesError,
    ratingAvg,
    ratingCount,
    recentOrders,
    topProducts,
    totalSalesDisplay,
    totalOrderCount: salesOrders.length + guestOrders.length,
  };
}
