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
import type { ProductCategory, ProductListItem, Product, ProductRating } from '../../types/product';
import type { UserProfile } from '../../types/user';
import type { MockOrder, MockWallet, MockTransaction, MockUserProfile } from './data';

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Product type (for internal use)
interface MockProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  tags: string[];
  stock: number;
  vendor: {
    peerID: string;
    name: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
  };
  rating: number;
  reviewCount: number;
  contractType: 'PHYSICAL_GOOD' | 'DIGITAL_GOOD' | 'SERVICE';
  acceptedCurrencies: string[];
  shipping: {
    freeShipping: boolean;
    estimatedDays: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Convert MockProduct to ProductListItem
const toListItem = (p: MockProduct): ProductListItem => ({
  slug: p.slug,
  title: p.title,
  thumbnail: {
    tiny: p.images?.[0] || '',
    small: p.images?.[0] || '',
    medium: p.images?.[0] || '',
    large: p.images?.[0] || '',
    original: p.images?.[0] || '',
  },
  price: {
    amount: p.price,
    currency: {
      code: p.currency || 'USD',
      divisibility: 2,
    },
  },
  freeShipping: p.shipping?.freeShipping ? ['WORLDWIDE'] : undefined,
  contractType: p.contractType || 'PHYSICAL_GOOD',
  vendorPeerID: p.vendor?.peerID || '',
  averageRating: p.rating || 0,
  ratingCount: p.reviewCount || 0,
  status: 'published',
  quantity: p.stock,
});

// ============ Product Services ============

export const mockProductService = {
  async getTrendingProducts(): Promise<ProductListItem[]> {
    await delay();
    return mockProducts.slice(0, 10).map(toListItem);
  },

  async getFeaturedProducts(): Promise<ProductListItem[]> {
    await delay();
    return mockProducts.slice(4, 12).map(toListItem);
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
    const found = allProducts.find(p => p.slug === slug);
    if (!found) return null;

    // Convert MockProduct to Product
    return {
      slug: found.slug,
      vendorID: {
        peerID: found.vendor.peerID,
        handle: found.vendor.name,
      },
      metadata: {
        version: 1,
        contractType: found.contractType,
        format: 'FIXED_PRICE',
        expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        acceptedCurrencies: found.acceptedCurrencies as (
          | 'BTC'
          | 'ETH'
          | 'TETH'
          | 'LTC'
          | 'BCH'
          | 'ZEC'
          | 'BSC'
          | 'USDT'
        )[],
        pricingCurrency: {
          code: found.currency,
          divisibility: 2,
        },
        escrowTimeoutHours: 24,
      },
      item: {
        title: found.title,
        description: found.description,
        processingTime: '2-3 days',
        price: found.price,
        nsfw: false,
        tags: found.tags,
        images: found.images.map(img => ({
          tiny: img,
          small: img,
          medium: img,
          large: img,
          original: img,
        })),
        productType: found.category,
      },
    };
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

  async getProductRatings(_slug: string): Promise<ProductRating[]> {
    await delay();
    return [
      {
        ratingID: 'rating-1',
        timestamp: '2024-01-15T00:00:00Z',
        overall: 5,
        review: 'Great product!',
        anonymous: false,
        buyerID: { peerID: 'QmBuyer1', handle: 'User1' },
      },
      {
        ratingID: 'rating-2',
        timestamp: '2024-01-10T00:00:00Z',
        overall: 4,
        review: 'Good quality',
        anonymous: false,
        buyerID: { peerID: 'QmBuyer2', handle: 'User2' },
      },
    ];
  },
};

// ============ Order Services ============

export const mockOrderService = {
  async getPurchases(): Promise<MockOrder[]> {
    await delay();
    return mockOrders.filter(o => o.type === 'purchase' || !o.type);
  },

  async getSales(): Promise<MockOrder[]> {
    await delay();
    return mockOrders.filter(o => o.type === 'sale');
  },

  async getOrder(orderId: string): Promise<MockOrder | null> {
    await delay();
    return mockOrders.find(o => o.id === orderId || o.orderNumber === orderId) || null;
  },

  async confirmOrder(_orderId: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async shipOrder(_orderId: string): Promise<{ success: boolean }> {
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
    return mockCurrentUser as unknown as UserProfile;
  },

  async updateProfile(_data: Partial<UserProfile>): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async getUser(peerID: string): Promise<UserProfile | null> {
    await delay();
    if (peerID === mockCurrentUser.peerID) {
      return mockCurrentUser as unknown as UserProfile;
    }
    return (mockUsers.find(u => u.peerID === peerID) as unknown as UserProfile) || null;
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

  async searchUsers(query: string): Promise<MockUserProfile[]> {
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
  async getAllBalances(): Promise<Record<string, MockWallet>> {
    await delay();
    const balances: Record<string, MockWallet> = {};
    for (const wallet of mockWallets) {
      balances[wallet.type] = wallet;
    }
    return balances;
  },

  async getBalance(coin: string): Promise<MockWallet | null> {
    await delay();
    return mockWallets.find(w => w.type === coin) || null;
  },

  async getTransactions(coin: string): Promise<MockTransaction[]> {
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

  async getExchangeRates(): Promise<Record<string, string>> {
    await delay();
    // USD-base minimal units: 1 USD = X minimal units of target currency
    // BTC@$65k: 1538 satoshi, USD: 100 cents, EUR@0.92: 92 cents,
    // CNY@7.25: 725 fen, ETH@$2500: 400000000000000 wei, USDT@1:1: 1000000
    return {
      BTC: '1538',
      USD: '100',
      EUR: '92',
      CNY: '725',
      ETH: '400000000000000',
      USDT: '1000000',
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

import type { MatrixRoom, MatrixMessage } from '../matrix/types';

export const mockChatService = {
  async getRooms(): Promise<MatrixRoom[]> {
    await delay();
    // Convert ChatRoom to MatrixRoom format
    return mockChatRooms.map(room => ({
      roomId: room.id,
      name: room.name,
      avatarUrl: room.avatar,
      isDirect: true,
      isEncrypted: true,
      lastMessage: room.lastMessage
        ? {
            id: `msg-${room.id}`,
            roomId: room.id,
            sender: room.peerID,
            content: room.lastMessage,
            type: 'text' as const,
            timestamp: new Date(room.lastMessageTime || Date.now()).getTime(),
          }
        : undefined,
      unreadCount: room.unreadCount,
      members: [
        {
          userId: room.peerID,
          displayName: room.name,
          avatarUrl: room.avatar,
        },
      ],
      timestamp: room.lastMessageTime ? new Date(room.lastMessageTime).getTime() : undefined,
    }));
  },

  async getMessages(roomId: string): Promise<MatrixMessage[]> {
    await delay();
    const messages = generateMockMessages(roomId);
    // Convert ChatMessage to MatrixMessage format
    return messages.map(msg => ({
      id: msg.id,
      roomId: roomId,
      sender: msg.senderId,
      senderName: msg.senderName,
      content: msg.content,
      type: 'text' as const,
      timestamp: new Date(msg.timestamp).getTime(),
      status: msg.status === 'sending' ? 'sending' : msg.status === 'failed' ? 'failed' : 'sent',
    }));
  },

  async sendMessage(roomId: string, content: string): Promise<MatrixMessage> {
    await delay(200);
    return {
      id: `msg-${Date.now()}`,
      roomId,
      sender: 'me',
      content,
      type: 'text' as const,
      timestamp: Date.now(),
      status: 'sent',
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
