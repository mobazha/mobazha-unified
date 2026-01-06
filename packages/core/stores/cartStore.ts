/**
 * 购物车状态管理
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { CartItem, OrderItemOption, OrderShippingOption } from '../types';

interface CartState {
  // 状态
  items: CartItem[];
  isLoading: boolean;

  // 动作
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (slug: string, vendorPeerID: string) => void;
  updateQuantity: (slug: string, vendorPeerID: string, quantity: number) => void;
  updateOptions: (slug: string, vendorPeerID: string, options: OrderItemOption[]) => void;
  updateShipping: (slug: string, vendorPeerID: string, shippingOption: OrderShippingOption) => void;
  clearCart: () => void;
  clearVendorItems: (vendorPeerID: string) => void;

  // 计算属性
  getItemCount: () => number;
  getVendorItems: (vendorPeerID: string) => CartItem[];
  getItemBySlug: (slug: string, vendorPeerID: string) => CartItem | undefined;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        items: [],
        isLoading: false,

        // 添加商品
        addItem: newItem => {
          const { items } = get();
          const existingIndex = items.findIndex(
            item =>
              item.listing.slug === newItem.listing.slug &&
              item.listing.vendorPeerID === newItem.listing.vendorPeerID
          );

          if (existingIndex >= 0) {
            // 更新数量
            const updatedItems = [...items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + (newItem.quantity ?? 1),
            };
            set({ items: updatedItems });
          } else {
            // 添加新商品
            set({
              items: [
                ...items,
                {
                  ...newItem,
                  quantity: newItem.quantity ?? 1,
                },
              ],
            });
          }
        },

        // 移除商品
        removeItem: (slug, vendorPeerID) => {
          set({
            items: get().items.filter(
              item => !(item.listing.slug === slug && item.listing.vendorPeerID === vendorPeerID)
            ),
          });
        },

        // 更新数量
        updateQuantity: (slug, vendorPeerID, quantity) => {
          if (quantity <= 0) {
            get().removeItem(slug, vendorPeerID);
            return;
          }

          set({
            items: get().items.map(item =>
              item.listing.slug === slug && item.listing.vendorPeerID === vendorPeerID
                ? { ...item, quantity }
                : item
            ),
          });
        },

        // 更新选项
        updateOptions: (slug, vendorPeerID, options) => {
          set({
            items: get().items.map(item =>
              item.listing.slug === slug && item.listing.vendorPeerID === vendorPeerID
                ? { ...item, options }
                : item
            ),
          });
        },

        // 更新运输选项
        updateShipping: (slug, vendorPeerID, shippingOption) => {
          set({
            items: get().items.map(item =>
              item.listing.slug === slug && item.listing.vendorPeerID === vendorPeerID
                ? { ...item, shippingOption }
                : item
            ),
          });
        },

        // 清空购物车
        clearCart: () => set({ items: [] }),

        // 清空指定卖家的商品
        clearVendorItems: vendorPeerID => {
          set({
            items: get().items.filter(item => item.listing.vendorPeerID !== vendorPeerID),
          });
        },

        // 获取商品数量
        getItemCount: () => {
          return get().items.reduce((sum, item) => sum + item.quantity, 0);
        },

        // 获取指定卖家的商品
        getVendorItems: vendorPeerID => {
          return get().items.filter(item => item.listing.vendorPeerID === vendorPeerID);
        },

        // 按 slug 获取商品
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
