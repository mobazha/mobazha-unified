/**
 * 订单数据转换函数
 * 将 API 返回的订单数据转换为 UI 展示格式
 */

import type { Order as CoreOrder, OrderState, PaymentProgress } from '../../types/order';
import type {
  DisplayOrder,
  DisplayOrderItem,
  DisplayOrderPricingBreakdown,
  DisplayOrderSettlementBreakdown,
  DisplayModerator,
  DisplayFiatPayment,
  DisplayFiatDispute,
  DisplayOrderProtection,
  DisplayAfterSaleDispute,
  DisplayShipmentInfo,
  DisplayTimelineEvent,
  ProtectionLevel,
  DisplayOrderStatus,
  DisplayPaymentVerificationStatus,
  DisplayUserRole,
  TransformOrderOptions,
  CancellationContext,
  CancellationKind,
} from '../../types/orderDisplay';
import type {
  PaymentSessionProductMode,
  PaymentSessionSettlementMode,
} from '../../types/paymentSession';
import { getImageUrl } from '../../services/api/config';
import {
  formatTokenAmount,
  getTokenByPaymentCoin,
  getPaymentCoinDisplayLabel,
  getTokenDecimals,
  parseCanonicalPaymentCoin,
  isFiatPaymentCoin,
} from '../../data/tokens';
import { formatUserName } from '../identity';
import { formatMinimalUnitAmountString, formatMinimalUnitExactAmountString } from './minimalUnit';

// ============ Internal Types ============

/**
 * 后端实际返回的订单数据结构
 * 这是内部类型，不对外导出
 */
