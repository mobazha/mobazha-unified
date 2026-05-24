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

import type { Product, ProductCategory, ProductListItem } from '../types/product';
import type { Order } from '../types/order';
import type { UserProfile } from '../types/user';
import type { Wallet, Transaction, FeeLevel, SendTransactionRequest } from '../types/wallet';
import type { CryptoType } from '../types/common';

// ============ Product Data Service ============

export const productDataService = {
  /**
   * 获取热门商品列表
   */
  async getTrendingProducts(): Promise<ProductListItem[]> {
    if (isMockMode()) {
      return mockServices.products.getTrendingProducts();
    }
    return await productsApi.fetchTrendingListings();
  },

  /**
   * 获取精选商品列表
   */
  async getFeaturedProducts(): Promise<ProductListItem[]> {
    if (isMockMode()) {
      return mockServices.products.getFeaturedProducts();
    }
    return await productsApi.fetchFeaturedListings();
  },

  /**
   * 获取店铺商品列表
   * 使用网关 API 直接获取，比搜索服务更可靠
   */
  async getStoreListings(peerID: string, _pageSize = 9): Promise<ProductListItem[]> {
    if (isMockMode()) {
      return mockServices.products.getStoreListings(peerID);
    }
    // 使用网关 API 直接获取店铺商品列表，比搜索服务 (fetchStoreListings) 更可靠
    // 搜索服务可能没有索引到某些店铺的数据
    return await productsApi.getStoreListingIndex(peerID);
  },

  /**
   * 获取我的商品列表
   */
  async getMyListings(): Promise<ProductListItem[]> {
    if (isMockMode()) {
      return mockServices.products.getMyListings();
    }
    return await productsApi.getListingIndex();
  },

  /**
   * 获取商品详情
   */
  async getProduct(slug: string, peerID?: string): Promise<Product | null> {
    if (isMockMode()) {
      return mockServices.products.getProduct(slug);
    }
    const result = await productsApi.getPublicListing(slug, peerID);
    return result.listing;
  },

  /**
   * Fetch a public product with offline status — used by buyer product detail page.
   * Unlike getProduct(), this preserves the isOffline flag from the API layer.
   */
  async getPublicProduct(
    slug: string,
    peerID?: string
  ): Promise<{ product: Product | null; isOffline: boolean }> {
    if (isMockMode()) {
      const product = await mockServices.products.getProduct(slug);
      return { product, isOffline: false };
    }
    const result = await productsApi.getPublicListing(slug, peerID);
    return { product: result.listing, isOffline: result.isOffline };
  },

  /**
   * 创建商品
   */
  async createListing(
    productDetails: Partial<Product>
  ): Promise<{ slug: string } | { error: string }> {
    if (isMockMode()) {
      return mockServices.products.createListing(productDetails);
    }
    return await productsApi.createListing(productDetails);
  },

  /**
   * 更新商品
   */
  async updateListing(
    productDetails: Partial<Product>
  ): Promise<{ success: boolean } | { error: string }> {
    if (isMockMode()) {
      return mockServices.products.updateListing(productDetails);
    }
    return await productsApi.updateListing(productDetails);
  },

  /**
   * 删除商品
   */
  async deleteListing(slug: string): Promise<{ success: boolean }> {
    if (isMockMode()) {
      return mockServices.products.deleteListing(slug);
    }
    return await productsApi.deleteListing(slug);
  },

  /**
   * 获取最新商品列表（SaaS 首页）
   */
  async getLatestProducts(limit = 12): Promise<ProductListItem[]> {
    if (isMockMode()) {
      return mockServices.products.getTrendingProducts();
    }
    return await productsApi.fetchLatestListings(limit);
  },

  /**
   * 获取热门商品列表（SaaS 首页）
   */
  async getPopularProducts(): Promise<ProductListItem[]> {
    if (isMockMode()) {
      return mockServices.products.getTrendingProducts();
    }
    return await productsApi.fetchFeaturedListings();
  },

  /**
   * 获取精选店铺（SaaS 首页）
   */
  async getFeaturedStores(limit = 6) {
    if (isMockMode()) {
      return [];
    }
    return await productsApi.fetchFeaturedStores(limit);
  },

  /**
   * 获取平台统计（SaaS 首页）
   */
  async getPlatformStats() {
    if (isMockMode()) {
      return { storeCount: 0, listingCount: 0 };
    }
    return await productsApi.fetchPlatformStats();
  },

  /**
   * 获取商品分类
   */
  async getCategories(): Promise<ProductCategory[]> {
    if (isMockMode()) {
      return mockServices.products.getCategories();
    }
    // 分类目前是静态的
    return [];
  },

  /**
   * 获取商品评价索引
   */
  async getProductRatings(slug: string, peerID?: string) {
    if (isMockMode()) {
      return mockServices.products.getProductRatings(slug);
    }
    return await productsApi.getRatingIndex(peerID, slug);
  },

  /**
   * 获取店铺评价索引（所有商品的评价汇总）
   */
  async getStoreRatings(peerID: string) {
    if (isMockMode()) {
      return { count: 0, average: 0, ratings: [] };
    }
    return await productsApi.getRatingIndex(peerID);
  },

  /**
   * 获取详细评价数据
   */
  async fetchRatings(ratingIDs: string[]) {
    if (isMockMode()) {
      return [];
    }
    return await productsApi.fetchRatings(ratingIDs);
  },
};

