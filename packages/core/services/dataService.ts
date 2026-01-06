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
import type { UserProfile, User } from '../types/user';
import type { Wallet, Transaction } from '../types/wallet';

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
   */
  async getStoreListings(peerID: string, pageSize = 9): Promise<ProductListItem[]> {
    if (isMockMode()) {
      return mockServices.products.getStoreListings(peerID);
    }
    return await productsApi.fetchStoreListings(peerID, pageSize);
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
    // 优先使用公开 API
    return await productsApi.getPublicListing(slug, peerID);
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
   * 获取商品评价
   */
  async getProductRatings(slug: string, peerID?: string) {
    if (isMockMode()) {
      return mockServices.products.getProductRatings(slug);
    }
    return await productsApi.getRatingIndex(peerID, slug);
  },
};

// ============ Order Data Service ============

export const orderDataService = {
  /**
   * 获取购买订单列表
   */
  async getPurchases(limit?: string, offsetId?: string): Promise<Order[]> {
    if (isMockMode()) {
      return mockServices.orders.getPurchases();
    }
    return (await ordersApi.getPurchases(
      undefined,
      undefined,
      limit,
      offsetId
    )) as unknown as Order[];
  },

  /**
   * 获取销售订单列表
   */
  async getSales(limit?: string, offsetId?: string): Promise<Order[]> {
    if (isMockMode()) {
      return mockServices.orders.getSales();
    }
    return (await ordersApi.getSales(undefined, undefined, limit, offsetId)) as unknown as Order[];
  },

  /**
   * 获取订单详情
   */
  async getOrder(orderId: string): Promise<Order | null> {
    if (isMockMode()) {
      return mockServices.orders.getOrder(orderId);
    }
    return await ordersApi.getOrderDetails(orderId);
  },

  /**
   * 确认订单（卖家）
   */
  async confirmOrder(orderId: string, reject = false, note?: string) {
    if (isMockMode()) {
      return mockServices.orders.confirmOrder(orderId);
    }
    return await ordersApi.confirmOrder({ orderId, reject, note });
  },

  /**
   * 发货（卖家）
   */
  async fulfillOrder(params: {
    orderId: string;
    physicalDelivery?: { shipper: string; trackingNumber: string }[];
    digitalDelivery?: { url?: string; password?: string };
    note?: string;
  }) {
    if (isMockMode()) {
      return mockServices.orders.fulfillOrder(params.orderId);
    }
    return await ordersApi.fulfillOrder(params);
  },

  /**
   * 完成订单（买家）
   */
  async completeOrder(params: {
    orderId: string;
    ratings?: Array<{
      slug: string;
      overall: number;
      quality?: number;
      description?: number;
      deliverySpeed?: number;
      customerService?: number;
      review?: string;
      anonymous?: boolean;
    }>;
  }) {
    if (isMockMode()) {
      return mockServices.orders.completeOrder(params.orderId);
    }
    return await ordersApi.completeOrder(params);
  },

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string, transactionId?: string) {
    if (isMockMode()) {
      return mockServices.orders.cancelOrder(orderId);
    }
    return await ordersApi.cancelOrder(orderId, transactionId);
  },

  /**
   * 退款订单
   */
  async refundOrder(orderId: string, transactionId?: string) {
    if (isMockMode()) {
      return mockServices.orders.refundOrder(orderId);
    }
    return await ordersApi.refundOrder(orderId, transactionId);
  },

  /**
   * 支付订单
   */
  async fundOrder(params: {
    coin: string;
    address: string;
    amount: number;
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
  async openDispute(orderId: string, claim: string) {
    if (isMockMode()) {
      return mockServices.orders.openDispute(orderId);
    }
    return await ordersApi.openDispute(orderId, claim);
  },

  /**
   * 获取支付指令
   */
  async getPaymentInstructions(orderId: string, coin: string) {
    if (isMockMode()) {
      return mockServices.orders.getPaymentInstructions(orderId, coin);
    }
    return await ordersApi.getPaymentInstructions({ orderId, coin });
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
      return mockServices.wallet.getAllBalances();
    }
    const balances = await walletApi.getAllBalances();
    // Convert to Wallet type
    const wallets: Record<string, Wallet> = {};
    for (const [coin, balance] of Object.entries(balances)) {
      wallets[coin] = {
        type: coin,
        ...balance,
      } as Wallet;
    }
    return wallets;
  },

  /**
   * 获取单个币种余额
   */
  async getBalance(coin: string): Promise<Wallet | null> {
    if (isMockMode()) {
      return mockServices.wallet.getBalance(coin);
    }
    const balance = await walletApi.getBalance(coin);
    if (!balance) return null;
    return {
      type: coin,
      ...balance,
    } as Wallet;
  },

  /**
   * 获取交易历史
   */
  async getTransactions(coin: string, limit = 20): Promise<Transaction[]> {
    if (isMockMode()) {
      return mockServices.wallet.getTransactions(coin);
    }
    return await walletApi.getTransactions(coin, limit);
  },

  /**
   * 获取钱包地址
   */
  async getAddress(coin: string): Promise<string | null> {
    if (isMockMode()) {
      return mockServices.wallet.getAddress(coin);
    }
    return await walletApi.getAddress(coin);
  },

  /**
   * 估算交易费用
   */
  async estimateFee(coin: string, amount: number) {
    if (isMockMode()) {
      return mockServices.wallet.estimateFee(coin, amount);
    }
    return await walletApi.estimateFee(coin, amount);
  },

  /**
   * 发送交易
   */
  async sendTransaction(params: {
    currency: string;
    address: string;
    amount: number;
    feeLevel?: 'PRIORITY' | 'NORMAL' | 'ECONOMIC';
    memo?: string;
    spendAll?: boolean;
  }) {
    if (isMockMode()) {
      return mockServices.wallet.sendTransaction(params);
    }
    return await walletApi.sendTransaction(params);
  },

  /**
   * 获取汇率
   */
  async getExchangeRates(): Promise<Record<string, Record<string, number>>> {
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

export const searchDataService = {
  /**
   * 搜索商品和用户
   */
  async search(query: string, type: 'all' | 'products' | 'users' = 'all') {
    if (isMockMode()) {
      return mockServices.search.search(query, type);
    }

    // Real API - 搜索商品时使用热门商品列表（简化实现）
    // 实际应用应使用搜索服务的 API
    const products = type !== 'users' ? await productsApi.fetchTrendingListings() : [];
    const filteredProducts = products.filter(p =>
      p.title.toLowerCase().includes(query.toLowerCase())
    );

    // 用户搜索暂时返回空
    const users: User[] = [];

    return {
      products: filteredProducts,
      users,
      total: filteredProducts.length + users.length,
      page: 1,
      pageSize: 20,
      hasMore: false,
    };
  },

  /**
   * 搜索商品
   */
  async searchProducts(query: string, page = 1, pageSize = 20) {
    if (isMockMode()) {
      const result = await mockServices.search.search(query, 'products');
      return {
        products: result.products,
        total: result.total,
        page,
        pageSize,
        hasMore: result.hasMore,
      };
    }

    // Real API call
    const products = await productsApi.fetchTrendingListings();
    const filtered = products.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));

    return {
      products: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
      hasMore: page * pageSize < filtered.length,
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