interface RealOrderData {
  state: string;
  paidAt?: string;
  shippedAt?: string;
  completedAt?: string;
  lastStateChangeAt?: string;
  pricingBreakdown?: {
    subtotal?: string;
    shipping?: string;
    discounts?: string;
    taxes?: string;
    total?: string;
    currency?: string;
  };
  settlementBreakdown?: {
    source?: string;
    currency?: string;
    escrowedAmount?: string;
    sellerAmount?: string;
    sellerAddress?: string;
    buyerAmount?: string;
    buyerAddress?: string;
    moderatorAmount?: string;
    moderatorAddress?: string;
    platformAmount?: string;
    platformAddress?: string;
    transactionFee?: string;
    txHash?: string;
    lines?: Array<{ type?: string; amount?: string; address?: string }>;
  };
  paymentState?: {
    verificationStatus?: string;
    verificationFailureReason?: string;
    verificationFailedAt?: string;
    fiatMetadata?: Record<string, string>;
    /**
     * Partial-payment progress card. Backend writes this on every
     * AggregateAndEmit pass when the order has an OrderOpen and a
     * positive expected amount (backend payment aggregation).
     */
    progress?: {
      totalReceived?: string;
      expectedAmount?: string;
      percentage?: number;
      overpaidAmount?: string;
    };
  };
  funded?: boolean;
  read?: boolean;
  unreadChatMessages?: number;
  paymentAddressTransactions?: {
    txid: string;
    value: number;
    confirmations: number;
    timestamp?: string;
  }[];
  contract: {
    OrderID?: string;
    orderOpen?: {
      timestamp?: string;
      buyerID?: { peerID?: string; name?: string; handle?: string };
      listings?: Array<{
        vendorID?: { peerID?: string; name?: string; handle?: string };
        listing?: {
          slug?: string;
          metadata?: {
            contractType?: string;
            pricingCurrency?: { code?: string; divisibility?: number };
            rwaEscrowTimeoutSeconds?: number;
            escrowTimeoutSeconds?: number;
          };
          item?: {
            title?: string;
            images?: Array<{
              tiny?: string;
              small?: string;
              medium?: string;
              large?: string;
              original?: string;
            }>;
            price?: number;
            blockchain?: string;
          };
          vendorID?: { peerID?: string; name?: string; handle?: string };
        };
      }>;
      items?: Array<{
        quantity?: number;
        memo?: string;
        options?: Array<{ name?: string; value?: string }>;
        shippingOption?: { name?: string; service?: string };
      }>;
      shipping?: {
        name?: string;
        shipTo?: string;
        company?: string;
        address?: string;
        addressLineOne?: string;
        addressLineTwo?: string;
        addressNotes?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      pricingCoin?: string;
      amount?: number | string;
      alternateContactInfo?: string;
    };
    paymentSent?: {
      moderator?: string;
      coin?: string;
      amount?: number;
      method?: string | number;
      settlementSpec?: {
        method?: string | number;
        payMode?: string;
        escrowType?: string;
      };
      address?: string;
      transactionID?: string;
      timestamp?: string;
      buyerReceiveAddress?: string;
      contractAddress?: string;
      paymentTokenAddress?: string;
      toAddress?: string;
      paymentMethod?: { type?: string; brand?: string; last4?: string };
    };
    orderConfirmation?: {
      timestamp?: string;
      transactionID?: string;
      payoutAddress?: string;
    };
    orderShipments?: Array<{
      timestamp?: string | { seconds?: number };
      shipments?: Array<{
        itemIndex?: number;
        note?: string;
        physicalDelivery?: { shipper?: string; trackingNumber?: string };
        digitalDelivery?: { url?: string; password?: string };
        cryptocurrencyDelivery?: { transactionID?: string };
      }>;
    }>;
    /** Legacy field name (pre-shipment rename) */
    orderFulfillments?: Array<{
      timestamp?: string;
      physicalDelivery?:
        | Array<{ shipper?: string; trackingNumber?: string }>
        | { shipper?: string; trackingNumber?: string };
      note?: string;
    }>;
    orderComplete?: {
      timestamp?: string;
      ratings?: Array<{
        slug?: string;
        overall?: number;
        review?: string;
        anonymous?: boolean;
        imageHashes?: string[];
        image_hashes?: string[];
      }>;
      releaseInfo?: { txid?: string };
    };
    transactions?: Array<{ txid?: string; fromID?: string; value?: string; timestamp?: string }>;
    disputeOpen?: {
      timestamp?: string;
      reason?: string;
      claim?: string;
      evidenceHashes?: string[];
      openedBy?: string;
    };
    dispute?: {
      timestamp?: string;
      claim?: string;
      payoutAddress?: string;
    };
    disputeClose?: {
      timestamp?: string;
      verdict?: string;
      releaseInfo?: {
        buyerAmount?: string;
        vendorAmount?: string;
        moderatorAmount?: string;
      };
    };
    orderCancel?: {
      timestamp?: string;
      reason?: string;
    };
    orderDecline?: {
      timestamp?: string;
      reason?: string;
      type?: string;
      transactionID?: string;
    };
    refund?: {
      timestamp?: string;
      memo?: string;
    };
    refunds?: Array<{
      timestamp?: string;
    }>;
    afterSaleDispute?: {
      reason?: string;
      description?: string;
      openedAt?: string;
      reportedAt?: string;
    };
  };
  protection?: {
    stage: string;
    daysRemaining: number;
    autoCompleteAt?: string;
    extendable: boolean;
    extended: boolean;
    afterSaleWindowDays: number;
  };
  afterSaleDispute?: {
    reason?: string;
    description?: string;
    openedAt?: string;
    reportedAt?: string;
  };
  afterSaleDisputeReason?: string;
  afterSaleDisputeDesc?: string;
  afterSaleDisputeAt?: string;
}

// ============ Helper Functions ============

/**
 * 将后端订单状态映射到 UI 状态
 * 参考桌面端逻辑：PENDING 表示已支付等待确认，AWAITING_PAYMENT 才是未支付
 */
export function mapOrderState(state: OrderState | string): DisplayOrderStatus {
  const stateMap: Record<string, DisplayOrderStatus> = {
    // PENDING 表示订单已创建且已支付，等待卖家确认（参考桌面端）
    PENDING: 'paid',
    AWAITING_PAYMENT: 'awaiting_payment',
    // 已提交支付，等待系统验证（通过 awaitingPaymentVerification 标记区分文案）
    AWAITING_PAYMENT_VERIFICATION: 'awaiting_payment',
    AWAITING_PICKUP: 'processing',
    AWAITING_SHIPMENT: 'processing',
    PARTIALLY_SHIPPED: 'processing',
    SHIPPED: 'shipped',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    CANCELLED: 'cancelled',
    DECLINED: 'cancelled',
    REFUNDED: 'refunded',
    DISPUTED: 'disputed',
    DECIDED: 'decided',
    RESOLVED: 'completed',
    // PAYMENT_FINALIZED: 托管已释放（超时后），等待买家评价后变成 COMPLETE
    // 参考移动端/桌面端，此状态表示交易已完成，与 COMPLETED 同级
    PAYMENT_FINALIZED: 'completed',
    PROCESSING_ERROR: 'awaiting_payment',
  };
  return stateMap[state] || 'awaiting_payment';
}

function normalizePaymentVerificationStatus(status?: string): DisplayPaymentVerificationStatus {
  const normalized = (status || '').trim().toLowerCase();
  if (normalized === 'verified') return 'verified';
  if (normalized === 'failed') return 'failed';
  return 'pending';
}

type SettlementActionLike = {
  action?: string;
  settlementAction?: string;
  state?: string;
};

/** Contract slice used when deriving cancellation semantics. */
export type CancellationSourceContract = {
  orderCancel?: { timestamp?: string; reason?: string; transactionID?: string };
  orderDecline?: { timestamp?: string; reason?: string; type?: string; transactionID?: string };
  paymentSent?: unknown;
  refund?: { memo?: string };
};

export type CancellationSourceData = {
  state?: string;
  funded?: boolean;
  paymentState?: {
    verificationStatus?: string;
    progress?: { percentage?: number };
  };
  settlementActions?: SettlementActionLike[];
  contract: CancellationSourceContract;
};

/** True when a cancel/refund settlement is confirmed on-chain (managed settlement) or recorded on legacy cancel msg. */
export function isRefundSettlementConfirmed(
  settlementActions: SettlementActionLike[] | undefined,
  contract: CancellationSourceContract
): boolean {
  const actions = settlementActions || [];
  const confirmedCancel = actions.some(action => {
    const name = (action.settlementAction || action.action || '').toLowerCase();
    return name === 'cancel' && (action.state || '').toLowerCase() === 'confirmed';
  });
  if (confirmedCancel) {
    return true;
  }

  if (contract.orderCancel?.transactionID?.trim()) {
    return true;
  }

  // Decline tx alone is ambiguous when backend settlement surface exists (failed attempts also carry tx).
  if (actions.length === 0 && contract.orderDecline?.transactionID?.trim()) {
    return true;
  }

  return false;
}

/**
 * Derive structured cancellation context from backend order state + contract.
 * Keeps UI components free of DECLINED/CANCELED/payment_timeout branching logic.
 */
export function deriveCancellationContext(
  data: CancellationSourceData
): CancellationContext | undefined {
  const state = data.state;
  if (state !== 'CANCELED' && state !== 'CANCELLED' && state !== 'DECLINED') {
    return undefined;
  }

  const contract = data.contract;
  const verificationStatus = normalizePaymentVerificationStatus(
    data.paymentState?.verificationStatus
  );
  const wasFunded = !!(
    data.funded ||
    contract.paymentSent ||
    verificationStatus === 'verified' ||
    (data.paymentState?.progress?.percentage ?? 0) > 0
  );

  const orderCancelReason = contract.orderCancel?.reason?.trim() || '';
  const orderDeclineReason = contract.orderDecline?.reason?.trim() || '';
  const refundMemo = contract.refund?.memo?.trim() || '';
  const reason = orderDeclineReason || orderCancelReason || refundMemo || undefined;

  let kind: CancellationKind;

  if (state === 'DECLINED' || contract.orderDecline) {
    kind = 'seller_decline';
  } else if (orderCancelReason === 'payment_verification_timeout') {
    kind = 'payment_verification_timeout';
  } else if (orderCancelReason === 'payment_timeout') {
    kind = 'payment_timeout';
  } else if (wasFunded) {
    kind = 'cancelled_paid';
  } else {
    kind = 'cancelled_unpaid';
  }

  const refundConfirmed = isRefundSettlementConfirmed(data.settlementActions, contract);

  return { kind, wasFunded, reason, refundConfirmed };
}

/**
 * Normalize the backend's paymentState.progress payload onto the strict
 * DisplayOrder.paymentProgress shape. Returns undefined when the backend
 * omits the field (e.g. fiat-only orders or orders without OrderOpen).
 *
 * The helper trusts the server-clamped Percentage but defensively clamps
 * to [0, 100] anyway so a buggy / older backend can't paint a 110%
 * progress bar. totalReceived / expectedAmount are passed through as
 * decimal strings — the UI uses them only for hint text, not arithmetic.
 */
function extractPaymentProgress(
  raw?: {
    totalReceived?: string;
    expectedAmount?: string;
    percentage?: number;
    overpaidAmount?: string;
  },
  paymentDivisibility?: number,
  paymentCoin?: string
): PaymentProgress | undefined {
  if (!raw || !raw.expectedAmount) return undefined;
  const expected = (raw.expectedAmount || '').trim();
  if (!expected || expected === '0') return undefined;
  const total = (raw.totalReceived || '0').trim() || '0';
  const pctRaw = typeof raw.percentage === 'number' ? raw.percentage : 0;
  const percentage = Math.max(0, Math.min(100, Math.floor(pctRaw)));
  const overpaid = (raw.overpaidAmount || '').trim();

  const formatAmount = (raw: string): string | undefined =>
    formatMinimalUnitAmountString(raw, paymentDivisibility, paymentCoin);

  return {
    totalReceived: total,
    expectedAmount: expected,
    percentage,
    overpaidAmount: overpaid || undefined,
    totalReceivedFormatted: formatAmount(total),
    expectedAmountFormatted: formatAmount(expected),
    overpaidAmountFormatted: overpaid ? formatAmount(overpaid) : undefined,
  };
}

function formatPricingBreakdown(
  raw: RealOrderData['pricingBreakdown'],
  fallbackCurrency: string,
  divisibility: number
): DisplayOrderPricingBreakdown | undefined {
  if (!raw?.total) return undefined;
  const currency = raw.currency || fallbackCurrency;
  const format = (amount?: string): string =>
    amount ? formatPriceAmount(amount, divisibility, currency) : '0';
  return {
    subtotal: format(raw.subtotal),
    shipping: format(raw.shipping),
    discounts: format(raw.discounts),
    taxes: format(raw.taxes),
    total: format(raw.total),
    currency,
  };
}

function formatSettlementBreakdown(
  raw: RealOrderData['settlementBreakdown'],
  fallbackCurrency: string,
  paymentDivisibility: number
): DisplayOrderSettlementBreakdown | undefined {
  if (!raw?.escrowedAmount && !raw?.sellerAmount && !raw?.buyerAmount) return undefined;
  const currency = raw.currency || fallbackCurrency;
  const format = (amount?: string): string | undefined =>
    amount ? formatPaymentSentAmount(amount, paymentDivisibility, currency) : undefined;

  return {
    source: raw.source,
    currency,
    escrowedAmount: format(raw.escrowedAmount),
    sellerAmount: format(raw.sellerAmount),
    sellerAddress: raw.sellerAddress,
    buyerAmount: format(raw.buyerAmount),
    buyerAddress: raw.buyerAddress,
    moderatorAmount: format(raw.moderatorAmount),
    moderatorAddress: raw.moderatorAddress,
    platformAmount: format(raw.platformAmount),
    platformAddress: raw.platformAddress,
    transactionFee: format(raw.transactionFee),
    txHash: raw.txHash,
    lines: raw.lines
      ?.map(line => ({
        type: line.type || '',
        amount: format(line.amount) || '',
        address: line.address,
      }))
      .filter(line => line.type && line.amount),
  };
}

/**
 * 格式化价格金额（使用统一的 token 配置）
 */
function formatPriceAmount(
  amount: number | string,
  divisibility: number = 2,
  coin?: string
): string {
  const numericAmount = Number(amount);
  // 如果提供了 coin，且是已知的加密货币 token，使用 token 配置的 decimals
  if (coin && getTokenByPaymentCoin(coin)) {
    return formatTokenAmount(numericAmount, coin);
  }
  // 法币（如 USD）或未知 coin，使用 listing metadata 中的 divisibility
  const normalAmount = numericAmount / Math.pow(10, divisibility);
  const displayDecimals = divisibility >= 6 ? 2 : Math.min(divisibility, 8);
  return normalAmount.toFixed(displayDecimals);
}

function formatPaymentSentAmount(
  amount: number | string,
  paymentDivisibility: number,
  paymentCoin?: string
): string {
  const raw = String(amount).trim();
  if (isFiatPaymentCoin(paymentCoin)) {
    return formatPriceAmount(Number(amount), paymentDivisibility, paymentCoin);
  }

  return (
    formatMinimalUnitExactAmountString(raw, paymentCoin) ||
    formatPriceAmount(Number(amount), paymentDivisibility, paymentCoin)
  );
}

/**
 * 从图片对象获取 URL
 */
function getThumbnailUrl(
  image:
    | { tiny?: string; small?: string; medium?: string; large?: string; original?: string }
    | undefined
): string {
  if (!image) return '';
  const hash = image.medium || image.small || image.tiny || image.large || image.original || '';
  return getImageUrl(hash) || '';
}

/**
 * 格式化收货地址
 */
function shipmentMessageTimestamp(msg: { timestamp?: string | { seconds?: number } }): string {
  const t = msg.timestamp;
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object' && typeof t.seconds === 'number') {
    return new Date(t.seconds * 1000).toISOString();
  }
  return '';
}

