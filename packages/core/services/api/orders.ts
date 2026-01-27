/**
 * 订单 API 服务
 */

import type { Order, OrderListItem } from '../../types';
import { get, post, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders } from './config';
import { withMockFallback, mockDelay, getApiMode } from './mode';

// ========== 订单类型定义 ==========

/**
 * 购买请求数据
 */
export interface PurchaseData {
  vendorId: string;
  items: Array<{
    listingHash: string;
    quantity: number;
    options?: Array<{
      name: string;
      value: string;
    }>;
    shipping?: {
      name: string;
      service: string;
    };
    memo?: string;
    coupons?: string[];
  }>;
  moderatorId?: string;
  paymentCoin: string;
  pricingCoin?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  addressNotes?: string;
}

/**
 * 订单估算结果
 */
export interface OrderEstimate {
  subtotal: string;
  shippingTotal: string;
  taxTotal: string;
  discountTotal: string;
  total: string;
  paymentCoin: string;
  pricingCoin: string;
}

/**
 * 创建订单结果
 */
export interface PurchaseResult {
  orderID: string;
  pricingCoin: string;
  amount: {
    amount: string;
    currency: {
      code: string;
      divisibility: number;
    };
  };
}

// ========== Mock 数据 ==========

// 辅助函数：创建图片对象
function createMockImage(url: string) {
  return {
    tiny: url,
    small: url,
    medium: url,
    large: url,
    original: url,
  };
}

