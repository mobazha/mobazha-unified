/**
 * Mock Data for Development
 *
 * Centralized mock data that can be used across all services
 */

import type { Product, ProductCategory } from '../../types/product';
import type { Order } from '../../types/order';
import type { User, UserProfile } from '../../types/user';
import type { Wallet, Transaction } from '../../types/wallet';

// Helper to generate random IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// ============ Products ============

export const mockCategories: ProductCategory[] = [
  { id: '1', name: 'Electronics', slug: 'electronics', count: 150 },
  { id: '2', name: 'Fashion', slug: 'fashion', count: 200 },
  { id: '3', name: 'Home & Garden', slug: 'home-garden', count: 120 },
  { id: '4', name: 'Art & Collectibles', slug: 'art-collectibles', count: 80 },
  { id: '5', name: 'Services', slug: 'services', count: 60 },
  { id: '6', name: 'RWA Tokens', slug: 'rwa-tokens', count: 25 },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    slug: 'premium-headphones',
    title: 'Premium Wireless Headphones with Active Noise Cancellation',
    description:
      'Experience crystal-clear audio with our Premium Wireless Headphones. Featuring advanced Active Noise Cancellation technology.',
    price: 299.99,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=800&fit=crop',
    ],
    category: 'Electronics',
    tags: ['headphones', 'audio', 'wireless', 'noise-cancelling'],
    stock: 15,
    vendor: {
      peerID: 'QmVendor123',
      name: 'TechGear Store',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      rating: 4.8,
      reviewCount: 256,
    },
    rating: 4.8,
    reviewCount: 128,
    contractType: 'PHYSICAL_GOOD',
    acceptedCurrencies: ['BTC', 'ETH', 'USDT'],
    shipping: {
      freeShipping: true,
      estimatedDays: '3-5',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    slug: 'smart-watch-pro',
    title: 'Smart Watch Pro - Health & Fitness Tracker',
    description: 'Advanced smartwatch with comprehensive health monitoring features.',
    price: 449.99,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop'],
    category: 'Electronics',
    tags: ['smartwatch', 'fitness', 'health'],
    stock: 25,
    vendor: {
      peerID: 'QmVendor456',
      name: 'WearTech',
      rating: 4.6,
      reviewCount: 180,
    },
    rating: 4.6,
    reviewCount: 95,
    contractType: 'PHYSICAL_GOOD',
    acceptedCurrencies: ['BTC', 'ETH'],
    shipping: {
      freeShipping: true,
      estimatedDays: '2-4',
    },
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '3',
    slug: 'vintage-camera',
    title: 'Vintage Film Camera - Collector Edition',
    description: 'Authentic vintage camera from the 1970s, fully restored and functional.',
    price: 189.99,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=800&fit=crop'],
    category: 'Art & Collectibles',
    tags: ['camera', 'vintage', 'photography', 'collectible'],
    stock: 3,
    vendor: {
      peerID: 'QmVendor789',
      name: 'Retro Finds',
      rating: 4.9,
      reviewCount: 320,
    },
    rating: 4.9,
    reviewCount: 42,
    contractType: 'PHYSICAL_GOOD',
    acceptedCurrencies: ['BTC', 'ETH', 'USDT'],
    shipping: {
      freeShipping: false,
      estimatedDays: '5-7',
    },
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z',
  },
];

