/**
 * 购物车状态管理
 *
 * Optimistic local updates with fire-and-forget API write-back.
 * LocalStorage persistence (Zustand persist) is the primary store;
 * API sync keeps the server in sync for cross-device continuity.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { CartItem, OrderItemOption, OrderShippingOption } from '../types';
import { cartApi } from '../services/api/cart';

function syncToApi(fn: () => Promise<unknown>) {
  fn().catch(() => {
    /* best-effort background sync */
  });
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;

  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (slug: string, vendorPeerID: string) => void;
  updateQuantity: (slug: string, vendorPeerID: string, quantity: number) => void;
  updateOptions: (slug: string, vendorPeerID: string, options: OrderItemOption[]) => void;
  updateShipping: (slug: string, vendorPeerID: string, shippingOption: OrderShippingOption) => void;
  clearCart: () => void;
  clearVendorItems: (vendorPeerID: string) => void;
  syncAllItems: () => void;

  getItemCount: () => number;
  getVendorItems: (vendorPeerID: string) => CartItem[];
  getItemBySlug: (slug: string, vendorPeerID: string) => CartItem | undefined;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        isLoading: false,

        addItem: newItem => {
          const { items } = get();
          const existingIndex = items.findIndex(
            item =>
              item.listing.slug === newItem.listing.slug &&
              item.listing.vendorPeerID === newItem.listing.vendorPeerID
          );

          const qty = newItem.quantity ?? 1;

          if (existingIndex >= 0) {
            const updatedItems = [...items];
            const newQty = updatedItems[existingIndex].quantity + qty;
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: newQty,
            };
            set({ items: updatedItems });
            syncToApi(() =>
              cartApi.updateCartItem(newItem.listing.vendorPeerID, {
                slug: newItem.listing.slug,
                quantity: newQty,
                options: newItem.options?.map(o => ({ name: o.name, value: o.value })),
              })
            );
          } else {
            set({
              items: [...items, { ...newItem, quantity: qty }],
            });
            syncToApi(() =>
              cartApi.addToCart(newItem.listing.vendorPeerID, {
                slug: newItem.listing.slug,
                quantity: qty,
                options: newItem.options?.map(o => ({ name: o.name, value: o.value })),
                memo: newItem.memo,
              })
            );
          }
        },

        removeItem: (slug, vendorPeerID) => {
          set({
            items: get().items.filter(
              item => !(item.listing.slug === slug && item.listing.vendorPeerID === vendorPeerID)
            ),
          });
          syncToApi(() => cartApi.removeFromCart(vendorPeerID, slug));
        },

        updateQuantity: (slug, vendorPeerID, quantity) => {
          if (quantity <= 0) {
            get().removeItem(slug, vendorPeerID);
            return;
          }

          const item = get().items.find(
            i => i.listing.slug === slug && i.listing.vendorPeerID === vendorPeerID
          );
          set({
            items: get().items.map(i =>
              i.listing.slug === slug && i.listing.vendorPeerID === vendorPeerID
                ? { ...i, quantity }
                : i
            ),
          });
          syncToApi(() =>
            cartApi.updateCartItem(vendorPeerID, {
              slug,
              quantity,
              options: item?.options?.map(o => ({ name: o.name, value: o.value })),
            })
          );
        },

        updateOptions: (slug, vendorPeerID, options) => {
          const item = get().items.find(
            i => i.listing.slug === slug && i.listing.vendorPeerID === vendorPeerID
          );
          set({
            items: get().items.map(i =>
              i.listing.slug === slug && i.listing.vendorPeerID === vendorPeerID
                ? { ...i, options }
                : i
            ),
          });
          if (item) {
            syncToApi(() =>
              cartApi.updateCartItem(vendorPeerID, {
                slug,
                quantity: item.quantity,
                options: options.map(o => ({ name: o.name, value: o.value })),
              })
            );
          }
        },

        updateShipping: (slug, vendorPeerID, shippingOption) => {
          set({
            items: get().items.map(item =>
              item.listing.slug === slug && item.listing.vendorPeerID === vendorPeerID
                ? { ...item, shippingOption }
                : item
            ),
          });
        },

        clearCart: () => {
          set({ items: [] });
          syncToApi(() => cartApi.clearCarts());
        },

        clearVendorItems: vendorPeerID => {
          const vendorItems = get().items.filter(
            item => item.listing.vendorPeerID === vendorPeerID
          );
          set({
            items: get().items.filter(item => item.listing.vendorPeerID !== vendorPeerID),
          });
          for (const item of vendorItems) {
            syncToApi(() => cartApi.removeFromCart(vendorPeerID, item.listing.slug));
          }
        },

        syncAllItems: () => {
          const { items } = get();
          if (items.length === 0) return;
          for (const item of items) {
            syncToApi(() =>
              cartApi.addToCart(item.listing.vendorPeerID, {
                slug: item.listing.slug,
                quantity: item.quantity,
                options: item.options?.map(o => ({ name: o.name, value: o.value })),
                memo: item.memo,
              })
            );
          }
        },

        getItemCount: () => {
          return get().items.reduce((sum, item) => sum + item.quantity, 0);
        },

        getVendorItems: vendorPeerID => {
          return get().items.filter(item => item.listing.vendorPeerID === vendorPeerID);
        },

        getItemBySlug: (slug, vendorPeerID) => {
          return get().items.find(
            item => item.listing.slug === slug && item.listing.vendorPeerID === vendorPeerID
          );
        },
      }),
      {
        name: 'mobazha-cart-storage',
      }
    ),
    { name: 'CartStore' }
  )
);

// 选择器
export const selectCartItems = (state: CartState) => state.items;
export const selectCartItemCount = (state: CartState) => state.getItemCount();
