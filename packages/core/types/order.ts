import type { Image, Price, Address, CryptoType } from './common';
import type { ProductItem, ShippingOption, VendorID } from './product';

/**
 * 订单状态
 */
export type OrderState =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_PICKUP'
  | 'AWAITING_FULFILLMENT'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'DECLINED'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'DECIDED'
  | 'RESOLVED'
  | 'PAYMENT_FINALIZED'
  | 'PROCESSING_ERROR';

/**
 * 订单角色
 */
export type OrderRole = 'buyer' | 'vendor';

/**
 * 订单列表项
 */
export interface OrderListItem {
  orderId: string;
  slug: string;
  title: string;
  thumbnail: Image;
  total: Price;
  quantity: number;
  timestamp: string;
  state: OrderState;
  read: boolean;
  vendorId: string;
  vendorHandle?: string;
  buyerId: string;
  buyerHandle?: string;
  paymentCoin: CryptoType;
  coinType: string;
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
  read: boolean;
  funded: boolean;
  unreadChatMessages: number;
  paymentAddressTransactions: PaymentTransaction[];
  refundAddressTransaction?: PaymentTransaction;
}

/**
 * 订单合约
 */
export interface OrderContract {
  vendorListings: ContractListing[];
  buyerOrder: BuyerOrder;
  vendorOrderConfirmation?: VendorOrderConfirmation;
  vendorOrderFulfillment?: VendorOrderFulfillment[];
  buyerOrderCompletion?: BuyerOrderCompletion;
  disputeResolution?: DisputeResolution;
  signatures?: ContractSignature[];
  errors?: string[];
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
    acceptedCurrencies: CryptoType[];
    pricingCurrency: {
      code: string;
      divisibility: number;
    };
  };
  item: ProductItem;
  shippingOptions?: ShippingOption[];
  coupons?: { hash: string }[];
}

/**
 * 买家订单
 */
export interface BuyerOrder {
  refundAddress: string;
  refundFee: number;
  shipping?: Address;
  buyerID: {
    peerID: string;
    handle?: string;
    pubkeys?: {
      identity: string;
      bitcoin: string;
    };
  };
  timestamp: string;
  items: OrderItem[];
  payment: OrderPayment;
  ratingKeys?: string[];
  alternateContactInfo?: string;
  version: number;
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
 * 订单支付信息
 */
export interface OrderPayment {
  method: PaymentMethod;
  moderator?: string;
  amount: number;
  chaincode?: string;
  address?: string;
  redeemScript?: string;
  moderatorKey?: string;
  coin: CryptoType;
}

/**
 * 支付方式
 */
export type PaymentMethod = 'ADDRESS_REQUEST' | 'DIRECT' | 'MODERATED';

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
 * 卖家订单确认
 */
export interface VendorOrderConfirmation {
  timestamp: string;
  paymentAddress: string;
  requestedAmount: number;
  ratingSignatures?: RatingSignature[];
}

/**
 * 评分签名
 */
export interface RatingSignature {
  metadata: {
    listingSlug: string;
    ratingKey: string;
  };
  signature: string;
}

/**
 * 卖家发货
 */
export interface VendorOrderFulfillment {
  orderId: string;
  slug: string;
  timestamp: string;
  physicalDelivery?: PhysicalDelivery[];
  digitalDelivery?: DigitalDelivery;
  payout?: FulfillmentPayout;
  ratingSignatures?: RatingSignature[];
  note?: string;
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
 * 发货支付
 */
export interface FulfillmentPayout {
  sigs: { inputIndex: number; signature: string }[];
  payoutAddress: string;
  payoutFeePerByte: number;
}

/**
 * 买家完成订单
 */
export interface BuyerOrderCompletion {
  orderId: string;
  timestamp: string;
  ratings?: OrderRating[];
  payoutSigs?: { inputIndex: number; signature: string }[];
}

/**
 * 订单评分
 */
export interface OrderRating {
  slug: string;
  overall: number;
  quality?: number;
  description?: number;
  deliverySpeed?: number;
  customerService?: number;
  review?: string;
  anonymous?: boolean;
}

/**
 * 争议解决
 */
export interface DisputeResolution {
  timestamp: string;
  orderId: string;
  proposedBy: string;
  resolution: string;
  payout: {
    buyerOutput?: { address: string; amount: number };
    vendorOutput?: { address: string; amount: number };
    moderatorOutput?: { address: string; amount: number };
  };
  moderatorRatingSigs?: RatingSignature[];
}

/**
 * 合约签名
 */
export interface ContractSignature {
  section: string;
  signatureBytes: string;
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
    vendorHandle?: string;
  };
  quantity: number;
  options?: OrderItemOption[];
  shippingOption?: OrderShippingOption;
  memo?: string;
  couponCodes?: string[];
}
