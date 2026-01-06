/**
 * Unified Data Service
 *
 * Automatically switches between real API and mock data based on configuration.
 * This is the main entry point for all data fetching in the application.
 */

import { isMockMode } from '../config';
import mockServices from './mock';

// Import real API services (these will be used when mock is disabled)
import * as productsApi from './api/products';
import * as ordersApi from './api/orders';
import * as profileApi from './api/profile';
import * as walletApi from './api/wallet';

import type { Product, ProductCategory } from '../types/product';
import type { Order } from '../types/order';
import type { UserProfile, User } from '../types/user';
import type { Wallet, Transaction } from '../types/wallet';

// ============ Product Data Service ============

export const productDataService = {
  async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<{ products: Product[]; total: number; hasMore: boolean }> {
    if (isMockMode()) {
      return mockServices.products.getProducts(params);
    }
    // Real API call
    const response = await productsApi.getProducts(params);
    return {
      products: response.results || [],
      total: response.total || 0,
      hasMore: response.morePages || false,
    };
  },

  async getProduct(slug: string): Promise<Product | null> {
    if (isMockMode()) {
      return mockServices.products.getProduct(slug);
    }
    // Real API call
    try {
      const response = await productsApi.getProduct(slug);
      return response || null;
    } catch {
      return null;
    }
  },

  async getCategories(): Promise<ProductCategory[]> {
    if (isMockMode()) {
      return mockServices.products.getCategories();
    }
    // Real API call - may need to implement
    return [];
  },

  async getFeaturedProducts(): Promise<Product[]> {
    if (isMockMode()) {
      return mockServices.products.getFeaturedProducts();
    }
    // Real API call
    const response = await productsApi.getProducts({ limit: 6 });
    return response.results || [];
  },
};

// ============ Order Data Service ============

export const orderDataService = {
  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number; hasMore: boolean }> {
    if (isMockMode()) {
      return mockServices.orders.getOrders(params);
    }
    // Real API call
    const response = await ordersApi.getOrders(params);
    return {
      orders: response || [],
      total: response?.length || 0,
      hasMore: false,
    };
  },

  async getOrder(orderId: string): Promise<Order | null> {
    if (isMockMode()) {
      return mockServices.orders.getOrder(orderId);
    }
    // Real API call
    try {
      return await ordersApi.getOrder(orderId);
    } catch {
      return null;
    }
  },

  async createOrder(orderData: unknown): Promise<Order> {
    if (isMockMode()) {
      return mockServices.orders.createOrder();
    }
    // Real API call
    return await ordersApi.createOrder(orderData as Parameters<typeof ordersApi.createOrder>[0]);
  },
};

// ============ Profile Data Service ============

export const profileDataService = {
  async getCurrentUser(): Promise<UserProfile | null> {
    if (isMockMode()) {
      return mockServices.profile.getCurrentUser();
    }
    // Real API call
    try {
      return await profileApi.getProfile();
    } catch {
      return null;
    }
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile | null> {
    if (isMockMode()) {
      return mockServices.profile.updateProfile(data);
    }
    // Real API call
    try {
      return await profileApi.updateProfile(data as Parameters<typeof profileApi.updateProfile>[0]);
    } catch {
      return null;
    }
  },

  async getUser(peerID: string): Promise<User | null> {
    if (isMockMode()) {
      return mockServices.profile.getUser(peerID);
    }
    // Real API call
    try {
      return await profileApi.getExternalProfile(peerID);
    } catch {
      return null;
    }
  },
};

// ============ Wallet Data Service ============

export const walletDataService = {
  async getWallets(): Promise<Wallet[]> {
    if (isMockMode()) {
      return mockServices.wallet.getWallets();
    }
    // Real API call
    return await walletApi.getWallets();
  },

  async getWallet(type: string): Promise<Wallet | null> {
    if (isMockMode()) {
      return mockServices.wallet.getWallet(type);
    }
    // Real API call
    const wallets = await walletApi.getWallets();
    return wallets.find(w => w.type === type) || null;
  },

  async getTransactions(params?: {
    currency?: string;
    type?: 'send' | 'receive';
    page?: number;
    limit?: number;
  }): Promise<{ transactions: Transaction[]; total: number; hasMore: boolean }> {
    if (isMockMode()) {
      return mockServices.wallet.getTransactions(params);
    }
    // Real API call
    const transactions = await walletApi.getTransactions(params?.currency);
    return {
      transactions: transactions || [],
      total: transactions?.length || 0,
      hasMore: false,
    };
  },

  async getTotalBalance(): Promise<{ usd: number; btc: number }> {
    if (isMockMode()) {
      return mockServices.wallet.getTotalBalance();
    }
    // Real API call - calculate from wallets
    const wallets = await walletApi.getWallets();
    const totalUSD = wallets.reduce((sum, w) => sum + (w.balanceUSD || 0), 0);
    const btcWallet = wallets.find(w => w.type === 'BTC');
    return {
      usd: totalUSD,
      btc: btcWallet?.balance || 0,
    };
  },
};

// ============ Chat Data Service ============

export const chatDataService = {
  async getRooms() {
    if (isMockMode()) {
      return mockServices.chat.getRooms();
    }
    // Real Matrix API call - to be implemented
    return [];
  },

  async getMessages(roomId: string) {
    if (isMockMode()) {
      return mockServices.chat.getMessages(roomId);
    }
    // Real Matrix API call - to be implemented
    return [];
  },

  async sendMessage(roomId: string, content: string) {
    if (isMockMode()) {
      return mockServices.chat.sendMessage(roomId, content);
    }
    // Real Matrix API call - to be implemented
    return {
      id: `msg-${Date.now()}`,
      content,
      senderId: 'me',
      timestamp: new Date().toISOString(),
      status: 'sent' as const,
    };
  },
};

// ============ Search Data Service ============

export const searchDataService = {
  async search(query: string, type: 'all' | 'products' | 'users' = 'all') {
    if (isMockMode()) {
      return mockServices.search.search(query, type);
    }
    // Real API call
    const [productsResult, usersResult] = await Promise.all([
      type !== 'users' ? productsApi.getProducts({ search: query }) : { results: [] },
      type !== 'products' ? profileApi.searchProfiles(query) : [],
    ]);

    return {
      products: productsResult.results || [],
      users: usersResult || [],
      total: (productsResult.results?.length || 0) + (usersResult?.length || 0),
      page: 1,
      pageSize: 20,
      hasMore: false,
    };
  },
};

// Export unified data service
export default {
  products: productDataService,
  orders: orderDataService,
  profile: profileDataService,
  wallet: walletDataService,
  chat: chatDataService,
  search: searchDataService,
};