const mockOrders: OrderListItem[] = [
  {
    orderID: 'QmOrderMock001',
    slug: 'premium-headphones',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    title: 'Premium Wireless Headphones',
    thumbnail: createMockImage(
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop'
    ),
    total: { amount: 29999, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1,
    vendorID: 'QmVendor123',
    vendorHandle: 'TechGear Store',
    buyerID: 'QmBuyer001',
    state: 'AWAITING_FULFILLMENT',
    read: true,
    paymentCoin: 'ETH',
    coinType: 'ETH',
    moderated: false,
    unreadChatMessages: 0,
  },
  {
    orderID: 'QmOrderMock002',
    slug: 'smart-watch-pro',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    title: 'Smart Watch Pro',
    thumbnail: createMockImage(
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop'
    ),
    total: { amount: 44999, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1,
    vendorID: 'QmVendor456',
    vendorHandle: 'WearTech',
    buyerID: 'QmBuyer001',
    state: 'FULFILLED',
    read: false,
    paymentCoin: 'BTC',
    coinType: 'BTC',
    moderated: true,
    unreadChatMessages: 2,
  },
  {
    orderID: 'QmOrderMock003',
    slug: 'vintage-camera',
    timestamp: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    title: 'Vintage Film Camera',
    thumbnail: createMockImage(
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&h=200&fit=crop'
    ),
    total: { amount: 18999, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1,
    vendorID: 'QmVendor789',
    vendorHandle: 'Retro Finds',
    buyerID: 'QmBuyer001',
    state: 'COMPLETED',
    read: true,
    paymentCoin: 'ETH',
    coinType: 'ETH',
    moderated: false,
    unreadChatMessages: 0,
  },
];

// ========== 订单查询 API ==========

/**
 * API 响应格式 - 购买订单
 * 后端返回 { purchases: OrderListItem[] }
 */
interface PurchasesResponse {
  purchases?: OrderListItem[];
}

/**
 * API 响应格式 - 销售订单
 * 后端返回 { sales: OrderListItem[] }
 */
interface SalesResponse {
  sales?: OrderListItem[];
}

/**
 * 获取购买订单列表
 */
export async function getPurchases(
  username?: string,
  password?: string,
  limit = '',
  offsetId = ''
): Promise<OrderListItem[]> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/purchases?limit=${limit}&offsetId=${offsetId}`;
    const response = await safeRequest<PurchasesResponse>(
      url,
      { headers: getAuthHeaders(username, password) },
      { purchases: [] }
    );
    // 从包装对象中提取数组
    return response.purchases || [];
  };

  const mockFn = async () => {
    await mockDelay();
    return mockOrders;
  };

  return withMockFallback(realFn, mockFn, '/ob/purchases');
}

/**
 * 获取销售订单列表
 */
export async function getSales(
  username?: string,
  password?: string,
  limit = '',
  offsetId = ''
): Promise<OrderListItem[]> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/sales?limit=${limit}&offsetId=${offsetId}`;
    const response = await safeRequest<SalesResponse>(
      url,
      { headers: getAuthHeaders(username, password) },
      { sales: [] }
    );
    // 从包装对象中提取数组
    return response.sales || [];
  };

  const mockFn = async () => {
    await mockDelay();
    // Mock sales - 可以返回不同的数据或修改状态
    return mockOrders.map(order => ({
      ...order,
      buyerID: 'QmBuyer' + Math.random().toString(36).slice(2, 8),
      buyerHandle: 'Buyer_' + Math.random().toString(36).slice(2, 6),
    }));
  };

  return withMockFallback(realFn, mockFn, '/ob/sales');
}

/**
 * 获取订单详情
 */
export async function getOrderDetails(
  orderId: string,
  username?: string,
  password?: string
): Promise<Order | null> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/order/${orderId}`;
    try {
      return await get<Order>(url, getAuthHeaders(username, password));
    } catch {
      return null;
    }
  };

  const mockFn = async () => {
    await mockDelay();
    const orderItem = mockOrders.find(o => o.orderID === orderId);
    if (!orderItem) return null;

    // 构建完整的订单详情（符合 Order 接口）
    const mockOrder: Order = {
      contract: {
        orderOpen: {
          buyerID: {
            peerID: orderItem.buyerID,
          },
          timestamp: orderItem.timestamp,
          pricingCoin: orderItem.paymentCoin,
          amount: orderItem.total.amount,
          items: [
            {
              listingHash: 'Qm' + Math.random().toString(36).slice(2, 48),
              quantity: orderItem.quantity,
            },
          ],
          listings: [
            {
              vendorID: {
                peerID: orderItem.vendorID,
                handle: orderItem.vendorHandle,
              },
              listing: {
                slug: orderItem.slug,
                vendorID: {
                  peerID: orderItem.vendorID,
                  handle: orderItem.vendorHandle,
                },
                metadata: {
                  contractType: 'PHYSICAL_GOOD',
                  format: 'FIXED_PRICE',
                  acceptedCurrencies: ['ETH', 'BTC'],
                  pricingCurrency: { code: 'USD', divisibility: 2 },
                },
                item: {
                  title: orderItem.title,
                  description: 'Mock product description',
                  price: orderItem.total.amount,
                  images: [orderItem.thumbnail],
                  categories: [],
                  tags: [],
                  grams: 0,
                  condition: 'NEW',
                  skus: [],
                  processingTime: '1-3 days',
                  nsfw: false,
                },
              },
            },
          ],
        },
        paymentSent: {
          method: orderItem.moderated ? 'MODERATED' : 'DIRECT',
          amount: orderItem.total.amount,
          coin: orderItem.paymentCoin,
        },
      },
      state: orderItem.state,
      read: orderItem.read,
      funded: orderItem.state !== 'PENDING' && orderItem.state !== 'AWAITING_PAYMENT',
      unreadChatMessages: orderItem.unreadChatMessages || 0,
      paymentAddressTransactions: [],
    };

    return mockOrder;
  };

  return withMockFallback(realFn, mockFn, `/ob/order/${orderId}`);
}

// ========== 订单创建 API ==========

/**
 * 创建订单请求数据（用于两阶段购买流程）
 *
 * 注意：后端 API 不需要 vendorId，它从 listingHash 中解析卖家信息
 */
export interface CreateOrderData {
  vendorId?: string; // 可选，仅用于前端内部逻辑，不会发送到后端
  items: Array<{
    listingHash: string;
    quantity: number;
    options?: Array<{
      name: string;
      value: string;
    }>;
    shipping?: {
      name: string;
      service: string;
    };
    memo?: string;
    coupons?: string[];
  }>;
  // 地址信息（仅物理商品需要）
  address?: {
    name: string; // 收件人姓名 -> shipTo
    street: string; // 地址行 -> address
    city: string;
    state: string;
    postalCode: string;
    country: string; // -> countryCode
    addressNotes?: string;
  };
  pricingCoin?: string; // 定价币种
  moderator?: string; // 仲裁人 ID
}

/**
 * 创建订单结果
 */
export interface CreateOrderResult {
  orderID: string;
  paymentAddress: string;
  amount: {
    amount: string;
    currency: {
      code: string;
      divisibility: number;
    };
  };
}

/**
 * 支付指令响应
 */
export interface PaymentInstructionsResult {
  paymentAddress: string;
  amount: string;
  buyerAddress?: string;
  vendorAddress?: string;
  moderatorAddress?: string;
  chainId?: number;
}

/**
 * 创建订单（不含支付）
 * 用于两阶段购买流程：先创建订单，后选择支付方式并支付
 *
 * 注意：此函数不使用 mock fallback，失败时直接抛出错误
 * 因为创建订单是关键操作，不应该静默使用假数据
 */
export async function createOrder(
  data: CreateOrderData,
  username?: string,
  password?: string
): Promise<CreateOrderResult> {
  const mode = getApiMode();

  // Mock 模式使用 mock 数据（仅用于开发测试）
  if (mode === 'mock') {
    await mockDelay();
    const newOrderId = 'Qm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return {
      orderID: newOrderId,
      paymentAddress: '0x' + Math.random().toString(16).slice(2, 42),
      amount: {
        amount: '99.99',
        currency: {
          code: 'USD',
          divisibility: 2,
        },
      },
    };
  }

  // Real/Auto 模式：调用真实 API，失败直接抛出错误（不回退到 mock）
  const url = `${getGatewayUrl()}/order/purchase`;

  // 转换数据格式以匹配后端 API (models.Purchase)
  // 后端期望的格式：
  // - 没有 vendorId（从 listingHash 解析）
  // - 地址是扁平字段：address, city, state, shipTo, countryCode, postalCode, addressNotes
  // - quantity 是字符串类型
  // - 有 pricingCoin 和 moderator 字段
  const { address, vendorId: _vendorId, ...restData } = data;
  void _vendorId; // vendorId 不发送到后端

  const apiData: Record<string, unknown> = {
    items: data.items.map(item => ({
      listingHash: item.listingHash,
      quantity: String(item.quantity),
      ...(item.options && item.options.length > 0 ? { options: item.options } : {}),
      ...(item.shipping ? { shipping: item.shipping } : {}),
      ...(item.memo ? { memo: item.memo } : {}),
      ...(item.coupons && item.coupons.length > 0 ? { coupons: item.coupons } : {}),
    })),
  };

  // 添加 pricingCoin（如果有）
  if (restData.pricingCoin) {
    apiData.pricingCoin = restData.pricingCoin;
  }

  // 添加 moderator（如果有）
  if (restData.moderator) {
    apiData.moderator = restData.moderator;
  }

  // 如果有地址，转换为扁平字段格式（仅物理商品）
  if (address) {
    apiData.address = address.street; // 地址行字符串
    apiData.city = address.city;
    apiData.state = address.state;
    apiData.shipTo = address.name; // 收件人姓名
    apiData.countryCode = address.country; // 国家代码
    apiData.postalCode = address.postalCode;
    if (address.addressNotes) {
      apiData.addressNotes = address.addressNotes;
    }
  }

  return post<CreateOrderResult>(url, apiData, getAuthHeaders(username, password));
}

/**
 * 创建购买订单（传统方法，包含支付币种）
 */
export async function purchaseListing(
  data: PurchaseData,
  username?: string,
  password?: string
): Promise<PurchaseResult> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/purchase`;
    return post<PurchaseResult>(url, data, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    await mockDelay();
    const newOrderId = 'QmOrderMock' + Date.now();
    return {
      orderID: newOrderId,
      pricingCoin: data.pricingCoin || 'USD',
      amount: {
        amount: '100.00',
        currency: {
          code: data.paymentCoin,
          divisibility: 8,
        },
      },
    };
  };

  return withMockFallback(realFn, mockFn, '/ob/purchase');
}

