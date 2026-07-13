import type { Image, Price } from './common';
import type { ShippingProfile } from './shippingConfig';
import type { ListingSupplySummaryItem } from './supplyAvailability';

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
  /** Fallback base price when variant prices override storefront display */
  basePrice?: Price;
  /** Highest explicit variant price when variants differ */
  priceMax?: Price;
  /** True when variant prices span a range */
  priceHasRange?: boolean;
  averageRating?: number;
  ratingCount?: number;
  vendorPeerID: string;
  vendorName?: string;
  vendorAvatarHashes?: Image;
  freeShipping?: string[];
  nsfw?: boolean;
  contractType?: ContractType;
  /** IPFS CID - 用于购买时的 listingHash */
  cid?: string;
  /** 代币标准: ERC721/ERC1155/ERC3525 */
  tokenStandard?: string;
  /** RWA 交易模式: 0=即时, 1=需确认 */
  rwaTradeMode?: number;
  /** 仲裁员 peerID 列表 */
  moderators?: string[];
  /** 商品类型（单值分类） */
  productType?: string;
  /** 商品发布状态 */
  status?: ListingStatus;
  /** 库存数量（列表 API 可能不返回，编辑页从 item.skus 汇总） */
  quantity?: number;
  /** 卖家管理列表可用的供给/可售摘要；公开列表和旧节点可能不返回。 */
  supplySummary?: ListingSupplySummaryItem;
  /** Search/index tags when available (used for curated related-listing scope). */
  tags?: string[];
}

/**
 * 商品发布状态
 */
export type ListingStatus = 'draft' | 'published' | 'private';

export type WeightUnit = 'g' | 'kg' | 'lb' | 'oz';

export type InventoryPolicy = 'deny' | 'continue';

export type DimensionUnit = 'cm' | 'in';

/**
 * 商品详情（完整）
 */
export interface Product {
  slug: string;
  vendorID: VendorID;
  metadata: ProductMetadata;
  item: ProductItem;
  /** Shopify 风格配送档案（新版） */
  shippingProfile?: ShippingProfile;
  taxes?: Tax[];
  moderators?: string[];
  /** 商品发布状态: draft/published/private */
  status?: ListingStatus;
}

/**
 * 卖家 ID
 */
export interface VendorID {
  peerID: string;
  name?: string;
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
  acceptedCurrencies: string[];
  pricingCurrency: {
    code: string;
    divisibility: number;
  };
  language?: string;
  escrowTimeoutHours: number;
  coinType?: string;
  coinDivisibility?: number;
  priceModifier?: number;
  /** RWA 交易模式: 0=即时交易, 1=需确认交易 */
  rwaTradeMode?: number;
  /** RWA 托管超时时间（秒） */
  rwaEscrowTimeoutSeconds?: number;
  /** RWA 托管超时时间（秒）- 备用字段名 */
  escrowTimeoutSeconds?: number;
}

/**
 * 合约类型常量
 */
export const CONTRACT_TYPES = {
  PHYSICAL_GOOD: 'PHYSICAL_GOOD',
  DIGITAL_GOOD: 'DIGITAL_GOOD',
  SERVICE: 'SERVICE',
  CRYPTOCURRENCY: 'CRYPTOCURRENCY',
  RWA_TOKEN: 'RWA_TOKEN',
} as const;

/**
 * 合约类型
 */