// ============ Order Data Service ============

export const orderDataService = {
  /**
   * 获取购买订单列表
   */
  async getPurchases(limit?: string, offsetId?: string): Promise<Order[]> {
    if (isMockMode()) {
      return mockServices.orders.getPurchases() as unknown as Order[];
    }
    return (await ordersApi.getPurchases(limit, offsetId)) as unknown as Order[];
  },

  /**
   * 获取销售订单列表
   */
  async getSales(limit?: string, offsetId?: string): Promise<Order[]> {
    if (isMockMode()) {
      return mockServices.orders.getSales() as unknown as Order[];
    }
    return (await ordersApi.getSales(limit, offsetId)) as unknown as Order[];
  },

  /**
   * 获取订单详情
   */
  async getOrder(orderId: string): Promise<Order | null> {
    if (isMockMode()) {
      return mockServices.orders.getOrder(orderId) as unknown as Order | null;
    }
    return await ordersApi.getOrderDetails(orderId);
  },

  /**
   * 确认订单（卖家）
   */
  async confirmOrder(orderID: string, decline = false) {
    if (isMockMode()) {
      return mockServices.orders.confirmOrder(orderID);
    }
    return await ordersApi.confirmOrder({ orderID, decline });
  },

  /**
   * 发货（卖家）
   */
  async shipOrder(params: {
    orderID: string;
    receivingAccountID?: number;
    shipments: Array<{
      physicalDelivery?: { shipper: string; trackingNumber: string };
      digitalDelivery?: { url?: string; password?: string };
      cryptocurrencyDelivery?: { transactionID: string };
      note?: string;
      itemIndex?: number;
    }>;
  }) {
    if (isMockMode()) {
      return mockServices.orders.shipOrder(params.orderID);
    }
    return await ordersApi.shipOrder(params);
  },

  /**
   * 完成订单（买家）
   */
  async completeOrder(params: {
    orderID: string;
    txID?: string;
    ratings?: Array<{
      slug: string;
      overall: number;
      review?: string;
    }>;
    anonymous?: boolean;
  }) {
    if (isMockMode()) {
      return mockServices.orders.completeOrder(params.orderID);
    }
    return await ordersApi.completeOrder(params);
  },

  /**
   * 取消订单
   */
  async cancelOrder(orderID: string, transactionID?: string) {
    if (isMockMode()) {
      return mockServices.orders.cancelOrder(orderID);
    }
    return await ordersApi.cancelOrder({ orderID, transactionID });
  },

  /**
   * 退款订单
   */
  async refundOrder(orderID: string, transactionID?: string) {
    if (isMockMode()) {
      return mockServices.orders.refundOrder(orderID);
    }
    return await ordersApi.refundOrder({ orderID, transactionID });
  },

  /**
   * 支付订单
   */
  async fundOrder(params: {
    coin: string;
    address: string;
    amount: string;
    orderId: string;
    memo?: string;
  }) {
    if (isMockMode()) {
      return mockServices.orders.fundOrder(params.orderId);
    }
    return await ordersApi.fundOrder(params);
  },

  /**
   * 开启争议
   */
  async openDispute(orderId: string, claim: string, evidenceHashes?: string[]) {
    if (isMockMode()) {
      return mockServices.orders.openDispute(orderId);
    }
    return await ordersApi.openDispute(orderId, claim, evidenceHashes);
  },

  async createPaymentSession(params: {
    orderId: string;
    paymentCoin: string;
    moderator?: string;
    vendorPeerID?: string;
  }) {
    return await ordersApi.createOrderPaymentSession(params);
  },
};

// ============ Profile Data Service ============