// Generate more mock products
export const generateMockProducts = (count: number = 20): Product[] => {
  const titles = [
    'Wireless Earbuds',
    'Laptop Stand',
    'USB-C Hub',
    'Mechanical Keyboard',
    'Gaming Mouse',
    'Monitor Light Bar',
    'Webcam HD',
    'Desk Mat',
    'Phone Holder',
    'Cable Organizer',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    slug: `product-${i + 1}`,
    title: titles[i % titles.length] + ` - Model ${i + 1}`,
    description: 'High quality product with excellent features.',
    price: Math.floor(Math.random() * 500) + 50,
    currency: 'USD',
    images: [
      `https://images.unsplash.com/photo-${1505740420928 + i * 1000}-5e560c06d30e?w=800&h=800&fit=crop`,
    ],
    category: mockCategories[i % mockCategories.length].name,
    tags: ['quality', 'popular'],
    stock: Math.floor(Math.random() * 50) + 1,
    vendor: {
      peerID: `QmVendor${i}`,
      name: `Store ${i + 1}`,
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      reviewCount: Math.floor(Math.random() * 200) + 10,
    },
    rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    reviewCount: Math.floor(Math.random() * 100) + 5,
    contractType: 'PHYSICAL_GOOD' as const,
    acceptedCurrencies: ['BTC', 'ETH'],
    shipping: {
      freeShipping: Math.random() > 0.5,
      estimatedDays: '3-7',
    },
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

// ============ Orders ============

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    orderNumber: 'ORD-2024-001',
    status: 'delivered',
    items: [
      {
        productId: '1',
        title: 'Premium Wireless Headphones',
        price: 299.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
      },
    ],
    total: 299.99,
    currency: 'USD',
    cryptoAmount: 0.0085,
    cryptoCurrency: 'BTC',
    vendor: {
      peerID: 'QmVendor123',
      name: 'TechGear Store',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    },
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      postalCode: '94102',
    },
    timeline: [
      { status: 'pending', timestamp: '2024-01-10T10:00:00Z', description: 'Order placed' },
      { status: 'confirmed', timestamp: '2024-01-10T10:30:00Z', description: 'Payment confirmed' },
      { status: 'shipped', timestamp: '2024-01-11T14:00:00Z', description: 'Package shipped' },
      {
        status: 'delivered',
        timestamp: '2024-01-14T16:00:00Z',
        description: 'Package delivered',
      },
    ],
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-14T16:00:00Z',
  },
  {
    id: 'ORD-002',
    orderNumber: 'ORD-2024-002',
    status: 'shipped',
    items: [
      {
        productId: '2',
        title: 'Smart Watch Pro',
        price: 449.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
      },
    ],
    total: 449.99,
    currency: 'USD',
    cryptoAmount: 0.18,
    cryptoCurrency: 'ETH',
    vendor: {
      peerID: 'QmVendor456',
      name: 'WearTech',
    },
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      postalCode: '94102',
    },
    timeline: [
      { status: 'pending', timestamp: '2024-01-15T09:00:00Z', description: 'Order placed' },
      { status: 'confirmed', timestamp: '2024-01-15T09:15:00Z', description: 'Payment confirmed' },
      { status: 'shipped', timestamp: '2024-01-16T11:00:00Z', description: 'Package shipped' },
    ],
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-16T11:00:00Z',
  },
  {
    id: 'ORD-003',
    orderNumber: 'ORD-2024-003',
    status: 'pending',
    items: [
      {
        productId: '3',
        title: 'Vintage Film Camera',
        price: 189.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&h=200&fit=crop',
      },
    ],
    total: 189.99,
    currency: 'USD',
    cryptoAmount: 189.99,
    cryptoCurrency: 'USDT',
    vendor: {
      peerID: 'QmVendor789',
      name: 'Retro Finds',
    },
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      postalCode: '94102',
    },
    timeline: [
      { status: 'pending', timestamp: '2024-01-20T14:00:00Z', description: 'Order placed' },
    ],
    createdAt: '2024-01-20T14:00:00Z',
    updatedAt: '2024-01-20T14:00:00Z',
  },
];

// ============ Users ============

export const mockCurrentUser: UserProfile = {
  peerID: 'QmMyPeerID123456',
  name: 'John Doe',
  shortDescription:
    'Passionate about decentralized commerce and crypto. Building the future of e-commerce.',
  location: 'San Francisco, CA',
  about: `Welcome to my store! I've been selling quality products on Mobazha since 2020.

I specialize in electronics, collectibles, and handmade crafts. Every item is carefully selected and verified for authenticity.`,
  avatarHashes: {
    medium: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  },
  headerHashes: {
    large: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop',
  },
  contactInfo: {
    email: 'john@example.com',
    phoneNumber: '+1 (555) 123-4567',
    website: 'https://johndoe.com',
  },
  stats: {
    listingCount: 45,
    followerCount: 234,
    followingCount: 56,
    ratingCount: 128,
    averageRating: 4.8,
  },
};

export const mockUsers: User[] = [
  {
    peerID: 'QmUser001',
    name: 'Alice Chen',
    shortDescription: 'Digital artist and NFT creator',
    location: 'Tokyo, Japan',
    avatarHashes: {},
    stats: {
      listingCount: 32,
      followerCount: 890,
      followingCount: 120,
      ratingCount: 156,
      averageRating: 4.9,
    },
  },
  {
    peerID: 'QmUser002',
    name: 'Bob Smith',
    shortDescription: 'Vintage electronics collector',
    location: 'London, UK',
    avatarHashes: {},
    stats: {
      listingCount: 78,
      followerCount: 456,
      followingCount: 89,
      ratingCount: 234,
      averageRating: 4.7,
    },
  },
];

// ============ Wallet ============