export type ContractType = (typeof CONTRACT_TYPES)[keyof typeof CONTRACT_TYPES];

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
  /** 短描述（用于搜索结果和商品卡片展示） */
  shortDescription?: string;
  processingTime: string;
  price: number;
  /** 划线价/原价（展示折扣用） */
  regularPrice?: string;
  /** 促销价 */
  salePrice?: string;
  nsfw: boolean;
  tags?: string[];
  images: Image[];
  productType?: string;
  grams?: number;
  /** 重量单位: g/kg/lb/oz */
  weightUnit?: WeightUnit;
  /** 库存策略: deny(缺货拒绝下单)/continue(缺货继续销售) */
  inventoryPolicy?: InventoryPolicy;
  /** 包裹长度 */
  packageLength?: number;
  /** 包裹宽度 */
  packageWidth?: number;
  /** 包裹高度 */
  packageHeight?: number;
  /** 尺寸单位: cm/in */
  dimensionUnit?: DimensionUnit;
  /** 品牌名称 */
  brand?: string;
  condition?: ProductCondition;
  options?: ProductOption[];
  skus?: ProductSku[];
  priceCurrency?: {
    code: string;
    divisibility: number;
  };
  /** RWA Token 相关字段 */
  blockchain?: string;
  tokenAddress?: string;
  tokenStandard?: string;
  cryptoListingCurrencyCode?: string;
  minQuantity?: number;
  maxQuantity?: number;
  /** Signed listing optional features (collectibles bindings or commercial upsells). */
  optionalFeatures?: Array<
    { name: string; surcharge?: string; description?: string; price?: number } | string
  >;
  /** 视频相关字段 */
  introVideo?: string;
  altIntroVideoLinks?: string[];
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
 * SKU 选择项
 */
export interface SkuSelection {
  option: string;
  variant: string;
}

/**
 * SKU（Shopify 风格绝对定价）
 */
export interface ProductSku {
  selections?: SkuSelection[];
  productID?: string;
  quantity?: string;
  price?: string; // 变体绝对价格
  compareAtPrice?: string; // 划线价/原价（展示折扣用）
  images?: Image[];
  barcode?: string; // 条码（UPC/EAN/ISBN）
  weight?: number; // 变体重量（克）
  downloadable?: boolean;
}

/**
 * 满额免邮配置
 */
export interface FreeShippingThreshold {
  enabled: boolean;
  minAmount: string;
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
 * 商品评分（简略，用于商品详情页）
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
  imageHashes?: string[];
  anonymous?: boolean;
  buyerID?: {
    peerID: string;
    handle?: string;
  };
}

/**
 * 评价索引（ratingindex API 返回）
 * 包含统计信息和评价 ID 列表
 */
export interface RatingIndex {
  slug?: string;
  count: number;
  average: number;
  ratings: string[]; // CID 字符串数组
}

/**
 * 详细评价数据（fetchratings API 返回）
 * 包含完整的评价信息，用于店铺评价列表
 */
export interface RatingDetail {
  ratingID: string;
  timestamp: string;
  overall: number;
  review?: string;
  imageHashes?: string[];
  anonymous?: boolean;
  buyerID?: {
    peerID: string;
    handle?: string;
  };
  vendorID?: {
    peerID: string;
    handle?: string;
  };
  vendorSig?: {
    slug: string;
    title?: string;
    thumbnail?: {
      tiny?: string;
      small?: string;
      medium?: string;
    };
    metadata?: {
      thumbnail?: {
        tiny?: string;
        small?: string;
        medium?: string;
      };
    };
  };
}

/**
 * 支持的区块链网络
 */
export type BlockchainNetwork =
  | 'ETH'
  | 'BSC'
  | 'BASE'
  | 'POLYGON'
  | 'ARBITRUM'
  | 'OPTIMISM'
  | 'AVALANCHE'
  | 'SOL';

/**
 * 区块链网络信息
 */
export interface BlockchainInfo {
  code: BlockchainNetwork;
  name: string;
  chainId?: number;
}

/**
 * RWA Token 类型
 */
export type RwaTokenType =
  | 'REAL_ESTATE'
  | 'BOND'
  | 'COMMODITY'
  | 'ART'
  | 'CARBON_CREDIT'
  | 'CUSTOM';

/**
 * RWA Token 信息
 */
export interface RwaTokenInfo {
  code: string;
  name: string;
  symbol: string;
  contractAddress: string;
  blockchain: BlockchainNetwork;
  tokenType: RwaTokenType;
  currentPrice?: number;
  issuer?: string;
  verification?: {
    verified: boolean;
    verifiedBy?: string;
  };
  metadata?: {
    riskLevel?: 'low' | 'medium' | 'high';
    description?: string;
    website?: string;
  };
}

/**
 * 支持的支付币种（按区块链）
 */
export interface AcceptedCurrency {
  code: string;
  name: string;
  blockchain: BlockchainNetwork;
}
