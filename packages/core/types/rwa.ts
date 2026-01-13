/**
 * RWA (Real World Asset) 类型定义
 * 用于 UniversalSwap 原子交换功能
 */

// Token 标准枚举
export type TokenStandard = 'ERC721' | 'ERC1155' | 'ERC3525';

// Token 标准枚举值 (合约中使用)
export const TokenStandardEnum = {
  ERC721: 0,
  ERC1155: 1,
  ERC3525: 2,
} as const;

// 订单状态枚举
export type OrderStatus = 'Active' | 'Completed' | 'Cancelled';

// 订单状态枚举值 (合约中使用)
export const OrderStatusEnum = {
  Active: 0,
  Completed: 1,
  Cancelled: 2,
} as const;

// 资产类型代码
export type AssetTypeCode = 'CREATOR' | 'BROADWAY' | 'CUSTOM';

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
  standard: TokenStandard;
  tokenContract: string;
  tokenId: string;
  amount: string;
  paymentToken: string;
  price: string;
  status: OrderStatus;
  createdAt: Date;
  completedAt: Date | null;
  externalOrderId: string;
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
  mockErc1155Address?: string;
  mockErc3525Address?: string;
}

// Sepolia 测试网配置
export const SEPOLIA_CONFIG: ChainConfig = {
  chainId: 11155111,
  name: 'Sepolia',
  isTestnet: true,
  universalSwapAddress: '0x401870C8bDfFeC7561E654764720184a32aB6730',
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
  membership?: MembershipInfo;
  performance?: PerformanceInfo;
  rights?: string[];
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
 * Token 转账记录
 */
export interface TokenTransfer {
  hash: string;
  from: string;
  to: string;
  tokenId?: string;
  value?: string;
  timestamp: number;
  blockNumber: number;
  type: 'in' | 'out';
}
