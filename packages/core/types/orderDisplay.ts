/**
 * 订单 UI 展示类型定义
 * 用于前端展示的订单数据结构，与 API 类型（order.ts）分离
 */

import type { PaymentProgress } from './order';
import type { PaymentSessionProductMode, PaymentSessionSettlementMode } from './paymentSession';

/**
 * 订单项 - 用于展示
 */
export interface DisplayOrderItem {
  id: string;
  title: string;
  image: string;
  quantity: number;
  price: string;
  currency: string;
  /** Variant selections chosen by buyer (e.g. Color: Red, Size: L) */
  options?: Array<{ name: string; value: string }>;
}

export interface DisplayOrderPricingBreakdown {
  subtotal: string;
  shipping: string;
  discounts: string;
  taxes: string;
  total: string;
  currency: string;
}

export interface DisplayOrderSettlementBreakdownLine {
  type: string;
  amount: string;
  address?: string;
}

export interface DisplayOrderSettlementBreakdown {
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
  lines?: DisplayOrderSettlementBreakdownLine[];
}

/**
 * 订单参与者（卖家/买家）- 用于展示
 */
export interface DisplayOrderParticipant {
  id: string;
  name: string;
  avatar: string;
  peerID?: string;
  location?: string;
}

/**
 * 仲裁员信息 - 用于展示
 */
export interface DisplayModerator {
  id: string;
  name: string;
  avatar: string;
  fee: number;
  location?: string;
}

/**
 * 订单时间线事件
 */
export interface DisplayTimelineEvent {
  status: string;
  timestamp: string;
  /** 描述文本（默认英文，可被 UI 层覆盖） */
  description: string;
  /** i18n 翻译键（用于 UI 层翻译） */
  descriptionKey?: string;
  /** 描述参数（用于插值，如 shipper、trackingNumber） */
  descriptionParams?: Record<string, string>;
  actor?: 'buyer' | 'seller' | 'moderator' | 'system';
}

/**
 * 交付详情 - 用于展示卖家已经提交的物流/数字内容/链上交付信息
 */
export interface DisplayShipmentInfo {
  type: 'physical' | 'digital' | 'cryptocurrency';
  timestamp: string;
  itemIndex?: number;
  shipper?: string;
  trackingNumber?: string;
  fileUrl?: string;
  password?: string;
  transactionID?: string;
  note?: string;
}

/** 订单取消/拒绝场景（由 orderTransform 从后端 state + contract 推导） */
export type CancellationKind =
  | 'payment_timeout'
  | 'payment_verification_timeout'
  | 'seller_decline'
  | 'cancelled_paid'
  | 'cancelled_unpaid'
  | 'unknown';

export interface CancellationContext {
  kind: CancellationKind;
  wasFunded: boolean;
  /** 用户填写的拒绝/取消原因，或系统 reason 码 */
  reason?: string;
  /** Managed cancel / 链上退款 settlement 已 confirmed */
  refundConfirmed?: boolean;
}

/**
 * 订单争议信息 - 用于展示
 */
export interface DisplayDispute {
  id: string;
  claim: string;
  response?: string;
  status: 'open' | 'in_progress' | 'resolved';
  initiator: 'buyer' | 'seller';
  resolution?: 'buyer' | 'seller' | 'split';
  /** Moderator-written ruling explanation (contract.disputeClose.verdict) */
  resolutionText?: string;
  /** Buyer share of escrow payout (0–100), derived from releaseInfo amounts */
  buyerPayoutPercent?: number;
  /** Seller share of escrow payout (0–100), derived from releaseInfo amounts */
  vendorPayoutPercent?: number;
  /** Formatted buyer payout amount from disputeClose.releaseInfo */
  buyerPayoutAmount?: string;
  /** Formatted seller payout amount from disputeClose.releaseInfo */
  vendorPayoutAmount?: string;
  /** Formatted moderator fee amount from disputeClose.releaseInfo */
  moderatorPayoutAmount?: string;
  /** When the dispute was opened (from contract.disputeOpen.timestamp) */
  openedAt?: string;
  /** When the dispute was closed (from contract.disputeClose.timestamp) */
  resolvedAt?: string;
  evidenceHashes?: string[];
}

/**
 * RWA 支付锁定信息
 */
export interface DisplayPaymentLocked {
  amount: string;
  coin: string;
  buyerReceiveAddress: string;
  lockTxHash: string;
  timestamp?: string;
  escrowTimeoutSeconds?: number;
  expiresAt?: string;
}

