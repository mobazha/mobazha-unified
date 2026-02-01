/**
 * 订单 UI 展示类型定义
 * 用于前端展示的订单数据结构，与 API 类型（order.ts）分离
 */

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
 * 订单争议信息 - 用于展示
 */
export interface DisplayDispute {
  id: string;
  claim: string;
  response?: string;
  status: 'open' | 'in_progress' | 'resolved';
  initiator: 'buyer' | 'seller';
  resolution?: 'buyer' | 'seller' | 'split';
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
  | 'refunded'
  | 'cancelled'
  | 'split_resolved';

/**
 * 用户角色
 */
export type DisplayUserRole = 'buyer' | 'seller' | 'moderator';

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
  /** 货币类型（支付币种） */
  currency: string;
  /** 原始定价金额（格式化后，如 "0.60"） */
  pricingAmount?: string;
  /** 原始定价币种（如 "USD"） */
  pricingCurrency?: string;
  /** 支付币种（用于订单操作，如 "ETH"） */
  paymentCoin?: string;
  /** 实际支付金额（格式化后，如 "0.0002"） */
  paymentAmount?: string;
  /** 创建时间 */
  createdAt: string;
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
  /** 配送方式名称 */
  shippingOption?: string;
  /** 配送服务名称 */
  shippingService?: string;
  /** 支付交易哈希 */
  paymentTx?: string;
  /** 支付交易确认数 */
  txConfirmations?: number;
  /** 托管交易哈希 */
  escrowTx?: string;
  /** 托管地址 */
  escrowAddress?: string;
  /** 链 ID */
  chainId?: number;
  /** 订单备注 */
  notes?: string;
  /** 订单时间线 */
  timeline: DisplayTimelineEvent[];
  /** 当前用户角色 */
  userRole: DisplayUserRole;
  /** 是否为 RWA 即时交易（链上已完成，无需等待） */
  isRwaInstant?: boolean;
  /** 是否为 RWA 托管交易 */
  isRwaEscrow?: boolean;
  /** RWA 支付锁定信息（仅用于托管模式） */
  paymentLocked?: DisplayPaymentLocked;
  /** 争议信息 */
  dispute?: DisplayDispute;
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