export const profileDataService = {
  /**
   * 获取当前用户资料
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    if (isMockMode()) {
      return mockServices.profile.getCurrentUser();
    }
    return await profileApi.getMyProfile();
  },

  /**
   * 更新当前用户资料
   */
  async updateProfile(
    data: Partial<UserProfile>
  ): Promise<{ success: boolean } | { error: string }> {
    if (isMockMode()) {
      return mockServices.profile.updateProfile(data);
    }
    return await profileApi.setProfile(data);
  },

  /**
   * 获取其他用户资料
   */
  async getUser(peerID: string): Promise<UserProfile | null> {
    if (isMockMode()) {
      return mockServices.profile.getUser(peerID);
    }
    return await profileApi.getProfile(peerID);
  },

  /**
   * 获取用户设置
   */
  async getSettings() {
    if (isMockMode()) {
      return mockServices.profile.getSettings();
    }
    return await profileApi.getSettings();
  },

  /**
   * 更新用户设置
   */
  async updateSettings(settings: Parameters<typeof profileApi.setSettings>[0]) {
    if (isMockMode()) {
      return mockServices.profile.updateSettings(settings);
    }
    return await profileApi.setSettings(settings);
  },

  /**
   * 获取 PeerID
   */
  async getPeerID(): Promise<string | null> {
    if (isMockMode()) {
      return mockServices.profile.getPeerID();
    }
    return await profileApi.getPeerID();
  },

  /**
   * 获取头像 URL
   */
  getAvatarUrl(peerID: string, size: 'tiny' | 'small' | 'medium' | 'large' = 'medium'): string {
    return profileApi.getAvatarUrl(peerID, size);
  },

  /**
   * 设置接受的币种
   */
  async setAcceptedCoins(coins: string[]) {
    if (isMockMode()) {
      return mockServices.profile.setAcceptedCoins(coins);
    }
    return await profileApi.setAcceptedCoins(coins);
  },

  /**
   * 举报用户
   */
  async reportUser(peerID: string, reason: string) {
    if (isMockMode()) {
      return mockServices.profile.reportUser(peerID, reason);
    }
    return await profileApi.reportProfile(peerID, reason);
  },
};

// ============ Wallet Data Service ============

export const walletDataService = {
  /**
   * 获取所有钱包余额
   */
  async getAllBalances(): Promise<Record<string, Wallet>> {
    if (isMockMode()) {
      return mockServices.wallet.getAllBalances() as unknown as Record<string, Wallet>;
    }
    const balances = await walletApi.getAllBalances();
    // Convert to Wallet type
    const wallets: Record<string, Wallet> = {};
    for (const [coin, balance] of Object.entries(balances)) {
      wallets[coin] = {
        type: coin as CryptoType,
        name: coin,
        address: '',
        balance: balance.confirmed,
        balanceUSD: 0,
        ...balance,
      };
    }
    return wallets;
  },

  /**
   * 获取单个币种余额
   */
  async getBalance(coin: string): Promise<Wallet | null> {
    if (isMockMode()) {
      return mockServices.wallet.getBalance(coin) as unknown as Wallet | null;
    }
    const balance = await walletApi.getBalance(coin as CryptoType);
    if (!balance) return null;
    return {
      type: coin as CryptoType,
      name: coin,
      address: '',
      balance: balance.confirmed,
      balanceUSD: 0,
      ...balance,
    };
  },

  /**
   * 获取交易历史
   */
  async getTransactions(coin: string, limit = 20): Promise<Transaction[]> {
    if (isMockMode()) {
      return mockServices.wallet.getTransactions(coin) as unknown as Transaction[];
    }
    return await walletApi.getTransactions(coin as CryptoType, limit);
  },

  /**
   * 获取钱包地址
   */
  async getAddress(coin: string): Promise<string | null> {
    if (isMockMode()) {
      return mockServices.wallet.getAddress(coin);
    }
    return await walletApi.getAddress(coin as CryptoType);
  },

  /**
   * 估算交易费用
   */
  async estimateFee(coin: string, amount: number) {
    if (isMockMode()) {
      return mockServices.wallet.estimateFee(coin, amount);
    }
    return await walletApi.estimateFee(coin as CryptoType, amount);
  },

  /**
   * 发送交易
   */
  async sendTransaction(params: {
    currency: string;
    address: string;
    amount: number;
    feeLevel?: FeeLevel;
    memo?: string;
    spendAll?: boolean;
  }) {
    if (isMockMode()) {
      return mockServices.wallet.sendTransaction(params);
    }
    const request: SendTransactionRequest = {
      currency: params.currency as CryptoType,
      address: params.address,
      amount: params.amount,
      feeLevel: params.feeLevel || 'NORMAL',
      memo: params.memo,
      spendAll: params.spendAll,
    };
    return await walletApi.sendTransaction(request);
  },

  /**
   * 获取汇率
   */
  async getExchangeRates(): Promise<Record<string, string>> {
    if (isMockMode()) {
      return mockServices.wallet.getExchangeRates();
    }
    return await walletApi.getExchangeRates();
  },

  /**
   * 检查钱包状态
   */
  async hasWallet(): Promise<boolean> {
    if (isMockMode()) {
      return mockServices.wallet.hasWallet();
    }
    return await walletApi.hasWallet();
  },

  /**
   * 获取助记词
   */
  async getMnemonic(): Promise<string | null> {
    if (isMockMode()) {
      return mockServices.wallet.getMnemonic();
    }
    return await walletApi.getMnemonic();
  },

  /**
   * 恢复钱包
   */
  async restoreWallet(mnemonic: string) {
    if (isMockMode()) {
      return mockServices.wallet.restoreWallet(mnemonic);
    }
    return await walletApi.restoreWallet(mnemonic);
  },
};