/**
 * 展示用订单状态
 */
export type DisplayOrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'decided'
  | 'refunded'
  | 'cancelled'
  | 'split_resolved';

/**
 * 用户角色
 */
export type DisplayUserRole = 'buyer' | 'seller' | 'moderator';

export type DisplayPaymentVerificationStatus = 'pending' | 'verified' | 'failed';

/**
 * 订单展示数据 - 统一的 UI 数据结构
 * 由 transformCoreOrder 函数将 API 数据转换而来
 */
export interface DisplayOrder {
  /** 订单唯一标识（完整订单哈希，如 QmXXX...） */
  id: string;
  /** 订单 ID（用于显示，与 id 相同） */
  orderId: string;
  /** 商品 slug（用于商品链接） */
  slug?: string;
  /** 订单状态 */
  status: DisplayOrderStatus;
  /** 订单商品列表 */
  items: DisplayOrderItem[];
  /** 订单总金额（支付币种格式化后的值） */
  total: string;
  /** 支付币种展示标签（如 BCH、ETH）；由 paymentCoin 推导，仅用于 UI 格式化 */
  currency: string;
  /** 原始定价金额（格式化后，如 "0.60"） */
  pricingAmount?: string;
  /** 原始定价币种（如 "USD"） */
  pricingCurrency?: string;
  /** Backend-derived pricing breakdown, formatted in pricing currency. */
  pricingBreakdown?: DisplayOrderPricingBreakdown;
  /** Backend-derived settlement payout / fee breakdown, formatted in settlement currency. */
  settlementBreakdown?: DisplayOrderSettlementBreakdown;
  /** 实际支付资产 canonical ID（链识别、explorer、decimals 的唯一输入） */
  paymentCoin?: string;
  /** 实际支付金额（格式化后，如 "0.0002"） */
  paymentAmount?: string;
  /** Unified payment session settlement mode when available */
  paymentSettlementMode?: PaymentSessionSettlementMode;
  /** Unified payment session product mode when available */
  paymentProductMode?: PaymentSessionProductMode;
  /** True when the order uses moderated buyer protection. */
  isModerated?: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 取消时间（仅 cancelled 状态） */
  cancelledAt?: string;
  /** 卖家信息 */
  vendor: DisplayOrderParticipant;
  /** 买家信息 */
  buyer?: DisplayOrderParticipant;
  /** 仲裁员信息 */
  moderator?: DisplayModerator;
  /** 物流追踪号 */
  trackingNumber?: string;
  /** 收货地址 */
  shippingAddress: string;
  /** 收件人 */
  shippingRecipient?: string;
  /** 详细地址（第一行） */
  shippingAddressLine1?: string;
  /** 详细地址（第二行） */
  shippingAddressLine2?: string;
  /** 城市 */
  shippingCity?: string;
  /** 州/省 */
  shippingState?: string;
  /** 邮编 */
  shippingPostalCode?: string;
  /** 国家代码 */
  shippingCountryCode?: string;
  /** 运费金额（格式化后的定价币种值，如 "0.10"） */
  shippingAmount?: string;
  /** 配送区域名称（来自订单项 shippingOption.name） */
  shippingZoneName?: string;
  /** 配送方式名称（来自订单项 shippingOption.service） */
  shippingMethodName?: string;
  /** 支付交易哈希（买家 → Escrow） */
  paymentTx?: string;
  /** 释放交易哈希（Escrow → 卖家，CANCELABLE 在 Confirm 时、MODERATED 在 Complete 时产生） */
  releaseTx?: string;
  /** 支付交易确认数 */
  txConfirmations?: number;
  /** 托管交易哈希 */
  escrowTx?: string;
  /** 托管地址 */
  escrowAddress?: string;
  /** 链 ID */
  chainId?: number;
  /** 订单备注（来自 items[0].memo） */
  notes?: string;
  /** 额外联系方式（来自 alternateContactInfo） */
  alternateContactInfo?: string;
  /** 发货商 */
  shipper?: string;
  /** 卖家提交的交付详情（物流、数字下载、链上交易等） */
  shipments?: DisplayShipmentInfo[];
  /** 商品类型：PHYSICAL_GOOD | SERVICE | DIGITAL_GOOD */
  contractType?: string;
  /** 订单时间线 */
  timeline: DisplayTimelineEvent[];
  /** 当前用户角色 */
  userRole: DisplayUserRole;
  /** 是否为 RWA 即时交易（链上已完成，无需等待） */
  isRwaInstant?: boolean;
  /** 是否为 RWA 托管交易 */
  isRwaEscrow?: boolean;
  /** 买家已提交支付，等待后端校验（AWAITING_PAYMENT_VERIFICATION） */
  awaitingPaymentVerification?: boolean;
  /** 支付验证状态（pending/verified/failed） */
  paymentVerificationStatus?: DisplayPaymentVerificationStatus;
  /** 支付验证失败原因 */
  paymentVerificationFailureReason?: string;
  /** 支付验证失败标记（用于状态卡展示） */
  paymentVerificationFailed?: boolean;
  /**
   * 部分到账进度（来自后端 paymentState.progress）。仅在加密货币支付且后端
   * 已观测到至少一笔事件时存在。backend payment aggregation — 即使订单已
   * verified，后端仍会刷新此字段以反映 late deposit。
   */
  paymentProgress?: PaymentProgress;
  /** RWA 支付锁定信息（仅用于托管模式） */
  paymentLocked?: DisplayPaymentLocked;
  /** 争议信息（平台内部仲裁，由 Moderator 管理） */
  dispute?: DisplayDispute;
  /** 法币争议信息（外部争议，由支付提供商管理，独立于订单状态） */
  fiatDispute?: DisplayFiatDispute;
  /** Whether the buyer has already submitted a rating for this order */
  hasRated?: boolean;
  /** Buyer rating submitted with order completion */
  buyerRating?: DisplayOrderRating;
  /** True when funds were released during seller confirmation, not buyer completion */
  fundsReleasedAtConfirmation?: boolean;

