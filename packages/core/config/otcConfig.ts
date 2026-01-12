/**
 * OTC 交易配置
 */

import type { OtcConfig, DemoNft, DemoRwaAsset } from '../types/otc';

// ============================================================
// 网络配置
// ============================================================

export const OTC_CONFIGS: Record<number, OtcConfig> = {
  // Sepolia 测试网 (主要测试网络)
  11155111: {
    chainId: 11155111,
    chainName: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    contracts: {
      NftOtcSwap: '0xaa74D3f46c77339dDD727D85D0eF3917580DC402',
      ExampleNFT: '0x525Cc7f3eb25F71b6912468A19e6f01C0Fc2e159',
      BroadwaySwap: '0x505d6c446f8Ea4714F01a98166fab4Cae588EaD3',
      StarlightDreamsRWA: '0x991354BB4A050A77bB40E1D1ABCf06a45c14819c', // BroadwayRWA
      USDT: '0x4399f9fbaf83A631f88615A027152257CDa98c58', // MockUSDT
      USDC: '0x0000000000000000000000000000000000000000', // 待部署
    },
    telegramBotUsername: 'mobazha_test_bot',
  },
  // Base Sepolia 测试网 (备用)
  84532: {
    chainId: 84532,
    chainName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    contracts: {
      NftOtcSwap: '0x4c1A1b21c4471CA57145EE08404Cbaf9C8B83991',
      ExampleNFT: '0x17ebC8FeE90E7556E1E12Aa42604477D6A243324',
      BroadwaySwap: '0x0000000000000000000000000000000000000000', // 待部署
      StarlightDreamsRWA: '0x0000000000000000000000000000000000000000', // 待部署
      USDT: '0x0000000000000000000000000000000000000000', // 待部署
      USDC: '0x0000000000000000000000000000000000000000', // 待部署
    },
    telegramBotUsername: 'mobazha_test_bot',
  },
  // Base 主网 (预留)
  8453: {
    chainId: 8453,
    chainName: 'Base Mainnet',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorerUrl: 'https://basescan.org',
    contracts: {
      NftOtcSwap: '0x0000000000000000000000000000000000000000',
      ExampleNFT: '0x0000000000000000000000000000000000000000',
      BroadwaySwap: '0x0000000000000000000000000000000000000000',
      StarlightDreamsRWA: '0x0000000000000000000000000000000000000000',
      USDT: '0x0000000000000000000000000000000000000000',
      USDC: '0x0000000000000000000000000000000000000000',
    },
    telegramBotUsername: 'mobazha_bot',
  },
  // Ethereum 主网 (预留)
  1: {
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorerUrl: 'https://etherscan.io',
    contracts: {
      NftOtcSwap: '0x0000000000000000000000000000000000000000',
      ExampleNFT: '0x0000000000000000000000000000000000000000',
      BroadwaySwap: '0x0000000000000000000000000000000000000000',
      StarlightDreamsRWA: '0x0000000000000000000000000000000000000000',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Tether USD
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USD Coin
    },
    telegramBotUsername: 'mobazha_bot',
  },
};

// 默认链 ID (Sepolia 测试网)
export const DEFAULT_CHAIN_ID = 11155111;

// ============================================================
// 获取配置方法
// ============================================================

/**
 * 获取 OTC 配置
 * @param chainId 链 ID，默认为测试网
 */
export function getOtcConfig(chainId: number = DEFAULT_CHAIN_ID): OtcConfig {
  const config = OTC_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
}

/**
 * 获取合约地址
 * @param contractName 合约名称
 * @param chainId 链 ID
 */