// ============ Chat Data Service ============

// Import Matrix client for real chat operations
import { matrixClient } from './matrix/client';
import type { MatrixRoom, MatrixMessage, MatrixConfig, InvitePolicy } from './matrix/types';

export const chatDataService = {
  /**
   * 初始化 Matrix 客户端
   */
  async initialize(config?: Partial<MatrixConfig>): Promise<boolean> {
    if (isMockMode()) {
      return true;
    }
    return await matrixClient.initialize(config);
  },

  /**
   * 登录 Matrix
   */
  async login(username: string, password: string): Promise<boolean> {
    if (isMockMode()) {
      return true;
    }
    return await matrixClient.login(username, password);
  },

  /**
   * 登出 Matrix
   */
  async logout(): Promise<void> {
    if (isMockMode()) {
      return;
    }
    await matrixClient.logout();
  },

  /**
   * 启动同步
   */
  async startSync(): Promise<void> {
    if (isMockMode()) {
      return;
    }
    await matrixClient.startSync();
  },

  /**
   * 停止同步
   */
  async stopSync(): Promise<void> {
    if (isMockMode()) {
      return;
    }
    await matrixClient.stopSync();
  },

  /**
   * 获取房间列表
   */
  async getRooms(): Promise<MatrixRoom[]> {
    if (isMockMode()) {
      return mockServices.chat.getRooms();
    }
    return await matrixClient.getRooms();
  },

  /**
   * 获取房间消息
   */
  async getMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    if (isMockMode()) {
      return mockServices.chat.getMessages(roomId);
    }
    return await matrixClient.getMessages(roomId, limit);
  },

  /**
   * 发送消息
   */
  async sendMessage(roomId: string, content: string): Promise<MatrixMessage | null> {
    if (isMockMode()) {
      const result = await mockServices.chat.sendMessage(roomId, content);
      return result as unknown as MatrixMessage;
    }
    return await matrixClient.sendMessage(roomId, content);
  },

  /**
   * 创建直接聊天房间
   */
  async createDirectRoom(userId: string, displayName?: string): Promise<string | null> {
    if (isMockMode()) {
      return `mock-room-${Date.now()}`;
    }
    return await matrixClient.createDirectRoom(userId, displayName);
  },

  /**
   * 加入房间
   */
  async joinRoom(roomIdOrAlias: string): Promise<boolean> {
    if (isMockMode()) {
      return true;
    }
    return await matrixClient.joinRoom(roomIdOrAlias);
  },

  /**
   * 离开房间
   */
  async leaveRoom(roomId: string): Promise<boolean> {
    if (isMockMode()) {
      return true;
    }
    return await matrixClient.leaveRoom(roomId);
  },

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    if (isMockMode()) {
      return true;
    }
    return matrixClient.isClientConnected();
  },

  /**
   * 获取当前用户 ID
   */
  getUserId(): string | null {
    if (isMockMode()) {
      return '@mock_user:matrix.org';
    }
    return matrixClient.getUserId();
  },

  /**
   * 设置邀请策略
   */
  setInvitePolicy(policy: InvitePolicy): void {
    if (isMockMode()) {
      return;
    }
    matrixClient.setInvitePolicy(policy);
  },

  /**
   * 获取邀请策略
   */
  getInvitePolicy(): InvitePolicy {
    if (isMockMode()) {
      return 'auto_mobazha';
    }
    return matrixClient.getInvitePolicy();
  },
};

