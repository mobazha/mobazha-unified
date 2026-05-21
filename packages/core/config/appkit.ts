/**
 * AppKit 配置
 *
 * 钱包连接配置，支持多链
 * 使用 Reown AppKit 1.8.15
 *
 * IMPORTANT: This file must NOT import from @reown/appkit or viem.
 * Those packages contain browser-only code that breaks SSR when resolved
 * by the Next.js server bundler. AppKit network objects are resolved in
 * AppKitProvider.tsx (which has 'use client').
 */

import { getExplorerResourceUrl } from '../services/payment/explorers';
import { getEnvConfig } from './env';
// 从 Reown Dashboard (https://dashboard.reown.com) 获取
export const APPKIT_PROJECT_ID = 'aee7e021e1d2b5d8e9ec92a4c7e78464';

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

  // NFT OTC 相关
  NftOtcSwap: '0xaa74D3f46c77339dDD727D85D0eF3917580DC402',
  ExampleNFT: '0x525Cc7f3eb25F71b6912468A19e6f01C0Fc2e159',
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
 */
export function getAppKitContractAddress(contractName: keyof typeof SEPOLIA_CONTRACTS): string {
  const contracts = getAppKitContracts();
  const address = contracts[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on current network`);
  }
  return address;
}

/**
 * 根据 Token 符号获取合约地址
 * @param tokenSymbol - Token 符号 (USDT, USDC 等)
 * @param chainId - 可选的链 ID (当前未使用，预留多链支持)
 */
export function getContractAddress(tokenSymbol: string, _chainId?: number): string {
  const contracts = getAppKitContracts();

  // Token 符号到合约名称的映射
  const tokenContractMap: Record<string, keyof typeof SEPOLIA_CONTRACTS> = {
    USDT: 'MockUSDT',
    USDC: 'MockUSDT', // 测试环境使用相同的 Mock 合约
  };

  const contractName = tokenContractMap[tokenSymbol.toUpperCase()];
  if (!contractName) {
    throw new Error(`Unknown token symbol: ${tokenSymbol}`);
  }

  const address = contracts[contractName];
  if (!address) {
    throw new Error(`Contract for ${tokenSymbol} not deployed on current network`);
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

/**
 * 获取交易链接
 */
export function getTxUrl(txHash: string, chainId?: number): string {
  const chain = chainId ?? getCurrentChainId();
  return getExplorerResourceUrl(txHash, 'tx', { chainId: chain }) || '';
}

/**
 * 获取地址链接
 */
export function getAddressUrl(address: string, chainId?: number): string {
  const chain = chainId ?? getCurrentChainId();
  return getExplorerResourceUrl(address, 'address', { chainId: chain }) || '';
}

// ============= 平台费用 =============
// 注意: 平台费用相关常量和函数在 otcConfig.ts 中定义
// 使用 PLATFORM_FEE_BPS, FEE_DENOMINATOR, calculateSellerAmount, calculatePlatformFee
// 从 './otcConfig' 导入
