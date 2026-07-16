/**
 * 订单 API 服务
 */

import type { Order, OrderListItem, PaymentSession, OnrampFundingSourceView } from '../../types';
import type { PaymentSelectionQuote } from '../../types/paymentSelectionQuote';
import type {
  CheckoutSupplyQuoteResponse,
  QuoteCheckoutSupplyRequest,
} from '../../types/supplyAvailability';
import { withMockFallback, mockDelay, getApiMode } from './mode';
import { NODE_API, type SettlementActionKind } from '../../config/apiPaths';
import { authGet, authPost, authSafeGet } from './helpers';
import { ApiError } from './client';
import { caseDetailToOrder } from '../../utils/transforms/caseToOrder';
import { mustCanonicalCoin, mustAssetIdFromTokenId } from '../../data/tokens';
import { orderUsesMonitoredBackendSettlement } from '../../utils/orderSettlement';
import { minimalAmountAsNumber } from '../../utils/transforms/priceTransform';
import {
  buildCollectiblePurchaseItemPayload,
  type CollectiblePurchaseFields,
} from '../../collectibles/metadata';

async function orderWrite<T>(
  realFn: () => Promise<T>,
  mockFn: () => Promise<T>,
  endpoint: string
): Promise<T> {
  if (getApiMode() === 'mock') {
    await mockDelay();
    return mockFn();
  }
  try {
    return await realFn();
  } catch (error) {
    console.error(`[ordersApi] Real write failed for ${endpoint}:`, error);
    throw error;
  }
}

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
  }>;
  discountCodes?: string[];
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
export interface DiscountDetailItem {
  discountID: string;
  title: string;
  code?: string;
  valueType: string;
  value: string;
  amount: string;
  auto?: boolean;
}

export interface OrderEstimate {
  subtotal: string;
  shippingTotal: string;
  taxTotal: string;
  discountTotal: string;
  total: string;
  paymentCoin: string;
  pricingCoin: string;
  discountDetails?: DiscountDetailItem[];
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
    vendorName: 'TechGear Store',
    buyerID: 'QmBuyer001',
    state: 'AWAITING_SHIPMENT',
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
    vendorName: 'WearTech',
    buyerID: 'QmBuyer001',
    state: 'SHIPPED',
    read: false,
    paymentCoin: 'ETH',
    coinType: 'ETH',
    moderated: true,
    unreadChatMessages: 2,
    settlementAction: 'complete',
    settlementActionId: 'settlement-action-complete-002',
    settlementState: 'submitted',
    settlementTxHash: '0x7d4f4e2f3a1e4b90c8f21938d6fd97cf14cb1db28a62df7df3fd7ab9d0be4202',
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
    vendorName: 'Retro Finds',
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
      buyerName: 'Buyer_' + Math.random().toString(36).slice(2, 6),
    }));
  };

  return withMockFallback(realFn, mockFn, '/sales');
}

/**
 * 获取订单详情
 */
