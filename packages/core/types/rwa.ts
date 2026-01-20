/**
 * RWA (Real World Asset) 类型定义
 * 用于 UniversalSwap 原子交换功能
 */

import { ChainId } from '../services/payment/types';

// Token 标准枚举
export type TokenStandard = 'ERC721' | 'ERC1155' | 'ERC3525';

// Token 标准枚举值 (合约中使用)
export const TokenStandardEnum = {
  ERC721: 0,
  ERC1155: 1,
  ERC3525: 2,
} as const;

// 订单状态枚举
export type OrderStatus = 'Active' | 'PaymentLocked' | 'Completed' | 'Cancelled' | 'Expired';

// 订单状态枚举值 (合约中使用)
export const OrderStatusEnum = {
  Active: 0,
  PaymentLocked: 1,
  Completed: 2,
  Cancelled: 3,
  Expired: 4,
} as const;

// 交易模式枚举
export type TradeMode = 'instant' | 'confirm_required';

// 交易模式枚举值 (合约中使用)
export const TradeModeEnum = {
  Instant: 0,
  ConfirmRequired: 1,
} as const;

// 资产类型代码
export type AssetTypeCode = 'NFT' | 'CREATOR' | 'BROADWAY' | 'CUSTOM';

/**
 * 资产类型定义
 */
export interface AssetType {
  code: AssetTypeCode;
  name: string;
  icon: string;
  description: string;
  tokenStandard: TokenStandard | null;
  color: string;
}

/**
 * 会员属性 (ERC1155 特有)
 */
export interface MembershipInfo {
  level: string; // 会员等级
  holderCount: number; // 当前持有人数
  exclusivePerks: number; // 专属福利数量
  validityType: string; // 有效期类型
}

/**
 * 演出收益属性 (ERC3525 特有)
 */
export interface PerformanceInfo {
  totalShares: number; // 总份额
  dividendRate: string; // 分红率
  settlementPeriod: string; // 结算周期
}

/**
 * NFT 元数据 (ERC721 特有)
 */
export interface NftMetadata {
  creator?: string; // 创作者/明星名称
  mintedAt?: number; // 铸造时间 (Unix 时间戳)
  rarity?: string; // 稀有度 (Common, Rare, Epic, Legendary)
  collection?: string; // 收藏品系列名称
  attributes?: Record<string, string>; // 属性键值对
}

/**
 * 预定义资产
 */
export interface PredefinedAsset {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  emoji: string;
  balance: number;
  unit: string;
  tokenStandard: TokenStandard;
  contractAddress: string;
  tokenId: string;
  slotId?: string;
  typeName: string;
  // ERC721 特有属性
  nftMetadata?: NftMetadata;
  // ERC1155 特有属性
  membership?: MembershipInfo;
  // ERC3525 特有属性
  performance?: PerformanceInfo;
  rights: string[];
}

/**
 * UniversalSwap 服务配置
 */
export interface UniversalSwapConfig {
  chainId: number;
  chain: string;
  isTestnet: boolean;
  contractAddress?: string;
}

/**
 * 创建订单数据
 */
export interface CreateOrderData {
  tokenStandard: TokenStandard;
  tokenContract: string;
  tokenId: string;
  amount: string;
  paymentToken: string;
  price: string;
  buyer?: string;
  externalOrderId: string;
}

/**
 * 订单信息
 */
export interface OrderInfo {
  seller: string;
  buyer: string;
  buyerPaymentAddress?: string; // 买家付款地址（实际转账来源）
  buyerReceiveAddress?: string; // 买家接收Token的地址
  standard: TokenStandard;
  tokenContract: string;
  tokenId: string;
  amount: string;
  paymentToken: string;
  price: string;
  status: OrderStatus;
  statusCode?: number; // 状态枚举值
  createdAt: Date;
  completedAt: Date | null;
  externalOrderId: string;
  tradeMode?: string; // 交易模式描述
  tradeModeCode?: number; // 交易模式枚举值
  escrowTimeout?: number; // 托管超时时间（秒）
  paymentLockedAt?: Date | null; // 资金锁定时间
}

/**
 * 挂单状态枚举
 */
export type ListingStatus = 'Active' | 'SoldOut' | 'Cancelled';

/**
 * 挂单状态枚举值 (合约中使用)
 */
export const ListingStatusEnum = {
  Active: 0,
  SoldOut: 1,
  Cancelled: 2,
} as const;

/**
 * 挂单信息 (Listing 模式)
 */
export interface ListingInfo {
  seller: string;
  sellerReceiveAddress: string;
  standard: TokenStandard;
  tokenContract: string;
  tokenId: string;
  totalAmount: string;
  availableAmount: string;
  status: ListingStatus;
  statusCode: number;
  createdAt: Date;
}

/**
 * RWA 交易结果
 */
export interface RwaTransactionResult {
  success: boolean;
  transactionHash: string | null;
  message?: string;
}

/**
 * 创建订单结果
 */
export interface RwaCreateOrderResult extends RwaTransactionResult {
  orderId?: string;
  externalOrderId?: string;
}

/**
 * 订单验证结果
 */
export interface OrderValidationResult {
  isValid: boolean;
  reason: string;
}