function firstDefinedTimestamp(...timestamps: Array<string | undefined>): string {
  return timestamps.find(ts => !!ts && ts.trim() !== '') || '';
}

function extractShipmentDetails(contract: RealOrderData['contract']): DisplayShipmentInfo[] {
  const rows: DisplayShipmentInfo[] = [];

  contract.orderShipments?.forEach(msg => {
    const timestamp = shipmentMessageTimestamp(msg);
    msg.shipments?.forEach(item => {
      if (item.digitalDelivery) {
        rows.push({
          type: 'digital',
          timestamp,
          itemIndex: item.itemIndex,
          fileUrl: item.digitalDelivery.url,
          password: item.digitalDelivery.password,
          note: item.note,
        });
        return;
      }

      if (item.physicalDelivery) {
        rows.push({
          type: 'physical',
          timestamp,
          itemIndex: item.itemIndex,
          shipper: item.physicalDelivery.shipper,
          trackingNumber: item.physicalDelivery.trackingNumber,
          note: item.note,
        });
        return;
      }

      if (item.cryptocurrencyDelivery) {
        rows.push({
          type: 'cryptocurrency',
          timestamp,
          itemIndex: item.itemIndex,
          transactionID: item.cryptocurrencyDelivery.transactionID,
          note: item.note,
        });
      }
    });
  });

  contract.orderFulfillments?.forEach(fulfillment => {
    const physicalDeliveries = Array.isArray(fulfillment.physicalDelivery)
      ? fulfillment.physicalDelivery
      : fulfillment.physicalDelivery
        ? [fulfillment.physicalDelivery]
        : [];

    physicalDeliveries.forEach(physicalDelivery => {
      rows.push({
        type: 'physical',
        timestamp: fulfillment.timestamp || '',
        shipper: physicalDelivery.shipper,
        trackingNumber: physicalDelivery.trackingNumber,
        note: fulfillment.note,
      });
    });
  });

  return rows;
}

