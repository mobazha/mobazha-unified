/**
 * AppKit 配置
 *
 * 钱包连接配置，支持多链
 * 使用 Reown AppKit 1.8.15
 */

import { sepolia, mainnet } from '@reown/appkit/networks';
import { getEnvConfig } from './env';

// ============= Project ID =============
// 从 Reown Dashboard (https://dashboard.reown.com) 获取
export const APPKIT_PROJECT_ID = 'aee7e021e1d2b5d8e9ec92a4c7e78464';

// ============= 网络配置 =============

// 网络类型 (使用 any 避免 viem 类型问题)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NetworkType = any;

/**
 * 测试网络配置
 * - Sepolia: Ethereum 测试网
 */
export const TEST_NETWORKS: NetworkType[] = [sepolia];

/**
 * 主网网络配置
 * - Ethereum Mainnet
 */
export const PROD_NETWORKS: NetworkType[] = [mainnet];

/**
 * 获取当前环境支持的网络
 */
export function getSupportedNetworks(): NetworkType[] {
  const env = getEnvConfig();
  return env.isTestEnv ? TEST_NETWORKS : PROD_NETWORKS;
}

/**
 * 获取默认网络
 */
export function getDefaultNetwork(): NetworkType {
  const env = getEnvConfig();
  return env.isTestEnv ? sepolia : mainnet;
}

// ============= Metadata =============

/**
 * 应用元数据
 */
export const APPKIT_METADATA = {
  name: 'Mobazha',
  description: 'Mobazha - Where digital assets trade privately in communities',
  url: 'https://mobazha.org',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

// ============= 合约地址 =============

/**
 * Sepolia 测试网合约地址
 */
export const SEPOLIA_CONTRACTS = {
  // RWA Marketplace 相关
  RWAMarketplace: '0x196738d76a0d44f8568488819a2435E284149daA',
  ExampleRWAToken: '0x91DaF662f2D8565C9Fa73a43Ca943ba78b0ff4B7',
  MockUSDT: '0x4399f9fbaf83A631f88615A027152257CDa98c58',

  // Broadway ERC3525 相关
  BroadwayRWA: '0x991354BB4A050A77bB40E1D1ABCf06a45c14819c',
  BroadwaySwap: '0x505d6c446f8Ea4714F01a98166fab4Cae588EaD3',
  RevenueDistributor: '0xbA42D6399099cA751a574AdE46595b6768590a40',

  // NFT OTC 相关 (待部署到 Sepolia)
  NftOtcSwap: '', // TODO: 部署后填入
  ExampleNFT: '', // TODO: 部署后填入
} as const;

/**
 * 主网合约地址 (预留)
 */
export const MAINNET_CONTRACTS = {
  RWAMarketplace: '',
  ExampleRWAToken: '',
  MockUSDT: '',
  BroadwayRWA: '',
  BroadwaySwap: '',
  RevenueDistributor: '',
  NftOtcSwap: '',
  ExampleNFT: '',
} as const;

/**
 * 获取当前环境的合约地址 (AppKit 相关合约)
 */
export function getAppKitContracts() {
  const env = getEnvConfig();
  return env.isTestEnv ? SEPOLIA_CONTRACTS : MAINNET_CONTRACTS;
}

/**
 * 获取指定 AppKit 合约地址
 * 注意: OTC 相关合约地址使用 otcConfig.ts 中的 getContractAddress
 */
export function getAppKitContractAddress(contractName: keyof typeof SEPOLIA_CONTRACTS): string {
  const contracts = getAppKitContracts();
  const address = contracts[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on current network`);
  }
  return address;
}

// ============= 链 ID =============

export const CHAIN_IDS = {
  ETHEREUM_MAINNET: 1,
  SEPOLIA: 11155111,
} as const;

/**
 * 获取当前环境的链 ID
 */
export function getCurrentChainId(): number {
  const env = getEnvConfig();
  return env.isTestEnv ? CHAIN_IDS.SEPOLIA : CHAIN_IDS.ETHEREUM_MAINNET;
}

// ============= 区块浏览器 =============

export const BLOCK_EXPLORERS = {
  [CHAIN_IDS.ETHEREUM_MAINNET]: 'https://etherscan.io',
  [CHAIN_IDS.SEPOLIA]: 'https://sepolia.etherscan.io',
} as const;

/**
 * 获取交易链接
 */
export function getTxUrl(txHash: string, chainId?: number): string {
  const chain = chainId ?? getCurrentChainId();
  const explorer =
    BLOCK_EXPLORERS[chain as keyof typeof BLOCK_EXPLORERS] || BLOCK_EXPLORERS[CHAIN_IDS.SEPOLIA];
  return `${explorer}/tx/${txHash}`;
}

/**
 * 获取地址链接
 */
export function getAddressUrl(address: string, chainId?: number): string {
  const chain = chainId ?? getCurrentChainId();
  const explorer =
    BLOCK_EXPLORERS[chain as keyof typeof BLOCK_EXPLORERS] || BLOCK_EXPLORERS[CHAIN_IDS.SEPOLIA];
  return `${explorer}/address/${address}`;
}

// ============= 平台费用 =============
// 注意: 平台费用相关常量和函数在 otcConfig.ts 中定义
// 使用 PLATFORM_FEE_BPS, FEE_DENOMINATOR, calculateSellerAmount, calculatePlatformFee
// 从 './otcConfig' 导入