  /** 取消/拒绝语义（DECLINED vs CANCELED、是否已付款等） */
  cancellation?: CancellationContext;
  /** 取消/退款原因（来自 orderDecline / orderCancel.reason / refund.memo） */
  cancelReason?: string;
  /** 法币支付信息（仅当 paymentMethod === FIAT 时存在） */
  fiatPayment?: DisplayFiatPayment;
  /** 买家保障状态（后端 S6 派生字段） */
  protection?: DisplayOrderProtection;
  /** 售后争议（应用层，资金已释放后的投诉） */
  afterSaleDispute?: DisplayAfterSaleDispute;
}

export interface DisplayOrderRating {
  slug?: string;
  overall: number;
  review?: string;
  anonymous?: boolean;
  imageHashes?: string[];
  imageUrls?: string[];
  timestamp?: string;
}

/**
 * 法币争议信息（外部争议，由支付提供商管理）
 * 与 DisplayDispute（平台内部仲裁）相互独立
 */
export interface DisplayFiatDispute {
  status: 'opened' | 'resolved';
  disputeId: string;
  reason: string;
  provider: 'stripe' | 'paypal';
  openedAt?: string;
  resolvedAt?: string;
  /** 争议结果：won = 卖家胜, lost = 买家胜（退款）, accepted = 卖家接受 */
  outcome?: string;
}

/**
 * 法币支付信息
 */
export interface DisplayFiatPayment {
  provider: 'stripe' | 'paypal';
  /** Stripe PaymentIntent ID 或 PayPal Capture ID */
  paymentID: string;
  /** 支付方式描述（如 "Visa •••• 4242"） */
  methodLabel: string;
  /** 卡品牌或支付方式类型 */
  brand?: string;
  /** 卡尾号 */
  last4?: string;
}

/**
 * 买家保障状态（从后端 protection 派生字段映射）
 */
export type ProtectionLevel = 'full' | 'standard' | 'platform';

export interface DisplayOrderProtection {
  stage: 'ESCROWED' | 'PROTECTION_PERIOD' | 'COMPLETED' | 'DISPUTED' | 'AFTER_SALE_WINDOW';
  daysRemaining: number;
  autoCompleteAt?: string;
  extendable: boolean;
  extended: boolean;
  afterSaleWindowDays: number;
  protectionLevel?: ProtectionLevel;
}

/**
 * 售后争议信息（应用层争议，资金已释放后）
 */
export interface DisplayAfterSaleDispute {
  reason: string;
  description: string;
  reportedAt: string;
}

/**
 * 转换订单的选项
 */
export interface TransformOrderOptions {
  /** 当前用户的 peerID */
  currentUserPeerID: string | null;
  /** 查看上下文：从哪个视角查看（用于后备角色判断） */
  viewingContext?: 'sale' | 'purchase';
}