/**
 * 估算订单总价
 */
export async function estimateOrderTotal(
  data: PurchaseData,
  username?: string,
  password?: string
): Promise<OrderEstimate> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/estimatetotal`;
    return post<OrderEstimate>(url, data, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    await mockDelay();
    return {
      subtotal: '100.00',
      shippingTotal: '10.00',
      taxTotal: '0.00',
      discountTotal: '0.00',
      total: '110.00',
      paymentCoin: data.paymentCoin,
      pricingCoin: data.pricingCoin || 'USD',
    };
  };

  return withMockFallback(realFn, mockFn, '/ob/estimatetotal');
}

/**
 * 获取结账明细
 */
export async function getCheckoutBreakdown(
  data: PurchaseData,
  username?: string,
  password?: string
): Promise<OrderEstimate> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/checkoutbreakdown`;
    return post<OrderEstimate>(url, data, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    await mockDelay();
    return {
      subtotal: '100.00',
      shippingTotal: '10.00',
      taxTotal: '8.00',
      discountTotal: '5.00',
      total: '113.00',
      paymentCoin: data.paymentCoin,
      pricingCoin: data.pricingCoin || 'USD',
    };
  };

  return withMockFallback(realFn, mockFn, '/ob/checkoutbreakdown');
}

// ========== 订单状态操作 API ==========

