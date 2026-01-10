/**
 * OTC 交易相关类型定义
 */

// ============================================================
// NFT OTC 类型
// ============================================================

export enum NftOrderStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

export interface NftOrder {
  /** 订单 ID (私密 ID) */
  orderId: string;
  /** 卖家地址 */
  seller: string;
  /** NFT 合约地址 */
  nftContract: string;
  /** Token ID */
  tokenId: number;
  /** 支付代币地址 */
  paymentToken: string;
  /** 价格 (已格式化) */
  price: string;
  /** 订单状态 */
  status: NftOrderStatus;
  /** 创建时间 (Unix 时间戳) */
  createdAt: number;
  /** 完成时间 (Unix 时间戳) */
  completedAt: number;
}

export interface NftMetadata {
  /** NFT 名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 创作者/明星名称 */
  creator: string;
  /** 铸造时间 */
  mintedAt: number;
  /** 图片 URL */
  image?: string;
  /** Token URI */
  tokenURI?: string;
}

export interface UserNft {
  /** Token ID */
  tokenId: number;
  /** 合约地址 */
  contractAddress: string;
  /** 元数据 */
  metadata: NftMetadata;
}

export interface CreateNftOrderParams {
  /** NFT 合约地址 */
  nftContract: string;
  /** Token ID */
  tokenId: number;
  /** 价格 (原始数值，将被转换为 Wei) */
  price: number;
  /** 支付代币地址 */
  paymentToken: string;
}

// ============================================================
// ERC3525 (RWA) OTC 类型
// ============================================================

export enum Erc3525OrderStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

export interface Erc3525Holding {
  /** Token ID */
  tokenId: number;
  /** Slot ID (资产类别) */
  slot: number;
  /** 持有份额数量 */
  value: number;
  /** 资产名称 */
  name: string;
  /** 资产描述 */
  description?: string;
}

export interface Erc3525Order {
  /** 订单 ID */
  orderId: string;
  /** 卖家地址 */
  seller: string;
  /** RWA Token 合约地址 */
  rwaToken: string;
  /** Token ID */
  tokenId: number;
  /** 出售份额数量 */
  shares: number;
  /** 支付代币地址 */
  paymentToken: string;
  /** 价格 (已格式化) */
  price: string;
  /** 订单状态 */
  status: Erc3525OrderStatus;
  /** 创建时间 */
  createdAt: number;
  /** 完成时间 */
  completedAt: number;
}

export interface ExpectedRevenue {
  /** 周收益 */
  weekly: number;
  /** 年化收益 */
  annualized: number;
}

export interface CreateErc3525OrderParams {
  /** RWA Token 合约地址 */
  rwaToken: string;
  /** Token ID */
  tokenId: number;
  /** 出售份额数量 */
  shares: number;
  /** 总价 */
  price: number;
  /** 支付代币地址 */
  paymentToken: string;
}

// ============================================================
// 通用类型
// ============================================================

export interface OtcConfig {
  /** 链 ID */
  chainId: number;
  /** 链名称 */
  chainName: string;
  /** RPC URL */
  rpcUrl: string;
  /** 区块浏览器 URL */
  blockExplorerUrl: string;
  /** 合约地址 */
  contracts: {
    NftOtcSwap: string;
    ExampleNFT: string;
    BroadwaySwap: string;
    StarlightDreamsRWA: string;
    USDT: string;
    USDC: string;
  };
  /** Telegram Bot 用户名 */
  telegramBotUsername: string;
}

export interface ShareLink {
  /** Web 链接 */
  webUrl: string;
  /** Telegram Bot 链接 */
  telegramUrl: string;
}

export interface OtcTransactionResult {
  /** 是否成功 */
  success: boolean;
  /** 交易哈希 */
  txHash?: string;
  /** 错误信息 */
  error?: string;
}

// ============================================================
// Demo 数据类型
// ============================================================

export interface DemoNft {
  tokenId: number;
  name: string;
  description: string;
  creator: string;
  image: string;
  contractAddress: string;
}

export interface DemoRwaAsset {
  tokenId: number;
  slot: number;
  name: string;
  description: string;
  totalShares: number;
  userShares: number;
  expectedRevenue: ExpectedRevenue;
  image?: string;
}
