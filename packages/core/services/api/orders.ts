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
        vendorListings: [
          {
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
        ],
        buyerOrder: {
          refundAddress: '0x' + Math.random().toString(16).slice(2, 42),
          refundFee: 0,
          buyerID: {
            peerID: orderItem.buyerID,
          },
          timestamp: orderItem.timestamp,
          items: [
            {
              listingHash: 'Qm' + Math.random().toString(36).slice(2, 48),
              quantity: orderItem.quantity,
            },
          ],
          payment: {
            method: orderItem.moderated ? 'MODERATED' : 'DIRECT',
            amount: orderItem.total.amount,
            coin: orderItem.paymentCoin,
          },
          version: 1,
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
 */
export interface CreateOrderData {
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
  address?: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    addressNotes?: string;
  };
  memo?: string;
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

  // 转换数据格式以匹配后端 API
  // 1. quantity 需要是字符串类型
  // 2. address 对象需要转换为扁平字段（address, city, state, shipTo, countryCode, postalCode, addressNotes）
  const { address, ...restData } = data;
  const apiData: Record<string, unknown> = {
    ...restData,
    items: data.items.map(item => ({
      ...item,
      quantity: String(item.quantity),
    })),
  };

  // 如果有地址，转换为扁平字段格式
  if (address) {
    apiData.address = address.street; // 后端期望 address 是地址行字符串
    apiData.city = address.city;
    apiData.state = address.state;
    apiData.shipTo = address.name; // 收件人姓名
    apiData.countryCode = address.country; // 后端使用 countryCode
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
 */
export async function confirmOrder(
  payload: { orderId: string; reject?: boolean; note?: string },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/confirm`;
    return post<{ success: boolean; error?: string }>(
      url,
      payload,
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    // Mock: 更新订单状态
    const order = mockOrders.find(o => o.orderID === payload.orderId);
    if (order) {
      order.state = payload.reject ? 'DECLINED' : 'AWAITING_FULFILLMENT';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/confirm');
}

/**
 * 发货（卖家）
 */
export async function fulfillOrder(
  fulfillObj: {
    orderId: string;
    physicalDelivery?: { shipper: string; trackingNumber: string }[];
    digitalDelivery?: { url?: string; password?: string };
    note?: string;
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/fulfill`;
    return post<{ success: boolean; error?: string }>(
      url,
      fulfillObj,
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === fulfillObj.orderId);
    if (order) {
      order.state = 'FULFILLED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/fulfill');
}

/**
 * 完成订单（买家）
 */
export async function completeOrder(
  payload: {
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
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/complete`;
    return post<{ success: boolean; error?: string }>(
      url,
      payload,
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === payload.orderId);
    if (order) {
      order.state = 'COMPLETED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/complete');
}

/**
 * 取消订单
 */
export async function cancelOrder(
  orderId: string,
  transactionId = '',
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/cancel`;
    return post<{ success: boolean; error?: string }>(
      url,
      { orderID: orderId, transactionID: transactionId },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === orderId);
    if (order) {
      order.state = 'CANCELED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/cancel');
}

/**
 * 退款订单
 */
export async function refundOrder(
  orderId: string,
  transactionId = '',
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/order/refund`;
    return post<{ success: boolean; error?: string }>(
      url,
      { orderID: orderId, transactionID: transactionId },
      getAuthHeaders(username, password)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === orderId);
    if (order) {
      order.state = 'REFUNDED';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/order/refund');
}

// ========== 支付相关 API ==========

/**
 * 提交支付数据（RWA 原子交换专用）
 * 用于通知后端支付已完成
 */
export interface SubmitPaymentData {
  orderID: string;
  transactionID: string;
  coin: string;
  amount: string;
  timestamp: string;
  method: number; // 3: RWA_ATOMIC_SWAP, 4: RWA_PAYMENT_LOCKED
  paymentTokenAddress?: string;
  contractAddress?: string;
  buyerReceiveAddress?: string;
  approvalTxHash?: string;
  contractOrderId?: string;
  rwaTradeMode?: number; // 0: Instant, 1: ConfirmRequired
  rwaOrderCompleted?: boolean;
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
    console.log('📤 [Mock] submitPayment:', paymentData);
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
 * - RWA Token 支付：返回 buyerAddress 和 vendorAddress（身份地址）
 * - 传统支付：返回 address 和 amount
 */
export interface PaymentInstructionsResponse {
  // 传统支付字段
  address?: string;
  amount?: number;
  // RWA Token 支付字段（身份地址）
  buyerAddress?: string;
  vendorAddress?: string;
  // 错误字段
  error?: string;
}

/**
 * 获取支付指令
 */
export async function getPaymentInstructions(
  requestData: { orderId: string; coin: string },
  username?: string,
  password?: string
): Promise<PaymentInstructionsResponse> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/instructions/order/payment`;
    return post<PaymentInstructionsResponse>(url, requestData, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    await mockDelay();
    return {
      address: '0x' + Math.random().toString(16).slice(2, 42),
      amount: 0.05,
      // Mock RWA Token 身份地址
      buyerAddress: '0x' + Math.random().toString(16).slice(2, 42),
      vendorAddress: '0x' + Math.random().toString(16).slice(2, 42),
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

  // 其他
  resendOrderMessage,
  markOrderAsRead,
};