/**
 * 确认订单（卖家）
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function confirmOrder(
  payload: {
    orderID: string;
    reject?: boolean;
    transactionID?: string;
    payoutAddress?: string;
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/confirm`;
    // 后端成功时返回 {}，HTTP 200 即表示成功
    await post<Record<string, unknown>>(url, payload, getAuthHeaders(username, password));
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    // Mock: 更新订单状态
    const order = mockOrders.find(o => o.orderID === payload.orderID);
    if (order) {
      order.state = payload.reject ? 'DECLINED' : 'AWAITING_FULFILLMENT';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/confirm');
}

/**
 * 发货（卖家）
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function fulfillOrder(
  payload: {
    orderID: string;
    physicalDelivery?: { shipper: string; trackingNumber: string };
    digitalDelivery?: { url?: string; password?: string };
    note?: string;
    itemIndex?: number;
    receivingAccountID?: number;
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/fulfill`;
    // 后端成功时返回 {}，HTTP 200 即表示成功
    await post<Record<string, unknown>>(url, payload, getAuthHeaders(username, password));
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === payload.orderID);
    if (order) {
      order.state = 'FULFILLED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/fulfill');
}

/**
 * 完成订单（买家）
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function completeOrder(
  payload: {
    orderID: string;
    txID?: string;
    ratings?: Array<{
      slug: string;
      overall: number;
      quality?: number;
      description?: number;
      deliverySpeed?: number;
      customerService?: number;
      review?: string;
    }>;
    anonymous?: boolean;
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/complete`;
    // 后端成功时返回 {}，HTTP 200 即表示成功
    await post<Record<string, unknown>>(url, payload, getAuthHeaders(username, password));
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === payload.orderID);
    if (order) {
      order.state = 'COMPLETED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/complete');
}

/**
 * 取消订单
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function cancelOrder(
  payload: { orderID: string; transactionID?: string },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/cancel`;
    // 后端成功时返回 {}，HTTP 200 即表示成功
    await post<Record<string, unknown>>(url, payload, getAuthHeaders(username, password));
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === payload.orderID);
    if (order) {
      order.state = 'CANCELED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/cancel');
}

/**
 * 退款订单
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function refundOrder(
  payload: { orderID: string; transactionID?: string },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/refund`;
    // 后端成功时返回 {}，HTTP 200 即表示成功
    await post<Record<string, unknown>>(url, payload, getAuthHeaders(username, password));
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === payload.orderID);
    if (order) {
      order.state = 'REFUNDED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/refund');
}

// ========== 支付相关 API ==========

/**
 * 提交支付数据
 * 用于通知后端支付已完成
 *
 * 注意：推荐直接使用后端 getPaymentInstructions 返回的 paymentData，
 * 只添加 transactionID 和 timestamp 字段（与移动端保持一致）
 */
