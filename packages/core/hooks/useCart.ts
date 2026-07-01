/**
 * 购物车 Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { cartApi, type Cart, type CartItem } from '../services/api/cart';

interface CartState {
  cart: Cart;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
}

export function useCart() {
  const [state, setState] = useState<CartState>({
    cart: {},
    itemCount: 0,
    isLoading: false,
    error: null,
  });

  /**
   * 获取购物车
   */
  const fetchCart = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const cart = await cartApi.getCarts();
      const { itemCount } = cartApi.calculateCartTotal(cart);
      setState({ cart, itemCount, isLoading: false, error: null });
      return cart;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch cart';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return {};
    }
  }, []);

  /**
   * 添加到购物车
   */
  const addToCart = useCallback(
    async (
      peerID: string,
      item: {
        slug: string;
        quantity: number;
        options?: Array<{ name: string; value: string }>;
        memo?: string;
      }
    ) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await cartApi.addToCart(peerID, item);
        if (result.success) {
          // 重新获取购物车
          await fetchCart();
        } else {
          throw new Error(result.error || 'Failed to add to cart');
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add to cart';
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
        return { success: false, error: errorMessage };
      }
    },
    [fetchCart]
  );

  /**
   * 更新购物车商品
   */
  const updateCartItem = useCallback(
    async (
      peerID: string,
      item: {
        slug: string;
        quantity: number;
        options?: Array<{ name: string; value: string }>;
      }
    ) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await cartApi.updateCartItem(peerID, item);
        if (result.success) {
          await fetchCart();
        } else {
          throw new Error(result.error || 'Failed to update cart');
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update cart';
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
        return { success: false, error: errorMessage };
      }
    },
    [fetchCart]
  );

  /**
   * 从购物车移除商品
   */
  const removeFromCart = useCallback(
    async (peerID: string, slug: string) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await cartApi.removeFromCart(peerID, slug);
        if (result.success) {
          await fetchCart();
        } else {
          throw new Error(result.error || 'Failed to remove from cart');
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove from cart';
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
        return { success: false, error: errorMessage };
      }
    },
    [fetchCart]
  );

  /**
   * 清空购物车
   */
  const clearCart = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await cartApi.clearCarts();
      if (result.success) {
        setState({ cart: {}, itemCount: 0, isLoading: false, error: null });
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear cart';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 获取特定店铺的购物车商品
   */
  const getCartItemsForStore = useCallback(
    (peerID: string): CartItem[] => {
      return state.cart[peerID] || [];
    },
    [state.cart]
  );

  /**
   * 计算购物车总价
   */
  const calculateTotal = useCallback(() => {
    return cartApi.calculateCartTotal(state.cart);
  }, [state.cart]);

  /**
   * 获取店铺列表
   */
  const getStoresList = useCallback(() => {
    return Object.keys(state.cart);
  }, [state.cart]);

  // 初始化时获取购物车
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return {
    ...state,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartItemsForStore,
    calculateTotal,
    getStoresList,
  };
}

export default useCart;