export const mockWallets: Wallet[] = [
  {
    type: 'BTC',
    name: 'Bitcoin',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    balance: 0.0523,
    balanceUSD: 2251.72,
    icon: '₿',
    color: '#F7931A',
  },
  {
    type: 'ETH',
    name: 'Ethereum',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E1234',
    balance: 1.245,
    balanceUSD: 2987.55,
    icon: 'Ξ',
    color: '#627EEA',
  },
  {
    type: 'USDT',
    name: 'Tether',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E5678',
    balance: 1500.0,
    balanceUSD: 1500.0,
    icon: '₮',
    color: '#26A17B',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: 'tx1',
    type: 'receive',
    amount: 0.015,
    currency: 'BTC',
    amountUSD: 645.3,
    timestamp: '2024-01-15T10:30:00Z',
    status: 'confirmed',
    from: 'bc1qabc...xyz',
    to: 'bc1qxy2...wlh',
    txHash: '0x1234567890abcdef',
    confirmations: 6,
    description: 'Payment received for Order #ORD-001',
  },
  {
    id: 'tx2',
    type: 'send',
    amount: 0.5,
    currency: 'ETH',
    amountUSD: 1199.5,
    timestamp: '2024-01-14T15:45:00Z',
    status: 'confirmed',
    from: '0x742d...1234',
    to: '0x9876...5432',
    txHash: '0xabcdef1234567890',
    confirmations: 12,
    description: 'Purchase - Smart Watch Pro',
  },
  {
    id: 'tx3',
    type: 'receive',
    amount: 500.0,
    currency: 'USDT',
    amountUSD: 500.0,
    timestamp: '2024-01-13T09:00:00Z',
    status: 'confirmed',
    from: '0xaaaa...bbbb',
    to: '0x742d...5678',
    txHash: '0x567890abcdef1234',
    confirmations: 20,
    description: 'Sale - Vintage Camera',
  },
  {
    id: 'tx4',
    type: 'send',
    amount: 0.005,
    currency: 'BTC',
    amountUSD: 215.1,
    timestamp: '2024-01-12T14:20:00Z',
    status: 'pending',
    from: 'bc1qxy2...wlh',
    to: 'bc1qdef...ghi',
    txHash: '0x890abcdef1234567',
    confirmations: 2,
    description: 'Withdrawal',
  },
];

// ============ Chat/Messages ============

export interface ChatRoom {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  peerID: string;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export const mockChatRooms: ChatRoom[] = [
  {
    id: 'room1',
    name: 'TechGear Store',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    lastMessage: 'Your order has been shipped!',
    lastMessageTime: '2024-01-15T10:30:00Z',
    unreadCount: 2,
    peerID: 'QmVendor123',
    isOnline: true,
  },
  {
    id: 'room2',
    name: 'WearTech',
    lastMessage: 'Thanks for your purchase!',
    lastMessageTime: '2024-01-14T16:45:00Z',
    unreadCount: 0,
    peerID: 'QmVendor456',
    isOnline: false,
  },
  {
    id: 'room3',
    name: 'Retro Finds',
    lastMessage: "I'll check the stock for you",
    lastMessageTime: '2024-01-13T11:20:00Z',
    unreadCount: 1,
    peerID: 'QmVendor789',
    isOnline: true,
  },
];

export const generateMockMessages = (_roomId: string): ChatMessage[] => {
  const messages: ChatMessage[] = [
    {
      id: 'msg1',
      content: 'Hi, I have a question about the product',
      senderId: 'me',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'read',
    },
    {
      id: 'msg2',
      content: 'Of course! How can I help you?',
      senderId: 'vendor',
      senderName: 'Store Support',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      status: 'read',
    },
    {
      id: 'msg3',
      content: 'Is this item still available?',
      senderId: 'me',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'read',
    },
    {
      id: 'msg4',
      content: 'Yes, we have 5 units in stock. Would you like to place an order?',
      senderId: 'vendor',
      senderName: 'Store Support',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'delivered',
    },
  ];

  return messages;
};

// ============ Search ============

export interface SearchResult {
  products: Product[];
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const mockSearch = (
  query: string,
  type: 'all' | 'products' | 'users' = 'all'
): SearchResult => {
  const filteredProducts =
    type === 'users'
      ? []
      : [...mockProducts, ...generateMockProducts(10)].filter(
          p =>
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase())
        );

  const filteredUsers =
    type === 'products'
      ? []
      : mockUsers.filter(
          u =>
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.shortDescription?.toLowerCase().includes(query.toLowerCase())
        );

  return {
    products: filteredProducts.slice(0, 20),
    users: filteredUsers,
    total: filteredProducts.length + filteredUsers.length,
    page: 1,
    pageSize: 20,
    hasMore: filteredProducts.length > 20,
  };
};
