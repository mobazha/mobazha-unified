import type { Image, Price, Address, CryptoType } from './common';
import type { ProductItem, VendorID } from './product';

/**
 * 订单状态
 */
export type OrderState =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_PAYMENT_VERIFICATION'
  | 'AWAITING_PICKUP'
  | 'AWAITING_SHIPMENT'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'DECLINED'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'DECIDED'
  | 'RESOLVED'
  | 'PAYMENT_FINALIZED'
  | 'PROCESSING_ERROR'
  | 'DISPUTE_EXPIRED';

/**
 * 订单角色
 */
export type OrderRole = 'buyer' | 'vendor';

export type PaymentVerificationStatus = 'pending' | 'verified' | 'failed';

export interface SettlementActionSnapshot {
  actionId: string;
  action: string;
  state: string;
  txHash?: string;
  relayTaskId?: string;
  confirmations?: number;
  lastError?: string;
  updatedAt?: string;
  settlementAction?: string;
}

/**
 * Running tally of confirmed-and-deduplicated payments toward the order's
 * expected amount. Backend rewrites this on every aggregation pass (Phase
 * backend payment aggregation) so the dashboard can render a live
 * "you've paid X of Y" progress bar even before the order flips to
 * "verified" and again afterwards if a late deposit lands.
 *
 * All amounts are decimal strings in the smallest unit declared by
 * OrderOpen.Amount (wei / sat / atomic units / lamports for crypto; fiat
 * uses the order currency's divisibility). Percentage is clamped to
 * [0, 100] server-side so every client renders the same number.
 */
export interface PaymentProgress {
  /** Running confirmed-and-deduplicated total, smallest unit decimal string. */
  totalReceived: string;
  /** Order's expected amount, smallest unit decimal string. */
  expectedAmount: string;
  /** Server-clamped percentage in [0, 100]. */
  percentage: number;
  /**
   * Surplus over the expected amount (smallest unit decimal string).
   * Populated only when the verifier detected a genuine overpayment;
   * omitted on partial and exact paths.
   */
  overpaidAmount?: string;
  /**
   * Display-formatted amounts (smallest unit converted to the payment
   * coin's natural unit, e.g. wei → ETH). The frontend transform fills
   * these so the UI never has to know about divisibility / big.Int.
   */
  totalReceivedFormatted?: string;
  expectedAmountFormatted?: string;
  overpaidAmountFormatted?: string;
}

export interface OrderPaymentState {
  verificationStatus: PaymentVerificationStatus;
  verificationFailureReason?: string;
  verificationFailedAt?: string;
  fiatMetadata?: Record<string, string>;
  /**
   * Optional progress card for partial / pending crypto payments. Omitted
   * when the order has no OrderOpen yet, when the expected amount is
   * non-positive, or for fiat-only orders without an associated
   * blockchain payment.
   */
  progress?: PaymentProgress;
}

/**
 * 订单列表项
 * 注意：字段名与后端 API 保持一致（使用大写 ID 后缀）
 */
export interface OrderListItem {
  orderID: string;
  slug: string;
  title: string;
  /** API returns a single CID string for list endpoints; Image object appears in mocks / legacy. */
  thumbnail: Image | string;
  total: Price;
  quantity: number;
  timestamp: string;
  state: OrderState;
  read: boolean;
  vendorID: string;
  vendorName?: string;
  vendorAvatar?: string;
  buyerID: string;
  buyerName?: string;
  buyerAvatar?: string;
  paymentCoin: CryptoType;
  coinType: string;
  settlementAction?: string;
  settlementActionId?: string;
  settlementState?: string;
  settlementTxHash?: string;
  shippingName?: string;
  shippingAddress?: string;
  moderated: boolean;
  unreadChatMessages?: number;
}

/**
 * 订单详情
 */
