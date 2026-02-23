/**
 * 购物车 API 服务
 */

import { withMockFallback } from './mode';
import { mockProducts } from '../mock/data';
import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authPut, authDel, authSafeGet, authRequest } from './helpers';

// 购物车项类型
export interface CartItem {
  slug: string;
  peerID: string;
  quantity: number;
  options?: Array<{
    name: string;
    value: string;
  }>;
  memo?: string;
  // 附加的商品信息（前端填充）
  title?: string;
  price?: number;
  currency?: string;
  image?: string;
}

// 购物车结构（按店铺分组）
export interface Cart {
  [peerID: string]: CartItem[];
}

// Mock 购物车数据
let mockCartData: Cart = {
  QmVendor123: [
    {
      slug: 'premium-headphones',
      peerID: 'QmVendor123',
      quantity: 1,
      title: 'Premium Wireless Headphones',
      price: 299.99,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
    },
  ],
};

/**
 * 获取购物车商品数量
 */
export async function getCartItemsCount(): Promise<number> {
  const realFn = async () => {
    const result = await authGet<{ count: number }>(NODE_API.CARTS_COUNT);
    return result.count;
  };

  const mockFn = async () => {
    return Object.values(mockCartData)
      .flat()
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  return withMockFallback(realFn, mockFn, '/carts/count');
}

/**
 * 获取购物车
 */
export async function getCarts(): Promise<Cart> {
  const realFn = async () => {
    return authSafeGet<Cart>(NODE_API.CARTS, {});
  };

  const mockFn = async () => {
    return mockCartData;
  };

  return withMockFallback(realFn, mockFn, '/carts');
}

/**
 * 添加商品到购物车
 */
export async function addToCart(
  peerID: string,
  item: {
    slug: string;
    quantity: number;
    options?: Array<{ name: string; value: string }>;
    memo?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; error?: string }>(NODE_API.CART_ITEMS(peerID), item);
  };

  const mockFn = async () => {
    if (!mockCartData[peerID]) {
      mockCartData[peerID] = [];
    }

    const existingIndex = mockCartData[peerID].findIndex(i => i.slug === item.slug);
    if (existingIndex >= 0) {
      mockCartData[peerID][existingIndex].quantity += item.quantity;
    } else {
      const product = mockProducts.find(p => p.slug === item.slug);
      mockCartData[peerID].push({
        ...item,
        peerID,
        title: product?.title || item.slug,
        price: product?.price || 0,
        currency: product?.currency || 'USD',
        image: product?.images[0],
      });
    }

    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/carts/${peerID}/items`);
}

/**
 * 更新购物车商品数量
 */
export async function updateCartItem(
  peerID: string,
  item: {
    slug: string;
    quantity: number;
    options?: Array<{ name: string; value: string }>;
  }
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPut<{ success: boolean; error?: string }>(NODE_API.CART_ITEMS(peerID), item);
  };

  const mockFn = async () => {
    if (mockCartData[peerID]) {
      const existingIndex = mockCartData[peerID].findIndex(i => i.slug === item.slug);
      if (existingIndex >= 0) {
        if (item.quantity <= 0) {
          mockCartData[peerID].splice(existingIndex, 1);
          if (mockCartData[peerID].length === 0) {
            delete mockCartData[peerID];
          }
        } else {
          mockCartData[peerID][existingIndex].quantity = item.quantity;
        }
      }
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/carts/${peerID}/items`);
}

/**
 * 从购物车移除商品
 */
export async function removeFromCart(
  peerID: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authRequest<{ success: boolean; error?: string }>(NODE_API.CART_ITEMS(peerID), {
      method: 'DELETE',
      body: { slug },
    });
  };

  const mockFn = async () => {
    if (mockCartData[peerID]) {
      mockCartData[peerID] = mockCartData[peerID].filter(i => i.slug !== slug);
      if (mockCartData[peerID].length === 0) {
        delete mockCartData[peerID];
      }
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/carts/${peerID}/items`);
}

/**
 * 清空购物车
 */
export async function clearCarts(): Promise<{ success: boolean }> {
  const realFn = async () => {
    return authDel<{ success: boolean }>(NODE_API.CARTS);
  };

  const mockFn = async () => {
    // Mock: 清空本地购物车
    mockCartData = {};
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/carts');
}

/**
 * 计算购物车总价
 */
export function calculateCartTotal(cart: Cart): {
  subtotal: number;
  itemCount: number;
  currency: string;
} {
  let subtotal = 0;
  let itemCount = 0;
  let currency = 'USD';

  Object.values(cart).forEach(items => {
    items.forEach(item => {
      if (item.price) {
        subtotal += item.price * item.quantity;
        currency = item.currency || 'USD';
      }
      itemCount += item.quantity;
    });
  });

  return { subtotal, itemCount, currency };
}

/**
 * 购物车 API 导出对象
 */
export const cartApi = {
  getCartItemsCount,
  getCarts,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCarts,
  calculateCartTotal,
};
