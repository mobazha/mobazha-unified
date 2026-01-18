/**
 * RWA 链上余额查询服务
 * 支持 ERC1155 和 ERC3525 代币的实时余额查询
 * 优先使用钱包 Provider，回退到公共 RPC
 */

import { ethers } from 'ethers';
import type {
  OwnedERC3525Token,
  OwnedERC1155Token,
  PredefinedAsset,
  EtherscanUrls,
} from '../../types/rwa';
import { ChainId } from '../payment/types';
import { getCurrentChainId, BLOCK_EXPLORERS } from '../../config/appkit';

// 导出 Sepolia Chain ID 常量以保持向后兼容
export const SEPOLIA_CHAIN_ID = ChainId.ETHEREUM_SEPOLIA;

// 默认 Chain ID
const DEFAULT_CHAIN_ID = getCurrentChainId();

// 备用公共 RPC URLs
const FALLBACK_RPC_URLS = [
  'https://rpc.sepolia.org',
  'https://rpc2.sepolia.org',
  'https://sepolia.drpc.org',
];

// 获取当前网络的 Block Explorer URL
function getBlockExplorerUrl(chainId: number = DEFAULT_CHAIN_ID): string {
  return BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS] || 'https://sepolia.etherscan.io';
}

// 缓存配置
const CACHE_TTL = 30 * 1000; // 30秒缓存
const balanceCache = new Map<string, { balance: string; timestamp: number }>();

// ERC1155 ABI (只包含需要的方法)
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
  'function uri(uint256 id) view returns (string)',
];

// ERC3525 ABI (只包含需要的方法)
const ERC3525_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function balanceOf(uint256 tokenId) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function slotOf(uint256 tokenId) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

// Provider 实例
let walletProvider: ethers.BrowserProvider | null = null;
let fallbackProvider: ethers.JsonRpcProvider | null = null;
let currentFallbackIndex = 0;

/**
 * 设置钱包 Provider (由外部调用，传入 AppKit 的 provider)
 * @param provider - EIP-1193 provider 或 null
 */
export function setWalletProvider(provider: unknown): void {
  if (provider) {
    try {
      walletProvider = new ethers.BrowserProvider(provider as ethers.Eip1193Provider);
      console.log('✅ 已设置钱包 Provider');
    } catch (error) {
      console.error('设置钱包 Provider 失败:', error);
      walletProvider = null;
    }
  } else {
    walletProvider = null;
    console.log('⚠️ 钱包 Provider 已清除');
  }
}

/**
 * 获取备用 Provider
 */
function getFallbackProvider(): ethers.JsonRpcProvider {
  if (!fallbackProvider) {
    fallbackProvider = new ethers.JsonRpcProvider(FALLBACK_RPC_URLS[currentFallbackIndex]);
  }
  return fallbackProvider;
}

/**
 * 切换到下一个备用 RPC
 * @internal 内部使用，供故障转移时调用
 */
function _switchToNextFallbackRpc(): ethers.JsonRpcProvider {
  currentFallbackIndex = (currentFallbackIndex + 1) % FALLBACK_RPC_URLS.length;
  fallbackProvider = new ethers.JsonRpcProvider(FALLBACK_RPC_URLS[currentFallbackIndex]);
  console.log(`🔄 切换到备用 RPC: ${FALLBACK_RPC_URLS[currentFallbackIndex]}`);
  return fallbackProvider;
}

// 导出供测试使用
export { _switchToNextFallbackRpc as switchToNextFallbackRpc };

/**
 * 获取 Provider (优先使用钱包 Provider)
 */
export function getProvider(): ethers.BrowserProvider | ethers.JsonRpcProvider {
  // 优先使用钱包 provider
  if (walletProvider) {
    return walletProvider;
  }

  // 回退到公共 RPC
  return getFallbackProvider();
}

/**
 * 生成缓存键
 */
function getCacheKey(contractAddress: string, tokenId: string, ownerAddress?: string): string {
  return `${contractAddress.toLowerCase()}_${tokenId}_${ownerAddress?.toLowerCase() || 'all'}`;
}

/**
 * 检查缓存是否有效
 */
function getCachedBalance(key: string): string | null {
  const cached = balanceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.balance;
  }
  return null;
}

/**
 * 设置缓存
 */
function setCachedBalance(key: string, balance: string): void {
  balanceCache.set(key, {
    balance,
    timestamp: Date.now(),
  });
}

/**
 * 清除缓存
 */
export function clearBalanceCache(): void {
  balanceCache.clear();
}

/**
 * 查询 ERC1155 余额
 */
export async function getERC1155Balance(
  contractAddress: string,
  ownerAddress: string,
  tokenId: string
): Promise<string> {
  const cacheKey = getCacheKey(contractAddress, tokenId, ownerAddress);
  const cached = getCachedBalance(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const rpcProvider = getProvider();
    const contract = new ethers.Contract(contractAddress, ERC1155_ABI, rpcProvider);
    const balance = await contract.balanceOf(ownerAddress, tokenId);
    const balanceStr = balance.toString();

    setCachedBalance(cacheKey, balanceStr);
    return balanceStr;
  } catch (error) {
    console.error('Error fetching ERC1155 balance:', error);
    throw error;
  }
}