// ============ Search Data Service ============

export interface SearchFilters {
  sortBy?: string;
  type?: string;
  productType?: string;
  rating?: number;
  shipping?: string;
  nsfw?: boolean;
}

// 搜索返回的用户类型（与 productsApi.SearchedUser 对齐）
export interface SearchUser {
  peerID: string;
  name: string;
  handle?: string;
  avatar?: string;
  shortDescription?: string;
  location?: string;
  listingCount: number;
  rating: number;
  reviewCount: number;
}

// 将 mock product 转换为 ProductListItem
function convertMockProductToListItem(mockProduct: {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  vendor: { peerID: string; name: string; avatar?: string };
  rating: number;
  reviewCount: number;
  contractType: string;
}): ProductListItem {
  return {
    slug: mockProduct.slug,
    title: mockProduct.title,
    price: {
      amount: mockProduct.price,
      currency: {
        code: mockProduct.currency,
        divisibility: 2,
      },
    },
    thumbnail: {
      tiny: mockProduct.images[0] || '',
      small: mockProduct.images[0] || '',
      medium: mockProduct.images[0] || '',
      large: mockProduct.images[0] || '',
      original: mockProduct.images[0] || '',
    },
    vendorPeerID: mockProduct.vendor.peerID,
    averageRating: mockProduct.rating,
    ratingCount: mockProduct.reviewCount,
    contractType: mockProduct.contractType as ProductListItem['contractType'],
  };
}

// 将 mock user 转换为 SearchUser
function convertMockUserToSearchUser(mockUser: {
  peerID: string;
  name: string;
  handle?: string;
  avatarHashes?: { medium?: string };
  shortDescription?: string;
  location?: string;
  stats?: {
    listingCount?: number;
    averageRating?: number;
    ratingCount?: number;
  };
}): SearchUser {
  return {
    peerID: mockUser.peerID,
    name: mockUser.name,
    handle: mockUser.handle,
    avatar: mockUser.avatarHashes?.medium,
    shortDescription: mockUser.shortDescription,
    location: mockUser.location,
    listingCount: mockUser.stats?.listingCount ?? 0,
    rating: mockUser.stats?.averageRating ?? 0,
    reviewCount: mockUser.stats?.ratingCount ?? 0,
  };
}

export const searchDataService = {
  /**
   * 搜索商品和用户
   */
  async search(
    query: string,
    type: 'all' | 'products' | 'users' = 'all',
    filters: SearchFilters = {}
  ): Promise<{
    products: ProductListItem[];
    users: SearchUser[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    if (isMockMode()) {
      const result = await mockServices.search.search(query, type);
      return {
        products: result.products.map(convertMockProductToListItem),
        users: result.users.map(convertMockUserToSearchUser),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      };
    }

    // 使用真实搜索 API
    const [productsResult, usersResult] = await Promise.all([
      type !== 'users'
        ? productsApi.searchListings({
            query,
            page: 0,
            pageSize: 20,
            ...filters,
          })
        : { products: [], total: 0, hasMore: false },
      type !== 'products'
        ? productsApi.searchProfiles({ query, page: 0, pageSize: 20 })
        : { users: [], total: 0, hasMore: false },
    ]);

    return {
      products: productsResult.products,
      users: usersResult.users,
      total: productsResult.total + usersResult.total,
      page: 1,
      pageSize: 20,
      hasMore: productsResult.hasMore || usersResult.hasMore,
    };
  },

  /**
   * 搜索商品
   */
  async searchProducts(
    query: string,
    page = 0,
    pageSize = 20,
    filters: SearchFilters = {}
  ): Promise<{
    products: ProductListItem[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    if (isMockMode()) {
      const result = await mockServices.search.search(query, 'products');
      return {
        products: result.products.map(convertMockProductToListItem),
        total: result.total,
        page,
        pageSize,
        hasMore: result.hasMore,
      };
    }

    // 使用真实搜索 API
    return productsApi.searchListings({
      query,
      page,
      pageSize,
      ...filters,
    });
  },

  /**
   * 搜索用户/店铺
   */
  async searchUsers(
    query: string,
    page = 0,
    pageSize = 20
  ): Promise<{
    users: SearchUser[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    if (isMockMode()) {
      const result = await mockServices.search.search(query, 'users');
      return {
        users: result.users.map(convertMockUserToSearchUser),
        total: result.users.length,
        page,
        pageSize,
        hasMore: false,
      };
    }

    // 使用真实搜索 API
    return productsApi.searchProfiles({
      query,
      page,
      pageSize,
    });
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