export interface SubmitPaymentData {
  orderID: string;
  transactionID: string;
  coin: string;
  amount: number; // 必须是数字类型（后端期望 uint64）
  timestamp: string;
  method: number; // 1: DIRECT, 2: MODERATED, 3: RWA_ATOMIC_SWAP, 4: RWA_INSTANT
  // 支付目标地址（托管合约地址）- 后端验证必需
  toAddress?: string;
  // 支付者地址
  payerAddress?: string; // 付款人钱包地址
  // 仲裁相关
  moderator?: string; // 仲裁人 peerID
  moderatorAddress?: string; // 仲裁人钱包地址
  // 合约相关
  paymentTokenAddress?: string;
  contractAddress?: string;
  // RWA 相关
  buyerReceiveAddress?: string;
  approvalTxHash?: string;
  contractOrderId?: string;
  rwaTradeMode?: number; // 0: Instant, 1: ConfirmRequired
  rwaOrderCompleted?: boolean;
  // 允许其他后端返回的字段
  [key: string]: unknown;
}

/**
 * 提交支付
 */
export async function submitPayment(
  paymentData: SubmitPaymentData,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/payment`;
    return post<{ success: boolean; error?: string }>(
      url,
      { paymentData },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/payment');
}

/**
 * 支付订单
 */
export async function fundOrder(
  payload: {
    coin: string;
    address: string;
    amount: number;
    orderId: string;
    memo?: string;
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; txid?: string; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/orderspend`;
    return post<{ success: boolean; txid?: string; error?: string }>(
      url,
      {
        coinType: payload.coin,
        orderID: payload.orderId,
        address: payload.address,
        amount: payload.amount,
        feeLevel: 'ECONOMIC',
        memo: payload.memo,
        requireAssociateOrder: true,
      },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === payload.orderId);
    if (order) {
      order.state = 'AWAITING_FULFILLMENT';
    }
    return {
      success: true,
      txid: '0x' + Math.random().toString(16).slice(2, 66),
    };
  };

  return withMockFallback(realFn, mockFn, '/ob/orderspend');
}

/**
 * 支付指令响应类型
 *
 * 后端返回的完整数据结构，用于 EVM 链的智能合约支付
 */
export interface PaymentInstructionsResponse {
  // 交易指令（合约调用）
  instructions?: {
    to: string; // 合约地址
    data: string; // 合约调用数据（ABI 编码）
    value: string; // ETH 值（通常为 "0"）
  };
  // 支付数据（元数据）
  paymentData?: {
    orderID: string;
    transactionID?: string;
    coin: string;
    method: number;
    contractAddress: string; // 托管合约地址
    payerAddress?: string;
    moderator?: string;
    moderatorAddress?: string;
    amount: number; // 支付金额（最小单位）
    fromID?: string;
    toAddress?: string;
    toID?: string;
    script?: string;
    unlockHours?: number;
    paymentTokenAddress?: string; // ERC20 代币地址
    timestamp?: string;
  };
  // 托管账户地址
  escrowAccount?: string;
  // 外部钱包支付（UTXO 链）
  paymentType?: string;
  paymentAddress?: string;
  // 兼容旧字段
  address?: string;
  amount?: number;
  buyerAddress?: string;
  vendorAddress?: string;
  // 错误字段
  error?: string;
}

/**
 * 获取支付指令
 *
 * 注意：后端 API 期望的参数名是 orderID 和 coinType（大写）
 * 为了与前端代码风格保持一致，这里接受 orderId 和 coin，
 * 然后在内部转换为后端期望的格式
 */
