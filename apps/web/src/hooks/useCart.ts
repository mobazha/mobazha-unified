'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, useUserStore, useI18n, useCurrency, getImageUrl } from '@mobazha/core';
import type { CartItem } from '@mobazha/core';

export interface VendorGroup {
  vendorPeerID: string;
  vendorName?: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
}

/**
 * Build a checkout URL for a set of items from a single vendor.
 * Shared by useCart hook and CartDrawer to avoid duplication.
 */
export function buildCheckoutUrl(cartItems: CartItem[], vendorPeerID: string): string {
  if (cartItems.length === 1) {
    const item = cartItems[0];
    const params = new URLSearchParams({
      slug: item.listing.slug,
      peerID: item.listing.vendorPeerID,
      quantity: item.quantity.toString(),
    });
    return `/checkout?${params.toString()}`;
  }
  const slugs = cartItems.map(i => i.listing.slug).join(',');
  return `/checkout?vendorPeerID=${encodeURIComponent(vendorPeerID)}&slugs=${encodeURIComponent(slugs)}`;
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
          vendorName: item.listing.vendorName,
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

  const handleCheckout = useCallback(
    (group: VendorGroup) => {
      const checkoutUrl = buildCheckoutUrl(group.items, group.vendorPeerID);

      if (!isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
        return;
      }

      router.push(checkoutUrl);
    },
    [isAuthenticated, router]
  );

  const getThumbUrl = useCallback(
    (item: CartItem) =>
      getImageUrl(item.listing.thumbnail?.medium || item.listing.thumbnail?.small),
    []
  );

  const checkoutLabel = isAuthenticated ? t('cart.checkout') : t('cart.loginToCheckout');

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
    checkoutLabel,
    t,
    renderPairedPrice,
  };
}
