/**
 * 收藏/愿望单全局状态管理
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { wishlistApi, type WishlistItem, type AddWishlistParams } from '../services/api/wishlist';

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  _fetched: boolean;

  fetchWishlist: () => Promise<void>;
  addItem: (params: AddWishlistParams) => Promise<void>;
  removeItem: (peerID: string, slug: string) => Promise<void>;
  toggleItem: (params: AddWishlistParams) => Promise<boolean>;
  isInWishlist: (peerID: string, slug: string) => boolean;
  getItemCount: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  devtools(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,
      _fetched: false,

      fetchWishlist: async () => {
        set({ isLoading: true, error: null });
        try {
          const items = await wishlistApi.getWishlist();
          set({ items, isLoading: false, _fetched: true });
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to fetch wishlist';
          set({ error: msg, isLoading: false, _fetched: true });
        }
      },

      addItem: async (params: AddWishlistParams) => {
        const { items } = get();
        const exists = items.some(i => i.peerID === params.peerID && i.slug === params.slug);
        if (exists) return;

        const optimistic: WishlistItem = { ...params, createdAt: new Date().toISOString() };
        set({ items: [optimistic, ...items] });

        try {
          await wishlistApi.addToWishlist(params);
        } catch {
          await get().fetchWishlist();
        }
      },

      removeItem: async (peerID: string, slug: string) => {
        const { items } = get();
        set({ items: items.filter(i => !(i.peerID === peerID && i.slug === slug)) });

        try {
          await wishlistApi.removeFromWishlist(peerID, slug);
        } catch {
          await get().fetchWishlist();
        }
      },

      toggleItem: async (params: AddWishlistParams) => {
        const exists = get().isInWishlist(params.peerID, params.slug);
        if (exists) {
          await get().removeItem(params.peerID, params.slug);
          return false;
        } else {
          await get().addItem(params);
          return true;
        }
      },

      isInWishlist: (peerID: string, slug: string) => {
        return get().items.some(i => i.peerID === peerID && i.slug === slug);
      },

      getItemCount: () => get().items.length,
    }),
    { name: 'WishlistStore' }
  )
);

export const selectWishlistItems = (state: WishlistState) => state.items;
export const selectWishlistCount = (state: WishlistState) => state.getItemCount();