export interface Order {
  contract: OrderContract;
  state: OrderState;
  settlementActions?: SettlementActionSnapshot[];
  pricingBreakdown?: OrderPricingBreakdown;
  settlementBreakdown?: OrderSettlementBreakdown;
  paymentState?: OrderPaymentState;
  paidAt?: string;
  shippedAt?: string;
  completedAt?: string;
  lastStateChangeAt?: string;
  read: boolean;
  funded: boolean;
  unreadChatMessages: number;
  paymentAddressTransactions: PaymentTransaction[];
  refundAddressTransaction?: PaymentTransaction;
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

export interface OrderPricingBreakdown {
  subtotal: string;
  shipping: string;
  discounts: string;
  taxes: string;
  total: string;
  currency: string;
}

export interface OrderSettlementBreakdownLine {
  type: string;
  amount: string;
  address?: string;
}

export interface OrderSettlementBreakdown {
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
  lines?: OrderSettlementBreakdownLine[];
}

/**
 * 订单合约 - 对应后端 Contract protobuf
 */
export interface OrderContract {
  // 订单基本信息
  orderOpen?: OrderOpen;
  orderReject?: OrderReject;
  orderCancel?: OrderCancel;
  orderConfirmation?: OrderConfirmation;
  orderComplete?: OrderComplete;
  /** API: repeated OrderShipment (Ricardian contract) */
  orderShipments?: OrderShipment[];

  // 支付相关
  paymentSent?: PaymentSent;
  paymentFinalized?: PaymentFinalized;
  paymentLocked?: PaymentLocked;

  // 退款
  refunds?: Refund[];

  // 争议相关
  disputeOpen?: DisputeOpen;
  disputeClose?: DisputeClose;
  disputeUpdate?: DisputeUpdate;
  disputeAccept?: DisputeAccept;

  // 交易记录
  transactions?: ContractTransaction[];

  // 错误信息
  errors?: string[];

