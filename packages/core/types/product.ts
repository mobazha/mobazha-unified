import type { Image, Price, CryptoType } from './common';

/**
 * 商品分类
 */
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  count?: number;
  parentId?: string;
  icon?: string;
}

/**
 * 商品列表项（简略）
 */
export interface ProductListItem {
  slug: string;
  title: string;
  thumbnail: Image;
  price: Price;
  averageRating?: number;
  ratingCount?: number;
  vendorPeerID: string;
  vendorName?: string;
  vendorAvatarHashes?: Image;
  freeShipping?: string[];
  nsfw?: boolean;
  contractType?: ContractType;
  /** 仲裁员 peerID 列表 */
  moderators?: string[];
}

/**
 * 商品详情（完整）
 */
export interface Product {
  slug: string;
  vendorID: VendorID;
  metadata: ProductMetadata;
  item: ProductItem;
  shippingOptions?: ShippingOption[];
  taxes?: Tax[];
  coupons?: Coupon[];
  moderators?: string[];
  termsAndConditions?: string;
  refundPolicy?: string;
}

/**
 * 卖家 ID
 */
export interface VendorID {
  peerID: string;
  handle?: string;
  pubkeys?: {
    identity: string;
    bitcoin: string;
  };
  bitcoinSig?: string;
}

/**
 * 商品元数据
 */
export interface ProductMetadata {
  version: number;
  contractType: ContractType;
  format: ListingFormat;
  expiry: string;
  acceptedCurrencies: CryptoType[];
  pricingCurrency: {
    code: string;
    divisibility: number;
  };
  language?: string;
  escrowTimeoutHours: number;
  coinType?: string;
  coinDivisibility?: number;
  priceModifier?: number;
}

/**
 * 合约类型
 */
export type ContractType = 'PHYSICAL_GOOD' | 'DIGITAL_GOOD' | 'SERVICE' | 'CRYPTOCURRENCY';

/**
 * 列表格式
 */
export type ListingFormat = 'FIXED_PRICE' | 'AUCTION' | 'MARKET_PRICE';

/**
 * 商品项
 */
export interface ProductItem {
  title: string;
  description: string;
  processingTime: string;
  price: number;
  nsfw: boolean;
  tags?: string[];
  images: Image[];
  categories?: string[];
  grams?: number;
  condition?: ProductCondition;
  options?: ProductOption[];
  skus?: ProductSku[];
  priceCurrency?: {
    code: string;
    divisibility: number;
  };
}

/**
 * 商品状态
 */
export type ProductCondition = 'NEW' | 'USED_EXCELLENT' | 'USED_GOOD' | 'USED_POOR' | 'REFURBISHED';

/**
 * 商品选项（如颜色、尺寸）
 */
export interface ProductOption {
  name: string;
  description?: string;
  variants: ProductVariant[];
}

/**
 * 商品变体
 */
export interface ProductVariant {
  name: string;
  image?: Image;
}

/**
 * SKU
 */
export interface ProductSku {
  productID?: string;
  surcharge?: number;
  quantity?: number;
  variantCombo?: number[];
}

/**
 * 运输选项
 */
export interface ShippingOption {
  name: string;
  type: ShippingType;
  regions: string[];
  services: ShippingService[];
}

/**
 * 运输类型
 */
export type ShippingType = 'LOCAL_PICKUP' | 'FIXED_PRICE';

/**
 * 运输服务
 */
export interface ShippingService {
  name: string;
  price: number;
  estimatedDelivery: string;
  additionalItemPrice?: number;
}

/**
 * 税费
 */
export interface Tax {
  taxType: string;
  taxRegions: string[];
  taxShipping: boolean;
  percentage: number;
}

/**
 * 优惠券
 */
export interface Coupon {
  title: string;
  code?: string;
  hash?: string;
  discountCode?: string;
  percentDiscount?: number;
  priceDiscount?: number;
}

/**
 * 商品评分
 */
export interface ProductRating {
  ratingID: string;
  timestamp: string;
  overall: number;
  quality?: number;
  description?: number;
  deliverySpeed?: number;
  customerService?: number;
  review?: string;
  anonymous?: boolean;
  buyerID?: {
    peerID: string;
    handle?: string;
  };
}