export function getContractAddress(
  contractName: keyof OtcConfig['contracts'],
  chainId: number = DEFAULT_CHAIN_ID
): string {
  const config = getOtcConfig(chainId);
  const address = config.contracts[contractName];
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract ${contractName} not deployed on chain ${chainId}`);
  }
  return address;
}

/**
 * 检查合约是否已部署
 */
export function isContractDeployed(
  contractName: keyof OtcConfig['contracts'],
  chainId: number = DEFAULT_CHAIN_ID
): boolean {
  try {
    const address = getContractAddress(contractName, chainId);
    return address !== '0x0000000000000000000000000000000000000000';
  } catch {
    return false;
  }
}

// ============================================================
// 平台费用
// ============================================================

/** 平台费用 (基点) */
export const PLATFORM_FEE_BPS = 500; // 5%

/** 费用分母 */
export const FEE_DENOMINATOR = 10000;

/**
 * 计算卖家实际到账金额
 * @param totalPrice 总价
 */
export function calculateSellerAmount(totalPrice: number): number {
  const fee = (totalPrice * PLATFORM_FEE_BPS) / FEE_DENOMINATOR;
  return totalPrice - fee;
}

/**
 * 计算平台费用
 * @param totalPrice 总价
 */
export function calculatePlatformFee(totalPrice: number): number {
  return (totalPrice * PLATFORM_FEE_BPS) / FEE_DENOMINATOR;
}

// ============================================================
// 演示数据
// ============================================================

export const DEMO_NFTS: DemoNft[] = [
  {
    tokenId: 1,
    name: 'KOL 限量签名照 #1',
    description: '某知名 KOL 的限量签名照，全球仅发行 100 份',
    creator: 'CryptoKOL',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop',
    contractAddress: OTC_CONFIGS[DEFAULT_CHAIN_ID].contracts.ExampleNFT,
  },
  {
    tokenId: 2,
    name: '明星演唱会纪念 NFT',
    description: '2024 演唱会独家纪念数字收藏品',
    creator: 'StarArtist',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
    contractAddress: OTC_CONFIGS[DEFAULT_CHAIN_ID].contracts.ExampleNFT,
  },
  {
    tokenId: 3,
    name: '游戏主播签名头像',
    description: '知名游戏主播专属签名头像 NFT',
    creator: 'GameStreamer',
    image: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400&h=400&fit=crop',
    contractAddress: OTC_CONFIGS[DEFAULT_CHAIN_ID].contracts.ExampleNFT,
  },
];

export const DEMO_RWA_ASSETS: DemoRwaAsset[] = [
  {
    tokenId: 1,
    slot: 101,
    name: 'Starlight Dreams - 第一幕份额',
    description: '音乐剧《Starlight Dreams》第一幕票房收益份额',
    totalShares: 10000,
    userShares: 1000,
    expectedRevenue: {
      weekly: 5000,
      annualized: 260000,
    },
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&h=400&fit=crop',
  },
  {
    tokenId: 2,
    slot: 101,
    name: 'Starlight Dreams - 第二幕份额',
    description: '音乐剧《Starlight Dreams》第二幕票房收益份额',
    totalShares: 10000,
    userShares: 500,
    expectedRevenue: {
      weekly: 3000,
      annualized: 156000,
    },
    image: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=400&h=400&fit=crop',
  },
];

// ============================================================
// 支付代币配置
// ============================================================

export interface PaymentToken {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  icon?: string;
}

export const PAYMENT_TOKENS: Record<number, PaymentToken[]> = {
  // Sepolia 测试网
  11155111: [
    {
      symbol: 'USDT',
      name: 'Mock USDT',
      decimals: 6,
      address: OTC_CONFIGS[11155111].contracts.USDT,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000', // Native ETH
    },
  ],
  // Base Sepolia 测试网
  84532: [
    {
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      address: OTC_CONFIGS[84532].contracts.USDT,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: OTC_CONFIGS[84532].contracts.USDC,
    },
  ],
  // Ethereum 主网
  1: [
    {
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      address: OTC_CONFIGS[1].contracts.USDT,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: OTC_CONFIGS[1].contracts.USDC,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000', // Native ETH
    },
  ],
};

/**
 * 获取支付代币列表
 */
export function getPaymentTokens(chainId: number = DEFAULT_CHAIN_ID): PaymentToken[] {
  return PAYMENT_TOKENS[chainId] || [];
}

/**
 * 获取支付代币信息
 */
export function getPaymentToken(
  address: string,
  chainId: number = DEFAULT_CHAIN_ID
): PaymentToken | undefined {
  const tokens = getPaymentTokens(chainId);
  return tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
}