  // SQL-backed application fields surfaced by the order detail API.
  afterSaleDispute?: {
    reason?: string;
    description?: string;
    openedAt?: string;
    reportedAt?: string;
  };
}

/**
 * 订单拒绝
 */
export interface OrderReject {
  type?: 'USER_REJECT' | 'VALIDATION_ERROR';
  reason?: string;
  timestamp?: string;
  transactionID?: string;
}

/**
 * 订单取消
 */
export interface OrderCancel {
  transactionID?: string;
  timestamp?: string;
}

/**
 * 订单确认 - 对应后端 OrderConfirmation
 */
export interface OrderConfirmation {
  transactionID?: string;
  timestamp?: string;
  payoutAddress?: string;
  paymentAddress?: string; // 兼容字段
}

/**
 * 订单完成 - 对应后端 OrderComplete
 */
export interface OrderComplete {
  timestamp?: string;
  ratings?: OrderRating[];
  payoutSigs?: { inputIndex: number; signature: string }[];
  releaseInfo?: EscrowRelease;
}

/**
 * 订单发货消息 - 对应后端 pb.OrderShipment
 */
export interface OrderShipment {
  timestamp?: string;
  shipments?: ShippedItem[];
  releaseInfo?: EscrowRelease; // 仲裁订单的托管释放
}

/**
 * 单条发货项 - 对应后端 OrderShipment.ShippedItem
 */
export interface ShippedItem {
  itemIndex?: number;
  note?: string;
  physicalDelivery?: PhysicalDelivery;
  digitalDelivery?: DigitalDelivery;
  cryptocurrencyDelivery?: CryptocurrencyDelivery;
}

/**
 * 加密货币发货 - 用于 RWA Token 等
 */
export interface CryptocurrencyDelivery {
  transactionID?: string;
}

/**
 * 支付发送 - 对应后端 PaymentSent
 */
export interface PaymentSent {
  transactionID?: string;
  chaincode?: string;
  method?: PaymentMethod | number;
  contractAddress?: string;
  payerAddress?: string;
  moderator?: string;
  moderatorAddress?: string;
  amount?: number | string;
  coin?: string;
  toAddress?: string;
  address?: string; // 兼容字段
  script?: string;
  escrowReleaseFee?: string;
  escrowTimeoutHours?: number;
  platformAmount?: string;
  platformAddr?: string;
  refundAddress?: string;
  paymentMethod?: {
    type?: string;
    brand?: string;
    last4?: string;
  };
  timestamp?: string;
  paymentTokenAddress?: string;
  buyerReceiveAddress?: string;
  settlementSpec?: PaymentSettlementSpec;
}

export interface PaymentSettlementSpec {
  method?: PaymentMethod | number;
  payMode?: string;
  escrowType?: string;
}

/**
 * 支付方法
 */
export type PaymentMethod = 'DIRECT' | 'CANCELABLE' | 'MODERATED' | 'RWA_ESCROW' | 'RWA_INSTANT';

/**
 * 支付确认
 */
export interface PaymentFinalized {
  timestamp?: string;
}

/**
 * RWA 资金锁定
 */
export interface PaymentLocked {
  transactionHash?: string;
  amount?: string;
  coin?: string;
  paymentTokenAddress?: string;
  buyerReceiveAddress?: string;
  universalSwapAddress?: string;
  timestamp?: string;
}

/**
 * 退款
 */
export interface Refund {
  transactionID?: string;
  releaseInfo?: EscrowRelease;
  amount?: string;
  timestamp?: string;
}

/**
 * 托管释放
 */
export interface EscrowRelease {
  escrowSignatures?: { inputIndex: number; signature: string }[];
  outpoints?: { fromID: string; value: string }[];
  toAddress?: string;
  toAmount?: string;
  platformAddress?: string;
  platformAmount?: string;
  transactionFee?: string;
  txid?: string;
}

/**
 * 争议开启
 */
export interface DisputeOpen {
  timestamp?: string;
  claim?: string;
}

/**
 * 争议关闭
 */
export interface DisputeClose {
  verdict?: string;
  releaseInfo?: {
    buyerAddress?: string;
    buyerAmount?: string;
    vendorAddress?: string;
    vendorAmount?: string;
    moderatorAddress?: string;
    moderatorAmount?: string;
    transactionFee?: string;
  };
  timestamp?: string;
}

/**
 * 争议更新
 */
export interface DisputeUpdate {
  timestamp?: string;
  payoutAddress?: string;
}

/**
 * 争议接受
 */
export interface DisputeAccept {
  timestamp?: string;
  closedBy?: string;
  txid?: string;
}

/**
 * 合约交易记录
 */
export interface ContractTransaction {
  txid?: string;
  fromID?: string;
  value?: string;
  height?: number;
  timestamp?: string;
}

/**
 * 合约中的商品
 */
export interface ContractListing {
  slug: string;
  vendorID: VendorID;
  metadata: {
    contractType: string;
    format: string;
    acceptedCurrencies: string[];
    pricingCurrency: {
      code: string;
      divisibility: number;
    };
  };
  item: ProductItem;
}

/**
 * 订单开放数据 - 对应后端 OrderOpen protobuf
 * 包含订单的基本信息：买家、商品、配送、支付币种等
 */
export interface OrderOpen {
  // 配送相关
  shipping?: Address;
  // 买家信息
  buyerID?: {
    peerID: string;
    name?: string;
    pubkeys?: {
      identity: string;
      bitcoin: string;
    };
  };
  // 时间戳
  timestamp?: string;
  // 订单商品项
  items?: OrderItem[];
  // 评分密钥
  ratingKeys?: string[];
  // 备用联系信息
  alternateContactInfo?: string;
  // 定价币种
  pricingCoin?: string;
  // 金额
  amount?: number;
  // 商品列表（包含签名）
  listings?: Array<{
    vendorID?: { peerID?: string; name?: string };
    listing?: ContractListing;
  }>;
}

/**
 * 订单项
 */
export interface OrderItem {
  listingHash: string;
  quantity: number;
  options?: OrderItemOption[];
  shippingOption?: OrderShippingOption;
  memo?: string;
  paymentAddress?: string;
  couponCodes?: string[];
  quantity64?: string;
}

/**
 * 订单项选项
 */
export interface OrderItemOption {
  name: string;
  value: string;
}

/**
 * 订单运输选项
 */
export interface OrderShippingOption {
  name: string;
  service: string;
}

/**
 * 支付交易
 */
export interface PaymentTransaction {
  txid: string;
  value: number;
  confirmations: number;
  height: number;
  timestamp: string;
}

/**
 * 评分签名
 */
export interface RatingSignature {
  slug?: string;
  ratingKey?: string;
  vendorSignature?: string;
  metadata?: {
    listingSlug: string;
    ratingKey: string;
  };
  signature?: string;
}

/**
 * 实物发货
 */
export interface PhysicalDelivery {
  shipper: string;
  trackingNumber: string;
}

/**
 * 数字商品发货
 */
export interface DigitalDelivery {
  url?: string;
  password?: string;
}

/**
 * 订单评分
 */
export interface OrderRating {
  slug: string;
  overall: number;
  review?: string;
  anonymous?: boolean;
  imageHashes?: string[];
}

/**
 * 购物车
 */
export interface Cart {
  items: CartItem[];
}

/**
 * 购物车项
 */
export interface CartItem {
  listing: {
    slug: string;
    title: string;
    thumbnail: Image;
    price: Price;
    vendorPeerID: string;
    vendorName?: string;
  };
  quantity: number;
  options?: OrderItemOption[];
  shippingOption?: OrderShippingOption;
  memo?: string;
  couponCodes?: string[];
}