export async function getOrderDetails(
  orderId: string,
  options?: { vendorPeerID?: string }
): Promise<Order | null> {
  const vendorPeerID = options?.vendorPeerID?.trim();
  const storeHeaders = vendorPeerID ? { 'X-Store-PeerID': vendorPeerID } : undefined;

  const realFn = async () => {
    try {
      return await authGet<Order>(NODE_API.ORDER(orderId), storeHeaders);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        try {
          const casePayload = await authGet<Record<string, unknown>>(NODE_API.CASE(orderId));
          return caseDetailToOrder(casePayload);
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const mockFn = async () => {
    await mockDelay();
    const orderItem = mockOrders.find(o => o.orderID === orderId);
    if (!orderItem) return null;
    const settlementActions = orderItem.settlementState
      ? [
          {
            actionId: orderItem.settlementActionId || `settlement-action-${orderItem.orderID}`,
            action: orderItem.settlementAction || 'complete',
            settlementAction: orderItem.settlementAction || 'complete',
            state: orderItem.settlementState,
            txHash: orderItem.settlementTxHash,
            relayTaskId: `relay-task-${orderItem.orderID.toLowerCase()}`,
            confirmations: orderItem.settlementState === 'confirmed' ? 12 : 0,
            updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          },
        ]
      : undefined;

    // 构建完整的订单详情（符合 Order 接口）
    const mockOrder: Order = {
      contract: {
        orderOpen: {
          buyerID: {
            peerID: orderItem.buyerID,
          },
          timestamp: orderItem.timestamp,
          pricingCoin: orderItem.paymentCoin,
          amount: minimalAmountAsNumber(orderItem.total.amount),
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
                name: orderItem.vendorName,
              },
              listing: {
                slug: orderItem.slug,
                vendorID: {
                  peerID: orderItem.vendorID,
                  name: orderItem.vendorName,
                },
                metadata: {
                  contractType: 'PHYSICAL_GOOD',
                  format: 'FIXED_PRICE',
                  acceptedCurrencies: [
                    mustAssetIdFromTokenId('ETH'),
                    mustAssetIdFromTokenId('BTC'),
                  ],
                  pricingCurrency: { code: 'USD', divisibility: 2 },
                },
                item: {
                  title: orderItem.title,
                  description: 'Mock product description',
                  price: minimalAmountAsNumber(orderItem.total.amount),
                  images: [
                    typeof orderItem.thumbnail === 'string'
                      ? createMockImage(orderItem.thumbnail)
                      : orderItem.thumbnail,
                  ],
                  productType: '',
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
          amount: minimalAmountAsNumber(orderItem.total.amount),
          coin: orderItem.paymentCoin,
        },
      },
      state: orderItem.state,
      settlementActions,
      read: orderItem.read,
      funded:
        orderItem.state !== 'PENDING' &&
        orderItem.state !== 'AWAITING_PAYMENT' &&
        orderItem.state !== 'AWAITING_PAYMENT_VERIFICATION',
      unreadChatMessages: orderItem.unreadChatMessages || 0,
      paymentAddressTransactions: [],
      protection: (() => {
        if (orderItem.state === 'SHIPPED') {
          return {
            stage: 'PROTECTION_PERIOD',
            daysRemaining: 8,
            autoCompleteAt: new Date(Date.now() + 8 * 86400000).toISOString(),
            extendable: true,
            extended: false,
            afterSaleWindowDays: 7,
          };
        }
        if (orderItem.state === 'AWAITING_SHIPMENT') {
          return {
            stage: 'ESCROWED',
            daysRemaining: 0,
            extendable: false,
            extended: false,
            afterSaleWindowDays: 7,
          };
        }
        if (orderItem.state === 'COMPLETED') {
          return {
            stage: 'COMPLETED',
            daysRemaining: 0,
            extendable: false,
            extended: false,
            afterSaleWindowDays: 7,
          };
        }
        return undefined;
      })(),
    };

    return mockOrder;
  };

  return withMockFallback(realFn, mockFn, `/orders/${orderId}`);
}

export async function getOrderPaymentSession(
  orderId: string,
  options?: { vendorPeerID?: string }
): Promise<PaymentSession | null> {
  const vendorPeerID = options?.vendorPeerID?.trim();
  const storeHeaders = vendorPeerID ? { 'X-Store-PeerID': vendorPeerID } : undefined;

  try {
    return await authGet<PaymentSession>(NODE_API.ORDER_PAYMENT_SESSION(orderId), storeHeaders);
  } catch (err) {
    // 404 = no session yet (order detail may treat as absent). Network/5xx must propagate
    // so payment readiness polling can show a retryable error, not seller-receipt waiting.
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export interface InitiateOrderOnrampFundingParams {
  orderId: string;
  providerID: string;
  fiatCurrency: string;
  /** Defaults to "primary" server-side: leave-and-resume returns the same purchase. */
  idempotencyKey?: string;
  deliverToBuyerWallet?: boolean;
  buyerWalletAddress?: string;
  vendorPeerID?: string;
}

/**
 * Initiates (or idempotently resumes) an onramp purchase funding the order's
 * current payable attempt (ADR-019). The settlement asset, network, and amount
 * are fixed by the frozen attempt terms; funded/verified still come only from
 * the on-chain funding observation.
 */
export async function initiateOrderOnrampFunding(
  params: InitiateOrderOnrampFundingParams
): Promise<OnrampFundingSourceView | null> {
  const { orderId, vendorPeerID, ...body } = params;
  const storeHeaders = vendorPeerID?.trim() ? { 'X-Store-PeerID': vendorPeerID.trim() } : undefined;
  return await authPost<OnrampFundingSourceView | null>(
    NODE_API.ORDER_PAYMENT_SESSION_ONRAMP(orderId),
    body,
    storeHeaders
  );
}

/** One provider a buyer may fund this order through (discovery view). */
export interface OnrampProviderOption {
  providerID: string;
  railID: string;
  deliverToTarget: boolean;
  fiatCurrencies?: string[];
}

/**
 * Lists the onramp providers whose capability gate is open for the order's
 * frozen settlement rail. Empty means the affordance must not render; the
 * client never assumes a specific vendor (RFC-0012 Proposal 4).
 */
export async function getOrderOnrampProviders(
  orderId: string,
  options?: { vendorPeerID?: string }
): Promise<OnrampProviderOption[]> {
  const vendorPeerID = options?.vendorPeerID?.trim();
  const storeHeaders = vendorPeerID ? { 'X-Store-PeerID': vendorPeerID } : undefined;
  const list = await authGet<OnrampProviderOption[]>(
    NODE_API.ORDER_PAYMENT_SESSION_ONRAMP_PROVIDERS(orderId),
    storeHeaders
  );
  return Array.isArray(list) ? list : [];
}

/**
 * Polls the onramp provider for the order's in-flight purchase and persists
 * the transition. Once a purchase exists, returns its latest durable
 * lifecycle view; null means no purchase exists.
 */
export async function refreshOrderOnrampFunding(
  orderId: string,
  options?: { vendorPeerID?: string }
): Promise<OnrampFundingSourceView | null> {
  const vendorPeerID = options?.vendorPeerID?.trim();
  const storeHeaders = vendorPeerID ? { 'X-Store-PeerID': vendorPeerID } : undefined;
  return await authPost<OnrampFundingSourceView | null>(
    NODE_API.ORDER_PAYMENT_SESSION_ONRAMP_REFRESH(orderId),
    undefined,
    storeHeaders
  );
}

export interface CreateOrderPaymentSessionData {
  orderId: string;
  paymentCoin: string;
  vendorPeerID?: string;
  refundAddress?: string;
  payFromCustodial?: boolean;
  buyerPeerID?: string;
  payerAddress?: string;
  moderator?: string;
  paymentSelectionQuoteID?: string;
  fiatAmountCents?: number;
  fiatDescription?: string;
  fiatReturnURL?: string;
  fiatCancelURL?: string;
}

export interface CreateOrderPaymentSelectionQuoteData {
  orderId: string;
  paymentCoin: string;
  vendorPeerID?: string;
}

export async function createOrderPaymentSelectionQuote(
  payload: CreateOrderPaymentSelectionQuoteData
): Promise<PaymentSelectionQuote> {
  const paymentCoin = resolveCanonicalPaymentCoin(payload.paymentCoin);
  const vendorPeerID = payload.vendorPeerID?.trim();

  const realFn = async () => {
    return authPost<PaymentSelectionQuote>(
      NODE_API.ORDER_PAYMENT_SELECTION_QUOTES(payload.orderId),
      { paymentCoin },
      vendorPeerID ? { 'X-Store-PeerID': vendorPeerID } : undefined
    );
  };

  const mockFn = async (): Promise<PaymentSelectionQuote> => {
    await mockDelay();
    const now = Date.now();
    return {
      id: `psq_${payload.orderId}_${paymentCoin.replace(/[:]/g, '_')}`,
      orderID: payload.orderId,
      feeQuoteID: 'mock-fee-quote',
      dealLinkID: 'mock-deal-link',
      dealRevision: 1,
      termsHash: 'mock-terms-hash',
      schemaVersion: 1,
      policyVersion: 'deal-payment-selection-zero-fee-v1',
      pricingCurrency: 'USD',
      pricingAmount: '4999',
      pricingDivisibility: 2,
      paymentCoin,
      paymentCurrency: paymentCoin.startsWith('fiat:') ? 'USD' : 'BTC',
      paymentDivisibility: paymentCoin.startsWith('fiat:') ? 2 : 8,
      conversionRequired: !paymentCoin.startsWith('fiat:'),
      exchangeRate: paymentCoin.startsWith('fiat:') ? '100' : '6500000',
      exchangeRateBase: paymentCoin.startsWith('fiat:') ? 'USD' : 'BTC',
      exchangeRateQuote: 'USD',
      exchangeRateQuoteDivisibility: 2,
      rateSourceUpdatedAt: new Date(now).toISOString(),
      paymentSubtotal: paymentCoin.startsWith('fiat:') ? '4999' : '100000000',
      providerOrNetworkCost: '0',
      platformPaymentCost: '0',
      buyerPaymentTotal: paymentCoin.startsWith('fiat:') ? '4999' : '100000000',
      expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
      createdAt: new Date(now).toISOString(),
    };
  };

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderId}/payment-selection-quotes`);
}

export async function createOrderPaymentSession(
  payload: CreateOrderPaymentSessionData
): Promise<PaymentSession> {
  const realFn = async () => {
    const paymentCoin = resolveCanonicalPaymentCoin(payload.paymentCoin);
    const vendorPeerID = payload.vendorPeerID?.trim();
    return authPost<PaymentSession>(
      NODE_API.ORDER_PAYMENT_SESSION(payload.orderId),
      {
        paymentCoin,
        ...(payload.refundAddress ? { refundAddress: payload.refundAddress } : {}),
        ...(payload.payFromCustodial ? { payFromCustodial: true } : {}),
        ...(payload.buyerPeerID ? { buyerPeerID: payload.buyerPeerID } : {}),
        ...(payload.payerAddress ? { payerAddress: payload.payerAddress } : {}),
        ...(payload.moderator ? { moderator: payload.moderator } : {}),
        ...(payload.paymentSelectionQuoteID
          ? { paymentSelectionQuoteID: payload.paymentSelectionQuoteID }
          : {}),
        ...(payload.fiatAmountCents ? { fiatAmountCents: payload.fiatAmountCents } : {}),
        ...(payload.fiatDescription ? { fiatDescription: payload.fiatDescription } : {}),
        ...(payload.fiatReturnURL ? { fiatReturnURL: payload.fiatReturnURL } : {}),
        ...(payload.fiatCancelURL ? { fiatCancelURL: payload.fiatCancelURL } : {}),
      },
      vendorPeerID ? { 'X-Store-PeerID': vendorPeerID } : undefined
    );
  };

  const mockFn = async (): Promise<PaymentSession> => {
    await mockDelay();
    const paymentCoin = resolveCanonicalPaymentCoin(payload.paymentCoin);
    return {
      sessionID: `ps_${payload.orderId}`,
      orderID: payload.orderId,
      paymentCoin,
      settlementMode: 'address_monitored',
      productMode: payload.moderator ? 'moderated' : 'cancelable',
      status: 'awaiting_funds',
      expectedAmount: '0.015',
      expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      fundingTarget: {
        type: 'address',
        address: 'bc1qmockpaymentaddress0000000000000000000000',
        assetID: paymentCoin,
        amount: '0.015',
      },
      paymentProgress: {
        observedAmount: '0',
        requiredAmount: '0.015',
        remainingAmount: '0.015',
        observationCount: 0,
        fundingState: 'awaiting_funds',
      },
    };
  };

  return orderWrite(realFn, mockFn, `/orders/${payload.orderId}/payment-session`);
}

export interface SetOrderRefundAddressData {
  orderId: string;
  refundAddress: string;
  paymentCoin?: string;
  vendorPeerID?: string;
}

export async function setOrderRefundAddress(
  payload: SetOrderRefundAddressData
): Promise<{ orderID: string; refundAddress: string; paymentCoin: string }> {
  const vendorPeerID = payload.vendorPeerID?.trim();
  return authPost<{ orderID: string; refundAddress: string; paymentCoin: string }>(
    NODE_API.ORDER_REFUND_ADDRESS(payload.orderId),
    {
      refundAddress: payload.refundAddress.trim(),
      ...(payload.paymentCoin ? { paymentCoin: payload.paymentCoin } : {}),
    },
    vendorPeerID ? { 'X-Store-PeerID': vendorPeerID } : undefined
  );
}

// ========== 订单创建 API ==========

/**
 * 创建订单请求数据（用于两阶段购买流程）
 *
 * 注意：后端 API 不需要 vendorId，它从 listingHash 中解析卖家信息
 */
export interface CreateOrderData {
  vendorId?: string;
  discountCodes?: string[];
  items: Array<
    {
      listingHash: string;
      quantity: number;
      options?: Array<{
        name: string;
        value: string;
      }>;
      shipping?: {
        name: string;
        service: string;
        zoneId?: string;
        rateId?: string;
      };
      memo?: string;
    } & CollectiblePurchaseFields
  >;
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
  refundAddress?: string; // 买家显式声明的退款钱包地址（托管/交易所付款或无法自动解析时填写）
  moderator?: string; // 仲裁人 ID
  affiliateReferralSessionID?: string; // 卖家范围内的推广归因会话
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
      ...buildCollectiblePurchaseItemPayload(item),
    })),
  };

  // 添加 discountCodes（如果有）
  if (restData.discountCodes && restData.discountCodes.length > 0) {
    apiData.discountCodes = restData.discountCodes;
  }

  // 添加 pricingCoin（如果有）
  if (restData.pricingCoin) {
    apiData.pricingCoin = restData.pricingCoin;
  }

  // 添加显式退款钱包地址（法币订单后端会忽略）
  if (restData.refundAddress) {
    apiData.refundAddress = restData.refundAddress;
  }

  // 添加 moderator（如果有）
  if (restData.moderator) {
    apiData.moderator = restData.moderator;
  }

  if (restData.affiliateReferralSessionID?.trim()) {
    apiData.affiliateReferralSessionID = restData.affiliateReferralSessionID.trim();
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

  return authPost<CreateOrderResult>(
    NODE_API.ORDERS,
    apiData,
    _vendorId?.trim() ? { 'X-Store-PeerID': _vendorId.trim() } : undefined
  );
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

/** Advisory supply preflight for authenticated checkout — does not hold inventory. */
export async function quoteCheckoutSupply(
  data: QuoteCheckoutSupplyRequest,
  options?: { vendorPeerID?: string }
): Promise<CheckoutSupplyQuoteResponse> {
  const realFn = async () => {
    const vendorPeerID = options?.vendorPeerID?.trim();
    return authPost<CheckoutSupplyQuoteResponse>(
      NODE_API.ORDERS_SUPPLY_QUOTE,
      data,
      vendorPeerID ? { 'X-Store-PeerID': vendorPeerID } : undefined
    );
  };

  const mockFn = async () => {
    await mockDelay();
    return {
      items: data.items.map(item => ({
        listingSlug: item.listingSlug,
        quantity: item.quantity,
        status: 'unknown' as const,
        available: false,
        reason: 'supply_availability_disabled',
      })),
      canSell: true,
      reason: 'supply_availability_disabled',
    };
  };

  return withMockFallback(realFn, mockFn, '/orders/supply-quote');
}

// ========== 订单状态操作 API ==========

/**
 * 确认订单（卖家）
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function confirmOrder(payload: {
  orderID: string;
  decline?: boolean;
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
      order.state = payload.decline ? 'DECLINED' : 'AWAITING_SHIPMENT';
    }
    return { success: true };
  };

  return orderWrite(realFn, mockFn, `/orders/${payload.orderID}/confirm`);
}

export interface SettlementActionResponse {
  mode?: string;
  actionId?: string;
  escrowAddr?: string;
  txHash?: string;
  paymentChain?: string;
  paymentCoin?: string;
}

export async function executeSettlementAction(payload: {
  orderID: string;
  action: SettlementActionKind;
  payoutAddress?: string;
}): Promise<SettlementActionResponse> {
  const realFn = async () => {
    return authPost<SettlementActionResponse>(
      NODE_API.ORDER_SETTLEMENT_ACTION(payload.orderID, payload.action),
      { payoutAddress: payload.payoutAddress }
    );
  };

  const mockFn = async (): Promise<SettlementActionResponse> => {
    await mockDelay();
    return {
      mode: 'completed',
      actionId: `mock-${payload.action}-${payload.orderID}`,
    };
  };

  return orderWrite(
    realFn,
    mockFn,
    `/orders/${payload.orderID}/settlement-actions/${payload.action}`
  );
}

export interface SettlementActionStatusResponse {
  actionId?: string;
  state?: string;
  txHash?: string;
  confirmations?: number;
  lastError?: string;
  relayTaskId?: string;
  orderId?: string;
  settlementAction?: string;
  paymentChain?: string;
  paymentCoin?: string;
}

export async function getSettlementActionStatus(payload: {
  orderID: string;
  action: SettlementActionKind;
  actionId: string;
}): Promise<SettlementActionStatusResponse> {
  return authGet<SettlementActionStatusResponse>(
    NODE_API.ORDER_SETTLEMENT_ACTION_STATUS(payload.orderID, payload.action, payload.actionId)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableSettlementStatusError(err: unknown): boolean {
  if (err instanceof ApiError) {
    const status = err.status;
    if (status === 404 || status === 429 || status === 503) {
      return true;
    }
    return status != null && status >= 500;
  }
  return true;
}

/** Poll settlement status until a tx hash is available. */
export async function awaitSettlementActionTxHash(payload: {
  orderID: string;
  action: SettlementActionKind;
  actionId: string;
  intervalMs?: number;
  timeoutMs?: number;
}): Promise<SettlementActionResponse> {
  const intervalMs = payload.intervalMs ?? 2000;
  const timeoutMs = payload.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const status = await getSettlementActionStatus({
        orderID: payload.orderID,
        action: payload.action,
        actionId: payload.actionId,
      });
      const state = (status.state || '').trim().toLowerCase();
      if (status.txHash) {
        return {
          mode: 'submitted',
          actionId: payload.actionId,
          txHash: status.txHash,
          paymentChain: status.paymentChain,
          paymentCoin: status.paymentCoin,
        };
      }
      if (state === 'failed' || state === 'abandoned' || state === 'error') {
        throw new Error(status.lastError || 'Settlement action failed');
      }
    } catch (err) {
      if (isRetryableSettlementStatusError(err)) {
        await sleep(intervalMs);
        continue;
      }
      throw err;
    }
    await sleep(intervalMs);
  }

  throw new Error('Timed out waiting for settlement transaction');
}

/**
 * 发货（卖家）
 * 注意：后端成功时返回空对象 {}，因此 HTTP 200 即表示成功
 */
export async function shipOrder(payload: {
  orderID: string;
  receivingAccountID?: number;
  shipments: Array<{
    physicalDelivery?: { shipper: string; trackingNumber: string };
    digitalDelivery?: { url?: string; password?: string };
    cryptocurrencyDelivery?: { transactionID: string };
    note?: string;
    itemIndex?: number;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    await authPost<Record<string, unknown>>(NODE_API.ORDER_SHIP(payload.orderID), payload);
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    const order = mockOrders.find(o => o.orderID === payload.orderID);
    if (order) {
      order.state = 'SHIPPED';
    }
    return { success: true };
  };

  return orderWrite(realFn, mockFn, `/orders/${payload.orderID}/ship`);
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
    review?: string;
    imageHashes?: string[];
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

  return orderWrite(realFn, mockFn, `/orders/${payload.orderID}/complete`);
}

/**
 * Standalone rating for already-completed orders (POST /v1/orders/{orderID}/rate)
 */
export async function rateOrder(payload: {
  orderID: string;
  ratings: Array<{
    slug: string;
    overall: number;
    review?: string;
    imageHashes?: string[];
  }>;
  anonymous?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    await authPost<Record<string, unknown>>(NODE_API.ORDER_RATE(payload.orderID), payload);
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderID}/rate`);
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

  return orderWrite(realFn, mockFn, `/orders/${payload.orderID}/cancel`);
}

/**
 * Extend the buyer protection period (one-time, physical goods only).
 * Returns updated protection info on success.
 */
export async function extendProtection(
  orderID: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    await authPost<Record<string, unknown>>(NODE_API.ORDER_EXTEND_PROTECTION(orderID), {});
    return { success: true };
  };

  const mockFn = async () => {
    await mockDelay();
    return { success: true };
  };

  return orderWrite(realFn, mockFn, `/orders/${orderID}/extend-protection`);
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

  return orderWrite(realFn, mockFn, `/orders/${payload.orderID}/refund`);
}

// ========== 支付相关 API ==========

/**
 * 提交支付数据
 * 用于通知后端支付已完成
 *
 * 旧支付指令路径已退役；新支付入口使用 PaymentSession。
 */
export interface SubmitPaymentData {
  orderID: string;
  transactionID: string;
  coin: string;
  amount: string; // 字符串传输，避免 JS number 精度丢失（后端 uint64 + json:",string"）
  timestamp: string;
  method: number; // 0: DIRECT, 1: CANCELABLE, 2: MODERATED, 3: RWA_ESCROW, 4: RWA_INSTANT, 5: FIAT
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

function resolveCanonicalPaymentCoin(coin: string): string {
  return mustCanonicalCoin((coin || '').trim());
}

/**
 * 提交支付
 */
export async function submitPayment(
  paymentData: SubmitPaymentData
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const canonicalCoin = resolveCanonicalPaymentCoin(paymentData.coin);
    return authPost<{ success: boolean; error?: string }>(
      NODE_API.ORDER_PAYMENT(paymentData.orderID),
      {
        paymentData: {
          ...paymentData,
          coin: canonicalCoin,
        },
      }
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
  amount: string;
  orderId: string;
  memo?: string;
}): Promise<{ success: boolean; txid?: string; error?: string }> {
  const realFn = async () => {
    const canonicalCoin = resolveCanonicalPaymentCoin(payload.coin);
    return authPost<{ success: boolean; txid?: string; error?: string }>(
      NODE_API.ORDER_SPEND(payload.orderId),
      {
        coinType: canonicalCoin,
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
      order.state = 'AWAITING_SHIPMENT';
    }
    return {
      success: true,
      txid: '0x' + Math.random().toString(16).slice(2, 66),
    };
  };

  return withMockFallback(realFn, mockFn, `/orders/${payload.orderId}/spend`);
}

/**
 * 获取剩余支付金额
 */
export async function getPaymentRemaining(
  orderId: string
): Promise<{ remaining?: string; paid?: string; error?: string }> {
  const realFn = async () => {
    return authGet<{ remaining?: string; paid?: string; error?: string }>(
      NODE_API.ORDER_PAYMENT_REMAINING(orderId)
    );
  };

  const mockFn = async () => {
    await mockDelay();
    return {
      remaining: '0',
      paid: '100',
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
  evidenceHashes?: string[]
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    return authPost<{ success: boolean; error?: string }>(NODE_API.DISPUTE_OPEN(orderId), {
      claim,
      ...(evidenceHashes?.length ? { evidenceHashes } : {}),
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
  orderId: string,
  txID?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const response = await authPost<{ success?: boolean; error?: string }>(
      NODE_API.DISPUTE_RELEASE(orderId),
      { txID: txID || '' }
    );
    return {
      success: response.success !== false,
      error: response.error,
    };
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

/** Context for moderated backend-submitted dispute payout acceptance. */
export interface AcceptDisputeSettlementContext {
  paymentCoin?: string;
  isModerated?: boolean;
  escrowType?: string;
}

/** Run dispute-release settlement action and poll until a tx hash is available. */
export async function executeDisputeReleaseSettlementAction(
  orderID: string
): Promise<SettlementActionResponse> {
  const settlement = await executeSettlementAction({
    orderID,
    action: 'dispute-release',
  });
  if (settlement.mode === 'submitted' && settlement.actionId && !settlement.txHash) {
    return awaitSettlementActionTxHash({
      orderID,
      action: 'dispute-release',
      actionId: settlement.actionId,
    });
  }
  return settlement;
}

export interface AcceptDisputeWithSettlementOptions {
  /** Called after backend settlement (and tx poll) completes, before acceptDispute. */
  onSettlementComplete?: (txHash?: string) => void;
}

/**
 * Accept a dispute ruling: settlement-action (when applicable) → poll tx hash → release.
 * Single entry point for order detail, list hooks, and disputes API.
 */
export async function acceptDisputeWithSettlement(
  orderID: string,
  context?: AcceptDisputeSettlementContext,
  options?: AcceptDisputeWithSettlementOptions
): Promise<{ success: boolean; error?: string; txHash?: string }> {
  const attemptBackendSettlement = orderUsesMonitoredBackendSettlement({
    isModerated: context?.isModerated,
    escrowType: context?.escrowType,
    paymentCoin: context?.paymentCoin,
  });

  let txHash: string | undefined;
  if (attemptBackendSettlement) {
    const resolved = await executeDisputeReleaseSettlementAction(orderID);
    txHash = resolved.txHash;
    options?.onSettlementComplete?.(txHash);
  }

  const result = await acceptDispute(orderID, txHash);
  return {
    ...result,
    txHash,
  };
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
  getOrderPaymentSession,
  initiateOrderOnrampFunding,
  refreshOrderOnrampFunding,

  // 创建
  createOrder,
  purchaseListing,
  estimateOrderTotal,
  getCheckoutBreakdown,
  quoteCheckoutSupply,

  // 状态操作
  confirmOrder,
  executeSettlementAction,
  shipOrder,
  completeOrder,
  cancelOrder,
  extendProtection,
  refundOrder,

  // 支付
  createOrderPaymentSession,
  createOrderPaymentSelectionQuote,
  submitPayment,
  fundOrder,
  getPaymentRemaining,

  // 争议
  openDispute,
  acceptDispute,
  acceptDisputeWithSettlement,
  claimPayment,

  // 其他
  resendOrderMessage,
  markOrderAsRead,
};