/**
 * 平台费用信息
 */
export interface PlatformFeeInfo {
  fee: string;
  percentage: number;
}

/**
 * RWA 商品数据 (用于表单)
 */
export interface RwaListingData {
  assetType: AssetTypeCode;
  selectedAssetId?: string;
  tokenStandard: TokenStandard;
  contractAddress: string;
  tokenId: string;
  slotId?: string;
  // 预定义资产的附加信息
  nftMetadata?: NftMetadata;
  membership?: MembershipInfo;
  performance?: PerformanceInfo;
  rights?: string[];
}

/**
 * 支持的链配置
 */
export interface ChainConfig {
  chainId: number;
  name: string;
  isTestnet: boolean;
  universalSwapAddress: string;
  mockUsdtAddress?: string;
  mockErc721Address?: string;
  mockErc1155Address?: string;
  mockErc3525Address?: string;
}

// Sepolia 测试网配置
export const SEPOLIA_CONFIG: ChainConfig = {
  chainId: ChainId.ETHEREUM_SEPOLIA,
  name: 'Sepolia',
  isTestnet: true,
  // 新合约地址 - 2026-01-19 部署（事件添加 sellerReceiveAddress/feeRecipient）
  universalSwapAddress: '0x9Eb46FFa533B02E46955dd6F1C57414A02AeBF18',
  mockUsdtAddress: '0xbF0cCEd12A16904E8B06a90fA8F8029bB36e3f2e',
  mockErc1155Address: '0xC7345EA65FD12cC3CaD8F9991cFA46C13c0B1DF8',
  mockErc3525Address: '0xccf9C481A2DDaC0ad5a55c3a07C5Cd04cA3d343e',
};

// 支持的链配置映射
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  sepolia: SEPOLIA_CONFIG,
};

/**
 * 根据链名称获取配置
 */
export function getChainConfig(chain: string, isTestnet = true): ChainConfig | null {
  if (chain === 'sepolia' || (chain === 'ethereum' && isTestnet)) {
    return SEPOLIA_CONFIG;
  }
  return SUPPORTED_CHAINS[chain] || null;
}

// ==================== 链上资产查询类型 ====================

/**
 * 用户拥有的 ERC3525 Token
 */
export interface OwnedERC3525Token {
  tokenId: string;
  slot: string;
  value: string;
  contractAddress: string;
}

/**
 * 用户拥有的 ERC1155 Token
 */
export interface OwnedERC1155Token {
  contractAddress: string;
  tokenId: string;
  balance: string;
}

/**
 * 用户 RWA 资产汇总
 */
export interface UserRwaAssets {
  erc1155: OwnedERC1155Token[];
  erc3525: OwnedERC3525Token[];
}

/**
 * RWA 资产 (UI 展示用)
 */
export interface RwaAsset {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  tokenStandard: TokenStandard;
  contractAddress: string;
  tokenId: string;
  slotId?: string;
  balance: string;
  unit: string;
  // 来源: 'predefined' | 'discovered'
  source: 'predefined' | 'discovered';
  // 预定义资产的附加信息
  nftMetadata?: NftMetadata;
  membership?: MembershipInfo;
  performance?: PerformanceInfo;
  rights?: string[];
  // ERC3525 token 详情 (同一 slot 下可能有多个 token)
  tokenDetails?: OwnedERC3525Token[];
}

/**
 * Etherscan URL 生成器
 */
export interface EtherscanUrls {
  contract: (contractAddress: string) => string;
  address: (address: string) => string;
  tx: (txHash: string) => string;
  tokenHolders: (contractAddress: string) => string;
  nft: (contractAddress: string, tokenId: string) => string;
}

/**
 * Value 来源信息 (ERC3525)
 */
export interface ValueSource {
  fromTokenId: string;
  value: string;
}

/**
 * Token 转账记录
 */
export interface TokenTransfer {
  hash: string;
  from: string;
  to: string;
  contractAddress?: string; // 合约地址
  tokenId?: string;
  slotId?: string; // ERC3525 slot ID
  value?: string;
  timestamp: number;
  blockNumber: number;
  type: 'in' | 'out';
  valueSources?: ValueSource[]; // ERC3525 value 来源详情
  initiatedBy?: string; // 交易发起者地址
}

// ==================== 价格历史类型 ====================

/**
 * 时间范围枚举
 */
export type TimeRange = '1W' | '1M' | 'ALL';

/**
 * 价格数据点
 */
export interface PricePoint {
  timestamp: number; // Unix 毫秒时间戳
  price: string; // 成交价格（支付代币单位）
  volume?: string; // 成交量
  txHash?: string; // 交易哈希
}

/**
 * 价格历史响应
 */
export interface PriceHistory {
  contractAddress: string;
  tokenId?: string;
  slotId?: string;
  points: PricePoint[];
  currency: string; // 支付代币符号，如 USDT
  // 统计数据
  stats?: PriceStats;
}

/**
 * 价格统计数据
 */
export interface PriceStats {
  lastPrice: string; // 最新价格
  highPrice: string; // 最高价
  lowPrice: string; // 最低价
  avgPrice: string; // 平均价格
  priceChange: string; // 价格变化（百分比）
  totalVolume: string; // 总成交量
}
