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
import type { Product, ProductCategory, ProductListItem } from '../../types/product';
import type { Order } from '../../types/order';
import type { UserProfile, User } from '../../types/user';
import type { Wallet, Transaction } from '../../types/wallet';

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Convert Product to ProductListItem
const toListItem = (p: Product): ProductListItem => ({
  slug: p.slug,
  hash: p.hash || `Qm${p.slug}`,
  title: p.title,
  thumbnail: p.images?.[0] || p.thumbnail || '',
  price: typeof p.price === 'number' ? p.price : parseFloat(p.price as string) || 0,
  freeShipping: p.freeShipping,
  acceptedCurrencies: p.acceptedCurrencies || ['BTC', 'ETH'],
  contractType: p.contractType || 'PHYSICAL_GOOD',
  vendorPeerID: p.vendorPeerID || p.vendor?.peerID || '',
  averageRating: p.rating || 0,
  ratingCount: p.reviewCount || 0,
});

// ============ Product Services ============

export const mockProductService = {
  async getTrendingProducts(): Promise<ProductListItem[]> {
    await delay();
    return mockProducts.slice(0, 10).map(toListItem);
  },

  async getFeaturedProducts(): Promise<ProductListItem[]> {
    await delay();
    return mockProducts.slice(0, 8).map(toListItem);
  },

  async getStoreListings(_peerID: string): Promise<ProductListItem[]> {
    await delay();
    return mockProducts.slice(0, 6).map(toListItem);
  },

  async getMyListings(): Promise<ProductListItem[]> {
    await delay();
    return mockProducts.slice(0, 4).map(toListItem);
  },

  async getProduct(slug: string): Promise<Product | null> {
    await delay();
    const allProducts = [...mockProducts, ...generateMockProducts(20)];
    return allProducts.find(p => p.slug === slug) || null;
  },

  async createListing(_productDetails: Partial<Product>): Promise<{ slug: string }> {
    await delay(500);
    return { slug: `new-product-${Date.now()}` };
  },

  async updateListing(_productDetails: Partial<Product>): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async deleteListing(_slug: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async getCategories(): Promise<ProductCategory[]> {
    await delay(200);
    return mockCategories;
  },

  async getProductRatings(_slug: string) {
    await delay();
    return [
      { rating: 5, comment: 'Great product!', date: '2024-01-15', buyerName: 'User1' },
      { rating: 4, comment: 'Good quality', date: '2024-01-10', buyerName: 'User2' },
    ];
  },
};

// ============ Order Services ============

export const mockOrderService = {
  async getPurchases(): Promise<Order[]> {
    await delay();
    return mockOrders.filter(o => o.type === 'purchase' || !o.type);
  },

  async getSales(): Promise<Order[]> {
    await delay();
    return mockOrders.filter(o => o.type === 'sale');
  },

  async getOrder(orderId: string): Promise<Order | null> {
    await delay();
    return mockOrders.find(o => o.id === orderId || o.orderNumber === orderId) || null;
  },

  async confirmOrder(_orderId: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async fulfillOrder(_orderId: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async completeOrder(_orderId: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async cancelOrder(_orderId: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async refundOrder(_orderId: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async fundOrder(_orderId: string): Promise<{ success: boolean; txid: string }> {
    await delay(500);
    return { success: true, txid: `tx-${Date.now()}` };
  },

  async openDispute(_orderId: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async getPaymentInstructions(_orderId: string, _coin: string) {
    await delay();
    return {
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: 0.001,
    };
  },
};

// ============ User/Profile Services ============

export const mockProfileService = {
  async getCurrentUser(): Promise<UserProfile> {
    await delay();
    return mockCurrentUser;
  },

  async updateProfile(_data: Partial<UserProfile>): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async getUser(peerID: string): Promise<UserProfile | null> {
    await delay();
    if (peerID === mockCurrentUser.peerID) {
      return mockCurrentUser;
    }
    return (mockUsers.find(u => u.peerID === peerID) as UserProfile) || null;
  },

  async getSettings() {
    await delay();
    return {
      country: 'US',
      currency: 'USD',
      language: 'en',
      notifications: true,
      shippingAddresses: [],
      blockedNodes: [],
    };
  },

  async updateSettings(_settings: unknown): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async getPeerID(): Promise<string> {
    await delay();
    return mockCurrentUser.peerID;
  },

  async setAcceptedCoins(_coins: string[]): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async reportUser(_peerID: string, _reason: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
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
  async getAllBalances(): Promise<Record<string, Wallet>> {
    await delay();
    const balances: Record<string, Wallet> = {};
    for (const wallet of mockWallets) {
      balances[wallet.type] = wallet;
    }
    return balances;
  },

  async getBalance(coin: string): Promise<Wallet | null> {
    await delay();
    return mockWallets.find(w => w.type === coin) || null;
  },

  async getTransactions(coin: string): Promise<Transaction[]> {
    await delay();
    return mockTransactions.filter(t => t.currency === coin);
  },

  async getAddress(coin: string): Promise<string> {
    await delay();
    const addresses: Record<string, string> = {
      BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f',
      USDT: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
    };
    return addresses[coin] || `address-${coin}`;
  },

  async estimateFee(_coin: string, _amount: number) {
    await delay();
    return {
      priority: { fee: 0.0001, satPerByte: 20, estimatedTime: '10 min' },
      normal: { fee: 0.00005, satPerByte: 10, estimatedTime: '30 min' },
      economic: { fee: 0.00002, satPerByte: 5, estimatedTime: '60 min' },
    };
  },

  async sendTransaction(_params: unknown): Promise<{ success: boolean; txid: string }> {
    await delay(1000);
    return { success: true, txid: `tx-${Date.now()}` };
  },

  async getExchangeRates(): Promise<Record<string, Record<string, number>>> {
    await delay();
    return {
      BTC: { USD: 45000, EUR: 41000, CNY: 290000 },
      ETH: { USD: 2500, EUR: 2300, CNY: 16000 },
      USDT: { USD: 1, EUR: 0.92, CNY: 7.2 },
    };
  },

  async hasWallet(): Promise<boolean> {
    await delay();
    return true;
  },

  async getMnemonic(): Promise<string> {
    await delay();
    return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  },

  async restoreWallet(_mnemonic: string): Promise<{ success: boolean }> {
    await delay(1000);
    return { success: true };
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
