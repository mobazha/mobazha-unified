/**
 * Guest Cart 状态管理
 *
 * 纯前端 localStorage 管理，不走后端 API。
 * 与已登录用户的 cartStore 完全独立。
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export interface GuestCartItem {
  slug: string;
  listingHash: string;
  quantity: number;
  options?: { name: string; value: string }[];
  shipping?: { name: string; service: string };
  title: string;
  price: { amount: number; currency: string; divisibility: number };
  thumbnail: string;
  vendorPeerID: string;
}

interface GuestCartState {
  items: GuestCartItem[];

  addItem: (item: GuestCartItem) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;

  getItemCount: () => number;
  getTotal: () => { amount: number; currency: string; divisibility: number } | null;
}

const optionsKey = (item: { slug: string; options?: { name: string; value: string }[] }) =>
  `${item.slug}:${(item.options ?? []).map(o => `${o.name}=${o.value}`).sort().join('|')}`;

export const useGuestCartStore = create<GuestCartState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],

        addItem: (newItem: GuestCartItem) => {
          const { items } = get();
          const key = optionsKey(newItem);
          const idx = items.findIndex(i => optionsKey(i) === key);

          if (idx >= 0) {
            const updated = [...items];
            updated[idx] = {
              ...updated[idx],
              quantity: updated[idx].quantity + (newItem.quantity || 1),
            };
            set({ items: updated });
          } else {
            set({ items: [...items, { ...newItem, quantity: newItem.quantity || 1 }] });
          }
        },

        removeItem: (slug: string) => {
          set({ items: get().items.filter(i => i.slug !== slug) });
        },

        updateQuantity: (slug: string, quantity: number) => {
          if (quantity <= 0) {
            set({ items: get().items.filter(i => i.slug !== slug) });
            return;
          }
          set({
            items: get().items.map(i => (i.slug === slug ? { ...i, quantity } : i)),
          });
        },

        clearCart: () => set({ items: [] }),

        getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

        getTotal: () => {
          const { items } = get();
          if (items.length === 0) return null;
          const first = items[0].price;
          const total = items.reduce((sum, i) => sum + i.price.amount * i.quantity, 0);
          return { amount: total, currency: first.currency, divisibility: first.divisibility };
        },
      }),
      { name: 'guest-cart-storage' },
    ),
    { name: 'GuestCartStore' },
  ),
);
