/**
 * Mock Data Services
 *
 * Provides mock implementations of all API services for development and testing.
 */

import {
  mockProducts,
  mockCategories,
  mockOrders,
  mockCurrentUser,
  mockUsers,
  mockWallets,
  mockTransactions,
  mockChatRooms,
  mockSearch,
  generateMockProducts,
  generateMockMessages,
} from './data';
import type { Product, ProductCategory } from '../../types/product';
import type { Order } from '../../types/order';
import type { UserProfile, User } from '../../types/user';
import type { Wallet, Transaction } from '../../types/wallet';

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ============ Product Services ============

export const mockProductService = {
  async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<{ products: Product[]; total: number; hasMore: boolean }> {
    await delay();
    let products = [...mockProducts, ...generateMockProducts(20)];

    if (params?.category) {
      products = products.filter(p => p.category.toLowerCase() === params.category?.toLowerCase());
    }

    if (params?.search) {
      const query = params.search.toLowerCase();
      products = products.filter(
        p => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)
      );
    }

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    const paginatedProducts = products.slice(start, start + limit);

    return {
      products: paginatedProducts,
      total: products.length,
      hasMore: start + limit < products.length,
    };
  },

  async getProduct(slug: string): Promise<Product | null> {
    await delay();
    const allProducts = [...mockProducts, ...generateMockProducts(20)];
    return allProducts.find(p => p.slug === slug) || null;
  },

  async getCategories(): Promise<ProductCategory[]> {
    await delay(200);
    return mockCategories;
  },

  async getFeaturedProducts(): Promise<Product[]> {
    await delay();
    return mockProducts.slice(0, 6);
  },
};

// ============ Order Services ============

export const mockOrderService = {
  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number; hasMore: boolean }> {
    await delay();
    let orders = [...mockOrders];

    if (params?.status && params.status !== 'all') {
      orders = orders.filter(o => o.status === params.status);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const paginatedOrders = orders.slice(start, start + limit);

    return {
      orders: paginatedOrders,
      total: orders.length,
      hasMore: start + limit < orders.length,
    };
  },

  async getOrder(orderId: string): Promise<Order | null> {
    await delay();
    return mockOrders.find(o => o.id === orderId || o.orderNumber === orderId) || null;
  },

  async createOrder(/* orderData: unknown */): Promise<Order> {
    await delay(500);
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      orderNumber: `ORD-2024-${Math.floor(Math.random() * 1000)}`,
      status: 'pending',
      items: [],
      total: 0,
      currency: 'USD',
      cryptoAmount: 0,
      cryptoCurrency: 'BTC',
      vendor: { peerID: 'QmVendor123', name: 'Store' },
      shippingAddress: {
        name: '',
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
      },
      timeline: [
        { status: 'pending', timestamp: new Date().toISOString(), description: 'Order placed' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newOrder;
  },
};

// ============ User/Profile Services ============

export const mockProfileService = {
  async getCurrentUser(): Promise<UserProfile> {
    await delay();
    return mockCurrentUser;
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    await delay(500);
    return { ...mockCurrentUser, ...data };
  },

  async getUser(peerID: string): Promise<User | null> {
    await delay();
    if (peerID === mockCurrentUser.peerID) {
      return mockCurrentUser as User;
    }
    return mockUsers.find(u => u.peerID === peerID) || null;
  },

  async searchUsers(query: string): Promise<User[]> {
    await delay();
    return mockUsers.filter(
      u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.shortDescription?.toLowerCase().includes(query.toLowerCase())
    );
  },
};

// ============ Wallet Services ============

export const mockWalletService = {
  async getWallets(): Promise<Wallet[]> {
    await delay();
    return mockWallets;
  },

  async getWallet(type: string): Promise<Wallet | null> {
    await delay();
    return mockWallets.find(w => w.type === type) || null;
  },

  async getTransactions(params?: {
    currency?: string;
    type?: 'send' | 'receive';
    page?: number;
    limit?: number;
  }): Promise<{ transactions: Transaction[]; total: number; hasMore: boolean }> {
    await delay();
    let transactions = [...mockTransactions];

    if (params?.currency) {
      transactions = transactions.filter(t => t.currency === params.currency);
    }

    if (params?.type) {
      transactions = transactions.filter(t => t.type === params.type);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    const paginatedTransactions = transactions.slice(start, start + limit);

    return {
      transactions: paginatedTransactions,
      total: transactions.length,
      hasMore: start + limit < transactions.length,
    };
  },

  async getTotalBalance(): Promise<{ usd: number; btc: number }> {
    await delay(200);
    const totalUSD = mockWallets.reduce((sum, w) => sum + w.balanceUSD, 0);
    const btcWallet = mockWallets.find(w => w.type === 'BTC');
    return {
      usd: totalUSD,
      btc: btcWallet?.balance || 0,
    };
  },
};

// ============ Chat Services ============

export const mockChatService = {
  async getRooms() {
    await delay();
    return mockChatRooms;
  },

  async getMessages(roomId: string) {
    await delay();
    return generateMockMessages(roomId);
  },

  async sendMessage(roomId: string, content: string) {
    await delay(200);
    return {
      id: `msg-${Date.now()}`,
      content,
      senderId: 'me',
      timestamp: new Date().toISOString(),
      status: 'sent' as const,
    };
  },
};

// ============ Search Services ============

export const mockSearchService = {
  async search(query: string, type: 'all' | 'products' | 'users' = 'all') {
    await delay();
    return mockSearch(query, type);
  },
};

// Export all mock services
export default {
  products: mockProductService,
  orders: mockOrderService,
  profile: mockProfileService,
  wallet: mockWalletService,
  chat: mockChatService,
  search: mockSearchService,
};
