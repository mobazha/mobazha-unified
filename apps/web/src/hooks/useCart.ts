'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, useUserStore, useI18n, useCurrency, getImageUrl } from '@mobazha/core';
import type { CartItem } from '@mobazha/core';

export interface VendorGroup {
  vendorPeerID: string;
  vendorHandle?: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
}

export function useCart() {
  const router = useRouter();
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);

  const items = useCartStore(state => state.items);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const clearCart = useCartStore(state => state.clearCart);

  const groups = useMemo<VendorGroup[]>(() => {
    const map: Record<string, VendorGroup> = {};
    items.forEach(item => {
      const key = item.listing.vendorPeerID;
      if (!map[key]) {
        map[key] = {
          vendorPeerID: key,
          vendorHandle: item.listing.vendorHandle,
          items: [],
          subtotal: 0,
          currency: item.listing.price.currency.code,
        };
      }
      map[key].items.push(item);
      map[key].subtotal += item.listing.price.amount * item.quantity;
    });
    return Object.values(map);
  }, [items]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.listing.price.amount * item.quantity, 0),
    [items]
  );

  const defaultCurrency = items[0]?.listing.price.currency.code ?? 'USD';

  const buildCheckoutUrl = useCallback((group: VendorGroup): string => {
    if (group.items.length === 1) {
      const item = group.items[0];
      const params = new URLSearchParams({
        slug: item.listing.slug,
        peerID: item.listing.vendorPeerID,
        quantity: item.quantity.toString(),
      });
      return `/checkout?${params.toString()}`;
    }
    const vendorPeerID = group.vendorPeerID;
    const slugs = group.items.map(i => i.listing.slug).join(',');
    return `/checkout?vendorPeerID=${encodeURIComponent(vendorPeerID)}&slugs=${encodeURIComponent(slugs)}`;
  }, []);

  const handleCheckout = useCallback(
    (group: VendorGroup) => {
      const checkoutUrl = buildCheckoutUrl(group);

      if (!isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
        return;
      }

      router.push(checkoutUrl);
    },
    [isAuthenticated, buildCheckoutUrl, router]
  );

  const getThumbUrl = useCallback(
    (item: CartItem) =>
      getImageUrl(item.listing.thumbnail?.medium || item.listing.thumbnail?.small),
    []
  );

  return {
    items,
    groups,
    totalAmount,
    defaultCurrency,
    updateQuantity,
    removeItem,
    clearCart,
    handleCheckout,
    getThumbUrl,
    t,
    renderPairedPrice,
  };
}