export async function getPaymentInstructions(
  requestData: {
    orderId: string;
    coin: string;
    amount?: number; // 支付金额（最小单位）
    payerAddress?: string; // 付款人地址
    moderator?: string; // 仲裁人 peerID
  },
  username?: string,
  password?: string
): Promise<PaymentInstructionsResponse> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/instructions/order/payment`;
    // 转换为后端期望的参数名
    const backendRequestData: Record<string, unknown> = {
      orderID: requestData.orderId,
      coinType: requestData.coin,
    };
    // 添加可选参数
    if (requestData.amount !== undefined) {
      backendRequestData.amount = requestData.amount;
    }
    if (requestData.payerAddress) {
      backendRequestData.payerAddress = requestData.payerAddress;
    }
    if (requestData.moderator) {
      backendRequestData.moderator = requestData.moderator;
    }
    return post<PaymentInstructionsResponse>(
      url,
      backendRequestData,
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const mockContractAddress = '0x' + Math.random().toString(16).slice(2, 42);
    const mockEscrowAccount = '0x' + Math.random().toString(16).slice(2, 66);
    return {
      instructions: {
        to: mockContractAddress,
        data: '0x57bced76' + '0'.repeat(256), // Mock contract call data
        value: '0',
      },
      paymentData: {
        orderID: requestData.orderId,
        coin: requestData.coin,
        method: 1,
        contractAddress: mockContractAddress,
        amount: 1500, // Mock amount in minimal units
        unlockHours: 720,
        paymentTokenAddress: '0xF36BFeE8fd7F1950c0129714Faf6d1e1F94a66AA',
      },
      escrowAccount: mockEscrowAccount,
    };
  };

  return withMockFallback(realFn, mockFn, '/instructions/order/payment');
}

/**
 * 获取剩余支付金额
 */
export async function getPaymentRemaining(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ remaining?: number; paid?: number; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/${orderId}/payment/remaining`;
    return get<{ remaining?: number; paid?: number; error?: string }>(
      url,
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    return {
      remaining: 0,
      paid: 100.0,
    };
  };

  return withMockFallback(realFn, mockFn, `/order/${orderId}/payment/remaining`);
}

// ========== 争议相关 API ==========

/**
 * 开启争议
 */
export async function openDispute(
  orderId: string,
  claim: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/dispute/open`;
    return post<{ success: boolean; error?: string }>(
      url,
      { orderID: orderId, claim },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === orderId);
    if (order) {
      order.state = 'DISPUTED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/dispute/open');
}

/**
 * 接受争议裁决
 */
export async function acceptDispute(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/dispute/release`;
    return post<{ success: boolean; error?: string }>(
      url,
      { orderID: orderId },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === orderId);
    if (order) {
      order.state = 'RESOLVED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/dispute/release');
}

/**
 * 认领过期资金（卖家）
 * 当订单超时后，卖家可以认领资金
 */
export async function claimPayment(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/releaseAfterTimeout`;
    return post<{ success: boolean; error?: string }>(
      url,
      { orderID: orderId },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === orderId);
    if (order) {
      order.state = 'PAYMENT_FINALIZED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/ob/releaseAfterTimeout');
}

// ========== 其他 API ==========

/**
 * 重发订单消息
 */
export async function resendOrderMessage(
  orderId: string,
  messageType: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/resendordermessage`;
    return post<{ success: boolean; error?: string }>(
      url,
      { orderID: orderId, messageType },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/ob/resendordermessage');
}

/**
 * 标记订单为已读
 */
export async function markOrderAsRead(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/markorderasread`;
    return post<{ success: boolean; error?: string }>(
      url,
      { orderID: orderId },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === orderId);
    if (order) {
      order.read = true;
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/ob/markorderasread');
}

// ========== 导出 API 对象 ==========

/**
 * 订单 API 导出对象
 */
export const ordersApi = {
  // 查询
  getPurchases,
  getSales,
  getOrderDetails,

  // 创建
  createOrder,
  purchaseListing,
  estimateOrderTotal,
  getCheckoutBreakdown,

  // 状态操作
  confirmOrder,
  fulfillOrder,
  completeOrder,
  cancelOrder,
  refundOrder,

  // 支付
  submitPayment,
  fundOrder,
  getPaymentInstructions,
  getPaymentRemaining,

  // 争议
  openDispute,
  acceptDispute,
  claimPayment,

  // 其他
  resendOrderMessage,
  markOrderAsRead,
};
