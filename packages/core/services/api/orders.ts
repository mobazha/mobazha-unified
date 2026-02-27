/**
 * 订单 API 服务
 */

import type { Order, OrderListItem } from '../../types';
import { withMockFallback, mockDelay, getApiMode } from './mode';
import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authSafeGet } from './helpers';

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
export async function getPurchases(limit = '', offsetId = ''): Promise<OrderListItem[]> {
  const realFn = async () => {
    const response = await authSafeGet<PurchasesResponse>(
      `${NODE_API.PURCHASES}?limit=${limit}&offsetId=${offsetId}`,
      { purchases: [] }
    );
    return response.purchases || [];
  };

  const mockFn = async () => {
    await mockDelay();
    return mockOrders;
  };

  return withMockFallback(realFn, mockFn, '/purchases');
}

/**
 * 获取销售订单列表
 */
export async function getSales(limit = '', offsetId = ''): Promise<OrderListItem[]> {
  const realFn = async () => {
    const response = await authSafeGet<SalesResponse>(
      `${NODE_API.SALES}?limit=${limit}&offsetId=${offsetId}`,
      { sales: [] }
    );
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

  return withMockFallback(realFn, mockFn, '/sales');
}

/**
 * 获取订单详情
 */
export async function getOrderDetails(orderId: string): Promise<Order | null> {
  const realFn = async () => {
    try {
      return await authGet<Order>(NODE_API.ORDER(orderId));
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

  return withMockFallback(realFn, mockFn, `/orders/${orderId}`);
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
export async function createOrder(data: CreateOrderData): Promise<CreateOrderResult> {
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

  return authPost<CreateOrderResult>(NODE_API.ORDERS, apiData);
}

/**
 * 创建购买订单（传统方法，包含支付币种）
 */
export async function purchaseListing(data: PurchaseData): Promise<PurchaseResult> {
  const realFn = async () => {
    return authPost<PurchaseResult>(NODE_API.PURCHASE, data);
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

  return withMockFallback(realFn, mockFn, '/purchase');
}

/**
 * 估算订单总价
 */
export async function estimateOrderTotal(data: PurchaseData): Promise<OrderEstimate> {
  const realFn = async () => {
    return authPost<OrderEstimate>(NODE_API.ORDERS_ESTIMATE, data);
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

  return withMockFallback(realFn, mockFn, '/orders/estimate');
}

/**
 * 获取结账明细
 */
export async function getCheckoutBreakdown(data: PurchaseData): Promise<OrderEstimate> {
  const realFn = async () => {
    return authPost<OrderEstimate>(NODE_API.ORDERS_CHECKOUT_BREAKDOWN, data);
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

  return withMockFallback(realFn, mockFn, '/orders/checkout-breakdown');
}

// ========== 订单状态操作 API ==========

/**
 * 确认订单（卖家）
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function confirmOrder(payload: {
  orderID: string;
  reject?: boolean;
  transactionID?: string;
  payoutAddress?: string;
}): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    await authPost<Record<string, unknown>>(NODE_API.ORDER_CONFIRM(payload.orderID), payload);
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === payload.orderID);
    if (order) {
      order.state = payload.reject ? 'DECLINED' : 'AWAITING_FULFILLMENT';
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderID}/confirm`);
}

/**
 * 发货（卖家）
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function fulfillOrder(payload: {
  orderID: string;
  physicalDelivery?: { shipper: string; trackingNumber: string };
  digitalDelivery?: { url?: string; password?: string };
  note?: string;
  itemIndex?: number;
  receivingAccountID?: number;
}): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    await authPost<Record<string, unknown>>(NODE_API.ORDER_FULFILL(payload.orderID), payload);
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

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderID}/fulfill`);
}

/**
 * 完成订单（买家）
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function completeOrder(payload: {
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
}): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    await authPost<Record<string, unknown>>(NODE_API.ORDER_COMPLETE(payload.orderID), payload);
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

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderID}/complete`);
}

/**
 * 通用订单指令响应类型
 * 用于所有需要获取链上交易指令的操作（confirm/reject/cancel/refund/complete）
 */
export interface OrderInstructionsResponse {
  /** 支付链类型（如 ETHEREUM, SOLANA, BTC 等） */
  paymentChain?: string;
  /** 是否需要链上交易 */
  hasInstructions: boolean;
  /** 链上交易指令（EVM 或 Solana 格式） */
  instructions?: {
    to: string;
    data: string;
    value?: string;
  };
}

/**
 * 完成订单的链上交易指令响应类型
 * @deprecated 请使用 OrderInstructionsResponse
 */
export interface CompleteInstructionsResponse {
  /** 支付链类型（如 ETHEREUM, SOLANA 等） */
  paymentChain?: string;
  /** 是否需要链上交易 */
  hasInstructions: boolean;
  /** 链上交易指令（EVM 或 Solana 格式） */
  instructions?: unknown;
}

/**
 * 获取完成订单的链上交易指令
 * 用于 EVM/Solana 等需要钱包签名的支付方式
 *
 * @param params.orderID - 订单 ID
 * @param params.initiatorAddress - 发起者钱包地址
 * @returns 指令响应，包含是否需要链上交易以及交易指令
 */
export async function getCompleteInstructions(params: {
  orderID: string;
  initiatorAddress: string;
}): Promise<OrderInstructionsResponse> {
  const realFn = async () => {
    return authPost<OrderInstructionsResponse>(
      NODE_API.ORDER_INSTRUCTIONS_COMPLETE(params.orderID),
      params
    );
  };

  const mockFn = async (): Promise<OrderInstructionsResponse> => {
    await mockDelay();
    return {
      hasInstructions: false,
    };
  };

  return withMockFallback(realFn, mockFn, `/orders/${params.orderID}/instructions/complete`);
}

/**
 * 获取确认/拒绝订单的链上交易指令
 * 用于 EVM/Solana 等需要钱包签名的支付方式
 *
 * @param params.orderID - 订单 ID
 * @param params.reject - 是否拒绝订单（false=接受，true=拒绝）
 * @param params.initiatorAddress - 发起者钱包地址
 * @param params.payoutAddress - 卖家收款地址（接受订单时使用）
 * @returns 指令响应，包含是否需要链上交易以及交易指令
 */
export async function getConfirmInstructions(params: {
  orderID: string;
  reject: boolean;
  initiatorAddress: string;
  payoutAddress?: string;
}): Promise<OrderInstructionsResponse> {
  const realFn = async () => {
    return authPost<OrderInstructionsResponse>(
      NODE_API.ORDER_INSTRUCTIONS_CONFIRM(params.orderID),
      params
    );
  };

  const mockFn = async (): Promise<OrderInstructionsResponse> => {
    await mockDelay();
    return {
      hasInstructions: false,
    };
  };

  return withMockFallback(realFn, mockFn, `/orders/${params.orderID}/instructions/confirm`);
}

/**
 * 获取取消订单的链上交易指令
 * 用于 EVM/Solana 等需要钱包签名的支付方式
 *
 * @param params.orderID - 订单 ID
 * @param params.initiatorAddress - 发起者钱包地址
 * @returns 指令响应，包含是否需要链上交易以及交易指令
 */
export async function getCancelInstructions(params: {
  orderID: string;
  initiatorAddress: string;
}): Promise<OrderInstructionsResponse> {
  const realFn = async () => {
    return authPost<OrderInstructionsResponse>(
      NODE_API.ORDER_INSTRUCTIONS_CANCEL(params.orderID),
      params
    );
  };

  const mockFn = async (): Promise<OrderInstructionsResponse> => {
    await mockDelay();
    return {
      hasInstructions: false,
    };
  };

  return withMockFallback(realFn, mockFn, `/orders/${params.orderID}/instructions/cancel`);
}

/**
 * 获取退款订单的链上交易指令
 * 用于 EVM/Solana 等需要钱包签名的支付方式
 *
 * @param params.orderID - 订单 ID
 * @param params.initiatorAddress - 发起者钱包地址
 * @returns 指令响应，包含是否需要链上交易以及交易指令
 */
export async function getRefundInstructions(params: {
  orderID: string;
  initiatorAddress: string;
}): Promise<OrderInstructionsResponse> {
  const realFn = async () => {
    return authPost<OrderInstructionsResponse>(
      NODE_API.ORDER_INSTRUCTIONS_REFUND(params.orderID),
      params
    );
  };

  const mockFn = async (): Promise<OrderInstructionsResponse> => {
    await mockDelay();
    return {
      hasInstructions: false,
    };
  };

  return withMockFallback(realFn, mockFn, `/orders/${params.orderID}/instructions/refund`);
}

/**
 * 取消订单
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function cancelOrder(payload: {
  orderID: string;
  transactionID?: string;
}): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    await authPost<Record<string, unknown>>(NODE_API.ORDER_CANCEL(payload.orderID), payload);
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

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderID}/cancel`);
}

/**
 * 退款订单
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function refundOrder(payload: {
  orderID: string;
  transactionID?: string;
}): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    await authPost<Record<string, unknown>>(NODE_API.ORDER_REFUND(payload.orderID), payload);
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

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderID}/refund`);
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
  paymentData: SubmitPaymentData
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; error?: string }>(
      NODE_API.ORDER_PAYMENT(paymentData.orderID),
      { paymentData }
    );
  };

  const mockFn = async () => {
    await mockDelay();
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/orders/${paymentData.orderID}/payment`);
}

/**
 * 支付订单
 */
export async function fundOrder(payload: {
  coin: string;
  address: string;
  amount: number;
  orderId: string;
  memo?: string;
}): Promise<{ success: boolean; txid?: string; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; txid?: string; error?: string }>(
      NODE_API.ORDER_SPEND(payload.orderId),
      {
        coinType: payload.coin,
        orderID: payload.orderId,
        address: payload.address,
        amount: payload.amount,
        feeLevel: 'ECONOMIC',
        memo: payload.memo,
        requireAssociateOrder: true,
      }
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

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderId}/spend`);
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
export async function getPaymentInstructions(requestData: {
  orderId: string;
  coin: string;
  amount?: number; // 支付金额（最小单位）
  payerAddress?: string; // 付款人地址
  moderator?: string; // 仲裁人 peerID
}): Promise<PaymentInstructionsResponse> {
  const realFn = async () => {
    const backendRequestData: Record<string, unknown> = {
      orderID: requestData.orderId,
      coinType: requestData.coin,
    };
    if (requestData.amount !== undefined) {
      backendRequestData.amount = requestData.amount;
    }
    if (requestData.payerAddress) {
      backendRequestData.payerAddress = requestData.payerAddress;
    }
    if (requestData.moderator) {
      backendRequestData.moderator = requestData.moderator;
    }
    return authPost<PaymentInstructionsResponse>(
      NODE_API.ORDER_INSTRUCTIONS_PAYMENT(requestData.orderId),
      backendRequestData
    );
  };

  const mockFn = async () => {
    await mockDelay();
    const mockContractAddress = '0x' + Math.random().toString(16).slice(2, 42);
    const mockEscrowAccount = '0x' + Math.random().toString(16).slice(2, 66);
    return {
      instructions: {
        to: mockContractAddress,
        data: '0x57bced76' + '0'.repeat(256),
        value: '0',
      },
      paymentData: {
        orderID: requestData.orderId,
        coin: requestData.coin,
        method: 1,
        contractAddress: mockContractAddress,
        amount: 1500,
        unlockHours: 720,
        paymentTokenAddress: '0xF36BFeE8fd7F1950c0129714Faf6d1e1F94a66AA',
      },
      escrowAccount: mockEscrowAccount,
    };
  };

  return withMockFallback(realFn, mockFn, `/orders/${requestData.orderId}/instructions/payment`);
}

/**
 * 获取剩余支付金额
 */
export async function getPaymentRemaining(
  orderId: string
): Promise<{ remaining?: number; paid?: number; error?: string }> {
  const realFn = async () => {
    return authGet<{ remaining?: number; paid?: number; error?: string }>(
      NODE_API.ORDER_PAYMENT_REMAINING(orderId)
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
  claim: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; error?: string }>(NODE_API.DISPUTE_OPEN(orderId), {
      claim,
    });
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
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; error?: string }>(NODE_API.DISPUTE_RELEASE(orderId), {});
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
export async function claimPayment(orderId: string): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; error?: string }>(
      NODE_API.DISPUTE_RELEASE_AFTER_TIMEOUT(orderId),
      {}
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

  return withMockFallback(realFn, mockFn, '/releaseAfterTimeout');
}

// ========== 其他 API ==========

/**
 * 重发订单消息
 */
export async function resendOrderMessage(
  orderId: string,
  messageType: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; error?: string }>(NODE_API.RESEND_ORDER_MESSAGE, {
      orderID: orderId,
      messageType,
    });
  };

  const mockFn = async () => {
    await mockDelay();
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/resendordermessage');
}

/**
 * 标记订单为已读
 */
export async function markOrderAsRead(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; error?: string }>(NODE_API.MARK_ORDER_AS_READ, {
      orderID: orderId,
    });
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === orderId);
    if (order) {
      order.read = true;
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/markorderasread');
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

  // 操作指令（用于获取链上交易指令）
  getConfirmInstructions,
  getCancelInstructions,
  getRefundInstructions,
  getCompleteInstructions,

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