/**
 * 批量查询 ERC1155 余额
 */
export async function getERC1155BatchBalance(
  contractAddress: string,
  ownerAddress: string,
  tokenIds: string[]
): Promise<Record<string, string>> {
  try {
    const rpcProvider = getProvider();
    const contract = new ethers.Contract(contractAddress, ERC1155_ABI, rpcProvider);

    const accounts = tokenIds.map(() => ownerAddress);
    const balances = await contract.balanceOfBatch(accounts, tokenIds);

    const result: Record<string, string> = {};
    tokenIds.forEach((tokenId, index) => {
      const balanceStr = balances[index].toString();
      result[tokenId] = balanceStr;

      // 更新缓存
      const cacheKey = getCacheKey(contractAddress, tokenId, ownerAddress);
      setCachedBalance(cacheKey, balanceStr);
    });

    return result;
  } catch (error) {
    console.error('Error fetching ERC1155 batch balance:', error);
    throw error;
  }
}

/**
 * 查询 ERC3525 Token 的 value（份额）
 */
export async function getERC3525Value(contractAddress: string, tokenId: string): Promise<string> {
  const cacheKey = getCacheKey(contractAddress, tokenId, 'value');
  const cached = getCachedBalance(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const rpcProvider = getProvider();
    const contract = new ethers.Contract(contractAddress, ERC3525_ABI, rpcProvider);

    // ERC3525 的 balanceOf(uint256 tokenId) 返回该 token 的 value
    const value = await contract['balanceOf(uint256)'](tokenId);
    const valueStr = value.toString();

    setCachedBalance(cacheKey, valueStr);
    return valueStr;
  } catch (error) {
    console.error('Error fetching ERC3525 value:', error);
    throw error;
  }
}

/**
 * 查询 ERC3525 Token 的所有者
 */
export async function getERC3525Owner(contractAddress: string, tokenId: string): Promise<string> {
  try {
    const rpcProvider = getProvider();
    const contract = new ethers.Contract(contractAddress, ERC3525_ABI, rpcProvider);
    return await contract.ownerOf(tokenId);
  } catch (error) {
    console.error('Error fetching ERC3525 owner:', error);
    throw error;
  }
}

/**
 * 查询 ERC3525 Token 的 slot
 */
export async function getERC3525Slot(contractAddress: string, tokenId: string): Promise<string> {
  try {
    const rpcProvider = getProvider();
    const contract = new ethers.Contract(contractAddress, ERC3525_ABI, rpcProvider);
    const slot = await contract.slotOf(tokenId);
    return slot.toString();
  } catch (error) {
    console.error('Error fetching ERC3525 slot:', error);
    throw error;
  }
}

/**
 * 查询用户拥有的所有 ERC3525 Token
 * @param contractAddress - 合约地址
 * @param ownerAddress - 持有者地址
 * @returns 用户拥有的所有 ERC3525 token 列表
 */
export async function getERC3525TokensOfOwner(
  contractAddress: string,
  ownerAddress: string
): Promise<OwnedERC3525Token[]> {
  try {
    const rpcProvider = getProvider();
    const contract = new ethers.Contract(contractAddress, ERC3525_ABI, rpcProvider);

    // 1. 获取用户拥有的 token 数量
    const tokenCount = await contract['balanceOf(address)'](ownerAddress);
    const count = Number(tokenCount);

    if (count === 0) {
      return [];
    }

    const tokens: OwnedERC3525Token[] = [];

    // 2. 遍历获取每个 token 的信息
    for (let i = 0; i < count; i++) {
      try {
        const tokenId = await contract.tokenOfOwnerByIndex(ownerAddress, i);
        const slot = await contract.slotOf(tokenId);
        const value = await contract['balanceOf(uint256)'](tokenId);

        tokens.push({
          tokenId: tokenId.toString(),
          slot: slot.toString(),
          value: value.toString(),
          contractAddress,
        });
      } catch (error) {
        console.error(`Error fetching ERC3525 token at index ${i}:`, error);
      }
    }

    return tokens;
  } catch (error) {
    console.error('Error fetching ERC3525 tokens of owner:', error);
    throw error;
  }
}

/**
 * 查询用户拥有的 ERC1155 Token（基于预定义资产列表）
 * 注：ERC1155 无法枚举所有 tokenId，需要提供已知的 tokenId 列表
 */