function formatShippingAddress(shipping?: {
  name?: string;
  shipTo?: string;
  company?: string;
  address?: string;
  addressLineOne?: string;
  addressLineTwo?: string;
  addressNotes?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): string {
  if (!shipping) return '';
  const line1 = shipping.address || shipping.addressLineOne;
  const parts = [
    shipping.shipTo || shipping.name,
    shipping.company,
    line1,
    shipping.addressLineTwo,
    [shipping.city, shipping.state, shipping.postalCode].filter(Boolean).join(', '),
    shipping.country,
  ].filter(Boolean);
  return parts.join('\n');
}

/**
 * 根据实际订单数据生成时间线
 * 返回的 descriptionKey 用于 UI 层 i18n 翻译
 */
function generateTimelineFromRealData(data: RealOrderData): DisplayTimelineEvent[] {
  const timeline: DisplayTimelineEvent[] = [];
  const contract = data.contract;
  const paymentTxid =
    contract.paymentSent?.transactionID || data.paymentAddressTransactions?.[0]?.txid;
  const releaseTxid = extractReleaseTx(contract, paymentTxid);

  const orderOpen = contract.orderOpen;
  const orderTimestamp = orderOpen?.timestamp;
  const verificationStatus = normalizePaymentVerificationStatus(
    data.paymentState?.verificationStatus
  );

  // 订单创建
  if (orderTimestamp) {
    timeline.push({
      status: 'created',
      timestamp: orderTimestamp,
      description: 'Order placed',
      descriptionKey: 'order.timeline.orderPlaced',
      actor: 'buyer',
    });
  }

  // 资金状态 (使用 PaymentSent 统一消息)
  if (
    data.funded ||
    data.paidAt ||
    contract.paymentSent ||
    (data.paymentAddressTransactions && data.paymentAddressTransactions.length > 0) ||
    verificationStatus === 'verified'
  ) {
    const verificationFailed =
      data.state === 'AWAITING_PAYMENT_VERIFICATION' && verificationStatus === 'failed';
    const paymentTimestamp = firstDefinedTimestamp(
      data.paidAt,
      contract.paymentSent?.timestamp,
      data.paymentAddressTransactions?.[0]?.timestamp,
      orderTimestamp
    );
    const awaitingVerification = data.state === 'AWAITING_PAYMENT_VERIFICATION';
    const description = verificationFailed
      ? 'Payment verification failed'
      : awaitingVerification
        ? 'Payment submitted'
        : 'Payment confirmed';
    const descriptionKey = verificationFailed
      ? 'order.timeline.paymentVerificationFailed'
      : awaitingVerification
        ? 'order.timeline.paymentSubmitted'
        : 'order.timeline.paymentConfirmed';
    timeline.push({
      status: 'paid',
      timestamp: paymentTimestamp,
      description,
      descriptionKey,
      actor: 'system',
    });
  }

  // 卖家确认
  const orderConfirmation = contract.orderConfirmation;
  if (orderConfirmation) {
    timeline.push({
      status: 'processing',
      timestamp: firstDefinedTimestamp(orderConfirmation.timestamp, data.lastStateChangeAt),
      description: 'Vendor confirmed order',
      descriptionKey: 'order.timeline.vendorConfirmed',
      actor: 'seller',
    });
  }

  // 释放（与付款 tx 不同的链上结算 tx）
  if (releaseTxid) {
    const confirmationTxid = normalizeTransactionID(orderConfirmation?.transactionID);
    const releaseAtConfirmation = !!confirmationTxid && confirmationTxid === releaseTxid;
    const releaseTimestamp = releaseAtConfirmation
      ? firstDefinedTimestamp(orderConfirmation?.timestamp, data.lastStateChangeAt)
      : firstDefinedTimestamp(contract.orderComplete?.timestamp, data.completedAt);
    timeline.push({
      status: 'released',
      timestamp: releaseTimestamp,
      description: 'Funds released to seller',
      descriptionKey: 'order.timeline.fundsReleased',
      actor: 'system',
    });
  }

  // 发货（orderShipments 优先，兼容 orderFulfillments）
  const vendorMsgs = contract.orderShipments;
  const legacyFulfillments = contract.orderFulfillments;
  const vendorFirst = vendorMsgs?.[0];
  const legacyFirst = legacyFulfillments?.[0];
  const fulfillmentTs = firstDefinedTimestamp(
    vendorFirst ? shipmentMessageTimestamp(vendorFirst) : legacyFirst?.timestamp,
    data.shippedAt
  );
  const pdFromVendor = vendorFirst?.shipments?.[0]?.physicalDelivery;
  const pdLegacy = legacyFirst?.physicalDelivery;
  const trackingInfo = pdFromVendor
    ? pdFromVendor
    : Array.isArray(pdLegacy)
      ? pdLegacy[0]
      : pdLegacy;
  if (vendorFirst || legacyFirst || data.shippedAt) {
    if (trackingInfo?.shipper || trackingInfo?.trackingNumber) {
      timeline.push({
        status: 'shipped',
        timestamp: fulfillmentTs,
        description: `Package shipped - ${trackingInfo.shipper}: ${trackingInfo.trackingNumber}`,
        descriptionKey: 'order.timeline.packageShippedWithTracking',
        descriptionParams: {
          shipper: trackingInfo.shipper || '',
          trackingNumber: trackingInfo.trackingNumber || '',
        },
        actor: 'seller',
      });
    } else {
      timeline.push({
        status: 'shipped',
        timestamp: fulfillmentTs,
        description: 'Package shipped',
        descriptionKey: 'order.timeline.packageShipped',
        actor: 'seller',
      });
    }
  }

  // 完成
  const orderComplete = contract.orderComplete;
  if (orderComplete || data.completedAt) {
    timeline.push({
      status: 'completed',
      timestamp: firstDefinedTimestamp(orderComplete?.timestamp, data.completedAt),
      description: 'Order completed',
      descriptionKey: 'order.timeline.orderCompleted',
      actor: 'buyer',
    });
  }

  // 争议
  if (contract.disputeOpen) {
    timeline.push({
      status: 'disputed',
      timestamp: contract.disputeOpen.timestamp || '',
      description: 'Dispute opened',
      descriptionKey: 'order.timeline.disputeOpened',
      actor: 'buyer',
    });
  }

  // Fiat dispute (no crypto disputeOpen but order is DISPUTED)
  if (!contract.disputeOpen && data.state === 'DISPUTED') {
    timeline.push({
      status: 'disputed',
      timestamp: firstDefinedTimestamp(data.lastStateChangeAt),
      description: 'Payment disputed by buyer',
      descriptionKey: 'order.timeline.fiatDisputeOpened',
      actor: 'buyer',
    });
  }

  // 争议关闭
  if (contract.disputeClose) {
    timeline.push({
      status: 'resolved',
      timestamp: contract.disputeClose.timestamp || '',
      description: `Dispute closed: ${contract.disputeClose.verdict || 'N/A'}`,
      descriptionKey: 'order.timeline.disputeClosed',
      descriptionParams: {
        verdict: contract.disputeClose.verdict || 'N/A',
      },
      actor: 'moderator',
    });
  }

  // Cancel / decline
  if (
    contract.orderCancel ||
    contract.orderDecline ||
    data.state === 'CANCELED' ||
    data.state === 'CANCELLED' ||
    data.state === 'DECLINED'
  ) {
    const isDeclined = data.state === 'DECLINED' || !!contract.orderDecline;
    const cancelReasonCode = contract.orderCancel?.reason?.trim() || '';
    const isSystemTimeout =
      cancelReasonCode === 'payment_timeout' || cancelReasonCode === 'payment_verification_timeout';

    timeline.push({
      status: 'cancelled',
      timestamp: firstDefinedTimestamp(
        contract.orderDecline?.timestamp || contract.orderCancel?.timestamp,
        data.lastStateChangeAt
      ),
      description: isDeclined ? 'Order declined' : 'Order cancelled',
      descriptionKey: isDeclined ? 'order.timeline.orderDeclined' : 'order.timeline.orderCancelled',
      actor: isDeclined ? 'seller' : isSystemTimeout ? 'system' : 'buyer',
    });
  }

  // Refund (order state is REFUNDED)
  if (data.state === 'REFUNDED') {
    timeline.push({
      status: 'refunded',
      timestamp: firstDefinedTimestamp(
        contract.refund?.timestamp,
        contract.refunds?.[0]?.timestamp,
        data.lastStateChangeAt
      ),
      description: 'Order refunded',
      descriptionKey: 'order.timeline.refunded',
      actor: 'seller',
    });
  }

  return timeline;
}

/**
 * 确定用户角色
 * 优先通过 peerID 匹配，如果不匹配则使用 viewingContext 作为后备
 */
function determineUserRole(
  currentUserPeerID: string | null,
  vendorPeerID: string,
  buyerPeerID: string,
  moderatorId: string,
  viewingContext?: 'sale' | 'purchase'
): DisplayUserRole {
  let userRole: DisplayUserRole = 'buyer';

  if (currentUserPeerID) {
    if (currentUserPeerID === vendorPeerID) {
      userRole = 'seller';
    } else if (currentUserPeerID === buyerPeerID) {
      userRole = 'buyer';
    } else if (moderatorId === currentUserPeerID) {
      userRole = 'moderator';
    }
  }

  // 如果 peerID 匹配失败，使用 viewingContext 作为后备（参考桌面端的 type 参数）
  if (userRole === 'buyer' && viewingContext === 'sale') {
    userRole = 'seller';
  } else if (userRole === 'seller' && viewingContext === 'purchase') {
    userRole = 'buyer';
  }

  return userRole;
}

function normalizePaymentMethod(method: string | number | undefined): string | number {
  if (typeof method === 'number') return method;
  const normalized = String(method ?? '')
    .trim()
    .toUpperCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return normalized;
}

function isModeratedPaymentMethod(method: string | number): boolean {
  return method === 'MODERATED' || method === 2;
}

function resolvePaymentMethod(
  paymentSent: RealOrderData['contract']['paymentSent']
): string | number {
  return normalizePaymentMethod(paymentSent?.settlementSpec?.method ?? paymentSent?.method);
}

function deriveProtectionLevel(method: string | number, isFiat: boolean): ProtectionLevel {
  if (isFiat) return 'platform';
  if (isModeratedPaymentMethod(method)) return 'full';
  return 'standard';
}

function isCancelablePaymentMethod(method: string | number): boolean {
  return method === 'CANCELABLE' || method === 1;
}

function productModeFromPaymentMethod(
  method: string | number
): PaymentSessionProductMode | undefined {
  if (isCancelablePaymentMethod(method)) return 'cancelable';
  if (isModeratedPaymentMethod(method)) return 'moderated';
  if (method === 'DIRECT' || method === 0) return 'direct';
  return undefined;
}

function settlementModeFromPayMode(payMode?: string): PaymentSessionSettlementMode | undefined {
  const normalized = (payMode || '').trim().toLowerCase();
  if (normalized === 'address_monitored') return 'address_monitored';
  if (normalized === 'client_signed') return 'escrow_v1';
  if (normalized === 'provider') return 'provider_checkout';
  return undefined;
}

function normalizeFiatProvider(providerID?: string): DisplayFiatPayment['provider'] | undefined {
  const normalized = (providerID || '').trim().toLowerCase();
  if (normalized === 'stripe' || normalized === 'paypal') {
    return normalized;
  }
  return undefined;
}

function resolveFiatProviderFromCoin(
  paymentCoin?: string
): DisplayFiatPayment['provider'] | undefined {
  if (!paymentCoin) {
    return undefined;
  }
  const parts = paymentCoin.split(':');
  if (parts.length < 3 || parts[0].toLowerCase() !== 'fiat') {
    return undefined;
  }
  return normalizeFiatProvider(parts[1]);
}

function resolveFiatCurrencyFromCoin(paymentCoin?: string): string | undefined {
  if (!paymentCoin || !isFiatPaymentCoin(paymentCoin)) {
    return undefined;
  }
  const parts = paymentCoin.split(':');
  return parts.length >= 3 && parts[2] ? parts[2].toUpperCase() : undefined;
}

function normalizeTransactionID(txid?: string): string | undefined {
  const normalized = txid?.trim();
  return normalized || undefined;
}

/**
 * 提取释放交易哈希（Escrow → 卖家）
 * 优先级：
 *  1. orderConfirmation.transactionID（CANCELABLE 订单，Confirm 时释放）
 *  2. orderComplete.releaseInfo.txid（MODERATED 订单，Complete 时释放）
 *  3. contract.transactions 中与付款 tx 不同的 tx（fallback）
 */
function extractReleaseTx(
  contract: RealOrderData['contract'],
  paymentTxid?: string
): string | undefined {
  // CANCELABLE orders: release tx is stored in OrderConfirmation
  const fromConfirmation = normalizeTransactionID(contract.orderConfirmation?.transactionID);
  if (fromConfirmation && fromConfirmation !== paymentTxid) {
    return fromConfirmation;
  }

  // MODERATED orders: release tx is stored in OrderComplete.releaseInfo
  const fromReleaseInfo = normalizeTransactionID(contract.orderComplete?.releaseInfo?.txid);
  if (fromReleaseInfo) return fromReleaseInfo;

  const txs = contract.transactions;
  if (!txs || txs.length < 2 || !paymentTxid) return undefined;
  const releaseTx = txs
    .map(t => normalizeTransactionID(t.txid))
    .find(txid => txid && txid !== paymentTxid);
  return releaseTx || undefined;
}

// ============ Main Transform Function ============

/**
 * 将核心订单数据转换为 UI 展示格式
 *
 * @param coreOrder - 从 API 获取的核心订单数据
 * @param options - 转换选项
 * @returns DisplayOrder 或 null（如果数据无效）
 *
 * @example
 * ```typescript
 * const displayOrder = transformCoreOrder(coreOrder, {
 *   currentUserPeerID: user?.peerID || null,
 *   viewingContext: 'sale',
 * });
 * ```
 */
export function transformCoreOrder(
  coreOrder: CoreOrder | null,
  options: TransformOrderOptions
): DisplayOrder | null {
  if (!coreOrder || !coreOrder.contract) {
    return null;
  }

  const { currentUserPeerID, viewingContext } = options;
  const data = coreOrder as unknown as RealOrderData;
  const contract = data.contract;

  const orderOpen = contract.orderOpen;

  // 提取 listing 数据
  type ListingType = NonNullable<
    NonNullable<RealOrderData['contract']['orderOpen']>['listings']
  >[0]['listing'];
  let listingData: ListingType | undefined;
  let vendorPeerID = '';
  let vendorName = '';

  if (orderOpen?.listings?.length) {
    const firstListing = orderOpen.listings[0];
    listingData = firstListing.listing;
    vendorPeerID = firstListing.listing?.vendorID?.peerID || firstListing.vendorID?.peerID || '';
    const v = firstListing.listing?.vendorID || firstListing.vendorID;
    vendorName = v?.name || v?.handle || '';
  }

  const buyerPeerID = orderOpen?.buyerID?.peerID || '';
  const b = orderOpen?.buyerID;
  const buyerName = b?.name || b?.handle || '';

  // 支持 PaymentSent (统一消息)
  const paymentSent = contract.paymentSent;
  // 判断是否为 RWA 托管模式：method === 3 (RWA_ESCROW)
  const paymentMethod = resolvePaymentMethod(paymentSent);
  const isRwaEscrow =
    paymentMethod === 3 || paymentMethod === 'RWA_ESCROW' || paymentMethod === 'RWA_LOCKED';
  // 判断是否为 RWA 即时模式：method === 4 (RWA_INSTANT)
  const isRwaInstant = paymentMethod === 4 || paymentMethod === 'RWA_INSTANT';
  const isCancelableOrder = isCancelablePaymentMethod(paymentMethod);
  const isModeratedOrder = isModeratedPaymentMethod(paymentMethod);
  const releaseTx = extractReleaseTx(contract, paymentSent?.transactionID);
  const cancelableSettlementFundsReleased =
    isCancelableOrder &&
    (coreOrder.settlementActions || []).some(action => {
      const actionName = (action.settlementAction || action.action || '').toLowerCase();
      return (action.state || '').toLowerCase() === 'confirmed' && actionName === 'confirm';
    });
  const confirmationTx = normalizeTransactionID(contract.orderConfirmation?.transactionID);
  const fundsReleasedAtConfirmation =
    (!!confirmationTx &&
      confirmationTx === releaseTx &&
      !contract.orderComplete?.releaseInfo?.txid) ||
    cancelableSettlementFundsReleased;
  const moderatorId = paymentSent?.moderator || '';

  // --- 货币与 divisibility 解析 ---
  // listing 的定价货币（卖家设定的价格货币，如 USD）
  const listingCurrencyCode = listingData?.metadata?.pricingCurrency?.code || 'USD';
  const listingDivisibility = listingData?.metadata?.pricingCurrency?.divisibility || 2;
  // 订单的支付币种（买家实际支付的加密货币，如 ETHUSDT）
  const pricingCoin = orderOpen?.pricingCoin || listingCurrencyCode;
  const paymentSentCoin = (paymentSent?.coin || '').trim();
  const paymentFiatCurrency = resolveFiatCurrencyFromCoin(paymentSentCoin);
  const paymentCoin = paymentSentCoin || undefined;
  const paymentCoinKey = paymentCoin || '';
  const amountFormatCoin = paymentCoin || pricingCoin;
  const displayCurrency =
    paymentFiatCurrency ||
    (paymentCoin
      ? getPaymentCoinDisplayLabel(paymentCoinKey)
      : getPaymentCoinDisplayLabel(pricingCoin) || pricingCoin);
  const parsedPaymentCoin = paymentCoin ? parseCanonicalPaymentCoin(paymentCoin) : null;
  const paymentChainId =
    parsedPaymentCoin?.namespace === 'eip155' ? Number(parsedPaymentCoin.chainRef) : undefined;
  // 支付币种的 divisibility（优先从 token 配置取 decimals）
  const paymentTokenConfig = getTokenByPaymentCoin(amountFormatCoin);
  const paymentDivisibility = paymentFiatCurrency
    ? listingDivisibility
    : paymentTokenConfig
      ? paymentTokenConfig.decimals
      : paymentCoin || pricingCoin !== listingCurrencyCode
        ? getTokenDecimals(getPaymentCoinDisplayLabel(amountFormatCoin) || amountFormatCoin)
        : listingDivisibility;
  // 判断是否为跨币种订单（定价货币 ≠ 支付币种）
  const isCrossCurrency = listingCurrencyCode.toUpperCase() !== pricingCoin.toUpperCase();
  const timestamp = orderOpen?.timestamp || '';
  const vsm = contract.orderShipments;
  const legacyF = contract.orderFulfillments;
  const pdVendor = vsm?.[0]?.shipments?.[0]?.physicalDelivery;
  const pdLeg = legacyF?.[0]?.physicalDelivery;
  const trackingInfo = pdVendor ? pdVendor : Array.isArray(pdLeg) ? pdLeg[0] : pdLeg;
  const shipping = orderOpen?.shipping;

  const paymentAddress = paymentSent?.address || contract.orderConfirmation?.payoutAddress;

  const orderOpenItems = orderOpen?.items || [];
  // memo 来自第一个 item 的 memo 字段
  const memo = orderOpenItems[0]?.memo;
  // 额外联系方式
  const alternateContactInfo = orderOpen?.alternateContactInfo;
  // 发货商信息
  const shipper = trackingInfo?.shipper;
  const shipments = extractShipmentDetails(contract);
  // 商品类型：PHYSICAL_GOOD | SERVICE | DIGITAL_GOOD
  const contractType = listingData?.metadata?.contractType;

  const shippingRecipient = shipping?.shipTo || shipping?.name;
  const shippingAddressLine1 = shipping?.address || shipping?.addressLineOne;
  const shippingAddressLine2 = shipping?.addressLineTwo;
  const shippingCity = shipping?.city;
  const shippingState = shipping?.state;
  const shippingPostalCode = shipping?.postalCode;
  const shippingCountryCode = shipping?.country;

  // 提取配送区域与配送方式（从第一个 item）
  const firstItem = orderOpenItems[0];
  const shippingZoneName = firstItem?.shippingOption?.name || '';
  const shippingMethodName = firstItem?.shippingOption?.service || '';

  // 获取交易确认数
  const txConfirmations = data.paymentAddressTransactions?.[0]?.confirmations;

  // 判断用户角色
  const userRole = determineUserRole(
    currentUserPeerID,
    vendorPeerID,
    buyerPeerID,
    moderatorId,
    viewingContext
  );

  const itemImages = listingData?.item?.images || [];
  const itemImageUrl = itemImages.length > 0 ? getThumbnailUrl(itemImages[0]) : '';

  // 从 contract.OrderID 获取完整订单 ID，而非商品 slug
  const fullOrderId = contract.OrderID || '';
  const listingSlug = listingData?.slug || '';
  const itemTitle = listingData?.item?.title || '';
  const itemPrice = listingData?.item?.price || 0;

  // 原始定价信息（从 orderOpen 获取，pricingCoin 已在上方定义）
  const pricingAmount = orderOpen?.amount !== undefined ? orderOpen.amount : itemPrice;

  const paymentAmount = paymentSent?.amount;

  // 单价使用 listing 的定价货币（如 USD）和 divisibility
  const formattedItemPrice = formatPriceAmount(itemPrice, listingDivisibility);
  const orderItems: DisplayOrderItem[] =
    orderOpenItems.length > 0
      ? orderOpenItems.map((item, index) => {
          const options = (item.options || []).filter(
            (o): o is { name: string; value: string } => !!o.name && !!o.value
          );
          return {
            id: `item-${index}`,
            title: itemTitle,
            image: itemImageUrl,
            quantity: item.quantity || 1,
            price: formattedItemPrice,
            currency: listingCurrencyCode,
            ...(options.length > 0 ? { options } : {}),
          };
        })
      : [
          {
            id: 'item-0',
            title: itemTitle,
            image: itemImageUrl,
            quantity: 1,
            price: formattedItemPrice,
            currency: listingCurrencyCode,
          },
        ];

  const moderator: DisplayModerator | undefined =
    isModeratedOrder && moderatorId
      ? {
          id: moderatorId,
          name: formatUserName({ peerID: moderatorId }, { fallback: 'Moderator' }),
          avatar: '',
          fee: 1,
        }
      : undefined;

  // 计算 RWA 托管的过期时间
  let paymentLocked: DisplayOrder['paymentLocked'] | undefined;
  if (isRwaEscrow && paymentSent) {
    // 从 listing metadata 获取 escrowTimeoutSeconds
    const metadata = listingData?.metadata as
      | { rwaEscrowTimeoutSeconds?: number; escrowTimeoutSeconds?: number }
      | undefined;
    const escrowTimeoutSeconds = (metadata?.rwaEscrowTimeoutSeconds ||
      metadata?.escrowTimeoutSeconds ||
      900) as number; // 默认 15 分钟

    // 计算过期时间
    let expiresAt: string | undefined;
    if (paymentSent.timestamp) {
      const lockedTime = new Date(paymentSent.timestamp).getTime();
      expiresAt = new Date(lockedTime + escrowTimeoutSeconds * 1000).toISOString();
    }

    paymentLocked = {
      amount: String(paymentSent.amount || ''),
      coin: paymentSent.coin || '',
      buyerReceiveAddress: paymentSent.buyerReceiveAddress || '',
      lockTxHash: paymentSent.transactionID || '',
      timestamp: paymentSent.timestamp,
      escrowTimeoutSeconds,
      expiresAt,
    };
  }

  // 运费计算：
  // 1. 非物理商品（SERVICE / DIGITAL_GOOD / RWA_TOKEN）不显示运费
  // 2. 跨币种订单（如 USD 定价 + ETHUSDT 支付）无法通过差值计算运费
  // 3. 仅同币种物理商品订单可通过 pricingAmount - itemPrice * qty 推算运费
  const totalQuantity = orderOpenItems.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
  const isPhysicalGood = contractType === 'PHYSICAL_GOOD';
  let formattedShippingAmount: string | undefined;
  if (isPhysicalGood && !isCrossCurrency) {
    const shippingCost = Number(pricingAmount) - Number(itemPrice) * totalQuantity;
    formattedShippingAmount =
      shippingCost > 0 ? formatPriceAmount(shippingCost, listingDivisibility) : undefined;
  }

  // 格式化定价总额（listing 货币，用于概要「总计」）
  // 同币种：直接用 orderOpen.amount（包含运费等完整金额）
  // 跨币种：使用 itemPrice * qty（仅商品小计，运费和总额在不同编码下无法混算）
  const listingTotal = isCrossCurrency ? Number(itemPrice) * totalQuantity : Number(pricingAmount);
  const formattedPricingAmount = formatPriceAmount(listingTotal, listingDivisibility);

  // 格式化实际支付金额（支付币种最小单位 → 标准单位，用于「已付款」显示）
  const formattedOrderAmount = formatPriceAmount(pricingAmount, paymentDivisibility, pricingCoin);
  const formattedPaymentAmount =
    paymentAmount !== undefined && paymentAmount !== null
      ? formatPaymentSentAmount(paymentAmount, paymentDivisibility, paymentCoin)
      : formattedOrderAmount;
  const pricingBreakdown = formatPricingBreakdown(
    data.pricingBreakdown,
    listingCurrencyCode,
    listingDivisibility
  );
  const settlementBreakdown = formatSettlementBreakdown(
    data.settlementBreakdown,
    paymentCoin || pricingCoin,
    paymentDivisibility
  );

  const paymentCoinFiatProvider = resolveFiatProviderFromCoin(paymentSent?.coin);
  const metadataFiatProvider = normalizeFiatProvider(
    data.paymentState?.fiatMetadata?.fiat_provider
  );
  const resolvedFiatProvider = paymentCoinFiatProvider || metadataFiatProvider;

  // Fiat payment detection: method === 5 or "FIAT" or canonical fiat coin.
  const isFiatPayment =
    paymentMethod === 5 || paymentMethod === 'FIAT' || !!paymentCoinFiatProvider;
  let fiatPayment: DisplayFiatPayment | undefined;
  if (isFiatPayment && resolvedFiatProvider) {
    const provider = resolvedFiatProvider;
    const pm = paymentSent?.paymentMethod;
    const brand = pm?.brand || pm?.type || '';
    const last4 = pm?.last4 || '';
    const methodLabel = last4 ? `${brand} •••• ${last4}` : brand || provider;
    fiatPayment = {
      provider,
      paymentID: paymentSent?.transactionID || '',
      methodLabel,
      brand: brand || undefined,
      last4: last4 || undefined,
    };
  }

  // Fiat dispute: from API fiatMetadata (independent of order state).
  // Backend records dispute metadata without changing order FSM state.
  let fiatDispute: DisplayFiatDispute | undefined;
  if (data.paymentState?.fiatMetadata?.fiat_dispute_status) {
    const meta = data.paymentState.fiatMetadata;
    const disputeProvider =
      normalizeFiatProvider(meta.fiat_dispute_provider) ||
      fiatPayment?.provider ||
      resolvedFiatProvider;
    if (disputeProvider) {
      fiatDispute = {
        status: meta.fiat_dispute_status === 'resolved' ? 'resolved' : 'opened',
        disputeId: meta.fiat_dispute_id || '',
        reason: meta.fiat_dispute_reason || '',
        provider: disputeProvider,
        openedAt: meta.fiat_dispute_opened_at,
        resolvedAt: meta.fiat_dispute_resolved_at,
        outcome: meta.fiat_dispute_outcome,
      };
    }
  }

  // Crypto dispute (internal, moderator-mediated)
  const dispute: DisplayOrder['dispute'] = contract.disputeOpen
    ? {
        id: fullOrderId,
        claim:
          contract.disputeOpen.reason?.trim() ||
          contract.disputeOpen.claim?.trim() ||
          contract.dispute?.claim?.trim() ||
          '',
        status: contract.disputeClose ? 'resolved' : 'open',
        initiator:
          contract.disputeOpen.openedBy === 'VENDOR' || contract.disputeOpen.openedBy === '1'
            ? 'seller'
            : 'buyer',
        ...parseDisputeCloseDetails(contract.disputeClose, {
          paymentDivisibility,
          paymentCoin: paymentCoin || pricingCoin,
          displayCurrency,
        }),
        openedAt: contract.disputeOpen.timestamp || contract.dispute?.timestamp,
        resolvedAt: contract.disputeClose?.timestamp,
        evidenceHashes:
          contract.disputeOpen.evidenceHashes?.filter(
            (h): h is string => typeof h === 'string' && h.length > 0
          ) ?? [],
      }
    : undefined;

  const cancellation = deriveCancellationContext({
    ...data,
    settlementActions: coreOrder.settlementActions,
  });
  const cancelReason =
    cancellation?.reason ||
    contract.orderCancel?.reason ||
    contract.orderDecline?.reason ||
    contract.refund?.memo ||
    undefined;
  const orderCompleteRatings = contract.orderComplete?.ratings || [];
  const firstRating = orderCompleteRatings[0];
  const firstRatingImageHashes = firstRating?.imageHashes || firstRating?.image_hashes || [];
  const buyerRating = firstRating
    ? {
        slug: firstRating.slug,
        overall: firstRating.overall || 0,
        review: firstRating.review,
        anonymous: firstRating.anonymous,
        imageHashes: firstRatingImageHashes,
        imageUrls: firstRatingImageHashes
          .map(hash => getImageUrl(hash, vendorPeerID) || getImageUrl(hash) || '')
          .filter(Boolean),
        timestamp: contract.orderComplete?.timestamp || '',
      }
    : undefined;
  const paymentVerificationStatus = normalizePaymentVerificationStatus(
    data.paymentState?.verificationStatus
  );
  const paymentVerificationFailed =
    data.state === 'AWAITING_PAYMENT_VERIFICATION' && paymentVerificationStatus === 'failed';
  const awaitingPaymentVerification =
    data.state === 'AWAITING_PAYMENT_VERIFICATION' && !paymentVerificationFailed;

  let displayStatus = mapOrderState(data.state as OrderState);
  if (displayStatus === 'disputed' && contract.disputeClose) {
    displayStatus = 'decided';
  }

  const result: DisplayOrder = {
    id: fullOrderId,
    orderId: fullOrderId,
    slug: listingSlug,
    status: displayStatus,
    isModerated:
      isModeratedOrder ||
      (coreOrder as { paymentProductMode?: string }).paymentProductMode === 'moderated',
    items: orderItems, // items[].price 使用 listing 定价货币, items[].currency = listingCurrencyCode
    // total：实际支付金额（支付币种）
    total: formattedPaymentAmount,
    currency: displayCurrency,
    // 定价总额（listing 货币，用于订单详情概要「总计」）
    pricingAmount: pricingBreakdown?.total || formattedPricingAmount,
    pricingCurrency: listingCurrencyCode,
    pricingBreakdown,
    settlementBreakdown,
    // 支付信息（支付币种，用于订单详情「已付款」）
    paymentCoin,
    paymentAmount: formattedPaymentAmount,
    paymentSettlementMode: settlementModeFromPayMode(paymentSent?.settlementSpec?.payMode),
    paymentEscrowType: paymentSent?.settlementSpec?.escrowType,
    paymentProductMode: productModeFromPaymentMethod(paymentMethod),
    createdAt: timestamp,
    cancelledAt: contract.orderDecline?.timestamp || contract.orderCancel?.timestamp || undefined,
    vendor: {
      id: vendorPeerID,
      name: formatUserName({ name: vendorName, peerID: vendorPeerID }, { fallback: 'Seller' }),
      avatar: '',
      peerID: vendorPeerID,
    },
    buyer: {
      id: buyerPeerID,
      name: formatUserName({ name: buyerName, peerID: buyerPeerID }, { fallback: 'Buyer' }),
      avatar: '',
      peerID: buyerPeerID,
    },
    moderator,
    trackingNumber: trackingInfo?.trackingNumber,
    shippingAddress: formatShippingAddress(shipping),
    shippingRecipient,
    shippingAddressLine1,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    shippingCountryCode,
    shippingAmount: pricingBreakdown?.shipping || formattedShippingAmount,
    shippingZoneName: shippingZoneName || undefined,
    shippingMethodName: shippingMethodName || undefined,
    // 支持 RWA 模式和传统交易
    paymentTx: paymentSent?.transactionID || data.paymentAddressTransactions?.[0]?.txid,
    releaseTx,
    chainId: Number.isFinite(paymentChainId) ? paymentChainId : undefined,
    txConfirmations,
    // RWA 标识
    isRwaInstant,
    isRwaEscrow,
    awaitingPaymentVerification,
    paymentVerificationStatus,
    paymentVerificationFailureReason: data.paymentState?.verificationFailureReason || undefined,
    paymentVerificationFailed,
    paymentProgress: extractPaymentProgress(
      data.paymentState?.progress,
      paymentDivisibility,
      paymentCoin
    ),
    // RWA 支付锁定信息（仅用于托管模式）
    paymentLocked,
    escrowAddress: paymentAddress,
    notes: memo,
    alternateContactInfo: alternateContactInfo,
    shipper: shipper,
    shipments: shipments.length > 0 ? shipments : undefined,
    contractType: contractType,
    timeline: generateTimelineFromRealData(data),
    userRole,
    cancellation,
    cancelReason,
    fiatPayment,
    fiatDispute,
    dispute,
    hasRated: orderCompleteRatings.length > 0,
    buyerRating,
    fundsReleasedAtConfirmation,
    protection:
      data.protection && !fundsReleasedAtConfirmation
        ? ({
            stage: data.protection.stage,
            daysRemaining: data.protection.daysRemaining,
            autoCompleteAt: data.protection.autoCompleteAt,
            extendable: data.protection.extendable,
            extended: data.protection.extended,
            afterSaleWindowDays: data.protection.afterSaleWindowDays,
            protectionLevel: deriveProtectionLevel(paymentMethod, isFiatPayment),
          } as DisplayOrderProtection)
        : undefined,
    afterSaleDispute: (() => {
      const dispute = data.afterSaleDispute || data.contract.afterSaleDispute;
      const reportedAt = dispute?.openedAt || dispute?.reportedAt || data.afterSaleDisputeAt;
      if (!reportedAt) return undefined;
      return {
        reason: dispute?.reason || data.afterSaleDisputeReason || '',
        description: dispute?.description || data.afterSaleDisputeDesc || '',
        reportedAt,
      } as DisplayAfterSaleDispute;
    })(),
  };

  return result;
}

type DisputeCloseSlice = {
  verdict?: string;
  releaseInfo?: {
    buyerAmount?: string;
    vendorAmount?: string;
    moderatorAmount?: string;
    transactionFee?: string;
  };
};

export interface ParsedDisputeCloseDetails {
  resolution?: 'buyer' | 'seller' | 'split';
  resolutionText?: string;
  buyerPayoutPercent?: number;
  vendorPayoutPercent?: number;
  buyerPayoutAmount?: string;
  vendorPayoutAmount?: string;
  moderatorPayoutAmount?: string;
}

function parseMinimalBigInt(value?: string): bigint {
  if (!value) return BigInt(0);
  const trimmed = value.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return BigInt(0);
  try {
    return BigInt(trimmed);
  } catch {
    return BigInt(0);
  }
}

function deriveResolutionKind(
  buyerAmount: bigint,
  vendorAmount: bigint
): 'buyer' | 'seller' | 'split' | undefined {
  const zero = BigInt(0);
  if (buyerAmount <= zero && vendorAmount <= zero) return undefined;
  if (buyerAmount > zero && vendorAmount <= zero) return 'buyer';
  if (vendorAmount > zero && buyerAmount <= zero) return 'seller';
  return 'split';
}

/** Derive ruling outcome from disputeClose (amounts first, verdict text as explanation). */
export function parseDisputeCloseDetails(
  disputeClose?: DisputeCloseSlice | null,
  options?: { paymentDivisibility?: number; paymentCoin?: string; displayCurrency?: string }
): ParsedDisputeCloseDetails {
  if (!disputeClose) return {};

  const resolutionText = disputeClose.verdict?.trim() || undefined;
  const buyerAmount = parseMinimalBigInt(disputeClose.releaseInfo?.buyerAmount);
  const vendorAmount = parseMinimalBigInt(disputeClose.releaseInfo?.vendorAmount);
  const distributableTotal = buyerAmount + vendorAmount;
  const formatPayoutAmount = (amount?: string): string | undefined => {
    if (!amount) return undefined;
    const formatted = formatPaymentSentAmount(
      amount,
      options?.paymentDivisibility ?? 18,
      options?.paymentCoin
    );
    return options?.displayCurrency ? `${formatted} ${options.displayCurrency}` : formatted;
  };

  let resolution = deriveResolutionKind(buyerAmount, vendorAmount);
  if (!resolution && resolutionText) {
    resolution = normalizeDisputeResolution(resolutionText);
  }

  const payoutAmounts = {
    buyerPayoutAmount: formatPayoutAmount(disputeClose.releaseInfo?.buyerAmount),
    vendorPayoutAmount: formatPayoutAmount(disputeClose.releaseInfo?.vendorAmount),
    moderatorPayoutAmount: formatPayoutAmount(disputeClose.releaseInfo?.moderatorAmount),
  };

  if (distributableTotal <= BigInt(0)) {
    return { resolution, resolutionText, ...payoutAmounts };
  }

  const buyerPayoutPercent = Number((buyerAmount * BigInt(100)) / distributableTotal);
  const vendorPayoutPercent = 100 - buyerPayoutPercent;

  return {
    resolution,
    resolutionText,
    buyerPayoutPercent,
    vendorPayoutPercent,
    ...payoutAmounts,
  };
}

/** Legacy keyword matcher — prefer parseDisputeCloseDetails for real disputeClose payloads. */
export function normalizeDisputeResolution(
  verdict?: string
): 'buyer' | 'seller' | 'split' | undefined {
  if (!verdict) return undefined;
  const v = verdict.trim().toLowerCase();
  if (v === 'buyer') return 'buyer';
  if (v === 'seller' || v === 'vendor') return 'seller';
  if (v === 'split') return 'split';
  return undefined;
}