export async function getERC1155TokensOfOwner(
  contractAddress: string,
  ownerAddress: string,
  knownTokenIds: string[]
): Promise<OwnedERC1155Token[]> {
  try {
    const balances = await getERC1155BatchBalance(contractAddress, ownerAddress, knownTokenIds);

    const tokens: OwnedERC1155Token[] = [];

    for (const tokenId of knownTokenIds) {
      const balance = balances[tokenId];
      if (balance && balance !== '0') {
        tokens.push({
          contractAddress,
          tokenId,
          balance,
        });
      }
    }

    return tokens;
  } catch (error) {
    console.error('Error fetching ERC1155 tokens of owner:', error);
    throw error;
  }
}

/**
 * 批量查询资产余额
 * @param assets - 预定义资产列表
 * @param ownerAddress - 持有者地址 (可选，ERC3525 不需要)
 */
export async function batchGetBalances(
  assets: PredefinedAsset[],
  ownerAddress?: string
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};

  // 按合约地址和类型分组
  const erc1155Assets = assets.filter(a => a.tokenStandard === 'ERC1155');
  const erc3525Assets = assets.filter(a => a.tokenStandard === 'ERC3525');

  // 批量查询 ERC1155 (需要 ownerAddress)
  if (erc1155Assets.length > 0 && ownerAddress) {
    // 按合约地址分组
    const byContract: Record<string, PredefinedAsset[]> = {};
    erc1155Assets.forEach(asset => {
      const addr = asset.contractAddress.toLowerCase();
      if (!byContract[addr]) byContract[addr] = [];
      byContract[addr].push(asset);
    });

    for (const [contractAddr, contractAssets] of Object.entries(byContract)) {
      try {
        const tokenIds = contractAssets.map(a => a.tokenId);
        const balances = await getERC1155BatchBalance(contractAddr, ownerAddress, tokenIds);

        contractAssets.forEach(asset => {
          results[asset.id] = balances[asset.tokenId] || '0';
        });
      } catch (error) {
        console.error(`Error fetching balances for contract ${contractAddr}:`, error);
        contractAssets.forEach(asset => {
          results[asset.id] = null; // 标记为查询失败
        });
      }
    }
  } else if (erc1155Assets.length > 0 && !ownerAddress) {
    // 没有 ownerAddress，标记为需要连接钱包
    erc1155Assets.forEach(asset => {
      results[asset.id] = null;
    });
  }

  // 逐个查询 ERC3525 (不需要 ownerAddress)
  for (const asset of erc3525Assets) {
    try {
      const value = await getERC3525Value(asset.contractAddress, asset.tokenId);
      results[asset.id] = value;
    } catch (error) {
      console.error(`Error fetching ERC3525 value for ${asset.id}:`, error);
      results[asset.id] = null;
    }
  }

  return results;
}

/**
 * 创建 Etherscan URL 生成器
 * @param chainId - 链 ID，默认使用 DEFAULT_CHAIN_ID
 */
export function createEtherscanUrls(chainId: number = DEFAULT_CHAIN_ID): EtherscanUrls {
  const baseUrl = getBlockExplorerUrl(chainId);
  return {
    contract: (contractAddress: string) => `${baseUrl}/token/${contractAddress}`,
    address: (address: string) => `${baseUrl}/address/${address}`,
    tx: (txHash: string) => `${baseUrl}/tx/${txHash}`,
    tokenHolders: (contractAddress: string) => `${baseUrl}/token/${contractAddress}#balances`,
    nft: (contractAddress: string, tokenId: string) =>
      `${baseUrl}/nft/${contractAddress}/${tokenId}`,
  };
}

/**
 * Etherscan URL 生成器 (使用默认链 ID)
 */
export const etherscanUrls: EtherscanUrls = createEtherscanUrls(DEFAULT_CHAIN_ID);

/**
 * 格式化余额显示
 * @param balance - 原始余额
 * @param decimals - 小数位数 (默认0，因为 ERC1155/3525 通常是整数)
 */
export function formatBalance(balance: string | null, decimals = 0): string {
  if (!balance || balance === '0') return '0';

  try {
    const num = BigInt(balance);
    if (decimals === 0) {
      return num.toLocaleString();
    }

    const divisor = BigInt(10 ** decimals);
    const intPart = num / divisor;
    const fracPart = num % divisor;

    if (fracPart === BigInt(0)) {
      return intPart.toLocaleString();
    }

    return `${intPart.toLocaleString()}.${fracPart.toString().padStart(decimals, '0')}`;
  } catch {
    return balance || '0';
  }
}

/**
 * 缩短地址显示
 */
export function shortenAddress(address: string, start = 6, end = 4): string {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export default {
  getProvider,
  getERC1155Balance,
  getERC1155BatchBalance,
  getERC3525Value,
  getERC3525Owner,
  getERC3525Slot,
  getERC3525TokensOfOwner,
  getERC1155TokensOfOwner,
  batchGetBalances,
  clearBalanceCache,
  etherscanUrls,
  createEtherscanUrls,
  formatBalance,
  shortenAddress,
  SEPOLIA_CHAIN_ID,
  DEFAULT_CHAIN_ID,
};
