/**
 * RWA 交易历史查询服务
 * 通过 Etherscan V2 API 获取 Token 转账历史
 */

import type { TokenTransfer } from '../../types/rwa';
import { getERC3525Slot, getERC3525Value } from './rwaBalanceService';

// Etherscan V2 API 配置 (统一端点，通过 chainid 区分网络)
const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = 11155111; // Sepolia
// Etherscan API Key (V2 API 必需)
const ETHERSCAN_API_KEY = '';

// 缓存配置
const CACHE_TTL = 60 * 1000; // 60秒缓存
const transferCache = new Map<string, { transfers: TokenTransfer[]; timestamp: number }>();

/**
 * 生成缓存键
 */
function getCacheKey(type: string, contractAddress: string, address: string): string {
  return `${type}_${contractAddress.toLowerCase()}_${address.toLowerCase()}`;
}

/**
 * 获取缓存的转账记录
 */
function getCachedTransfers(key: string): TokenTransfer[] | null {
  const cached = transferCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.transfers;
  }
  return null;
}

/**
 * 设置缓存
 */
function setCachedTransfers(key: string, transfers: TokenTransfer[]): void {
  transferCache.set(key, {
    transfers,
    timestamp: Date.now(),
  });
}

/**
 * 清除缓存
 */
export function clearTransferCache(): void {
  transferCache.clear();
}

/**
 * 获取 ERC20 Token 转账历史
 */
/**
 * 构建 Etherscan V2 API URL
 */
function buildApiUrl(params: Record<string, string>): string {
  const url = new URL(ETHERSCAN_API_URL);
  // V2 API 必须指定 chainid
  url.searchParams.set('chainid', CHAIN_ID.toString());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });
  // V2 API 必须有 API Key
  url.searchParams.set('apikey', ETHERSCAN_API_KEY);
  return url.toString();
}

/**
 * 延迟函数 (避免 API 速率限制)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getERC20TokenTransfers(
  contractAddress: string,
  address: string,
  _apiKey?: string
): Promise<TokenTransfer[]> {
  const cacheKey = getCacheKey('erc20', contractAddress, address);
  const cached = getCachedTransfers(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = buildApiUrl({
      module: 'account',
      action: 'tokentx',
      contractaddress: contractAddress,
      address: address,
      sort: 'desc',
    });

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    const transfers: TokenTransfer[] = data.result.map(
      (tx: {
        hash: string;
        from: string;
        to: string;
        value: string;
        timeStamp: string;
        blockNumber: string;
      }) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp, 10) * 1000,
        blockNumber: parseInt(tx.blockNumber, 10),
        type: tx.to.toLowerCase() === address.toLowerCase() ? 'in' : 'out',
      })
    );

    setCachedTransfers(cacheKey, transfers);
    return transfers;
  } catch (error) {
    console.error('Error fetching ERC20 transfers:', error);
    return [];
  }
}

/**
 * 获取 ERC1155 Token 转账历史
 */
export async function getERC1155TokenTransfers(
  contractAddress: string,
  address: string,
  _apiKey?: string
): Promise<TokenTransfer[]> {
  const cacheKey = getCacheKey('erc1155', contractAddress, address);
  const cached = getCachedTransfers(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = buildApiUrl({
      module: 'account',
      action: 'token1155tx',
      contractaddress: contractAddress,
      address: address,
      sort: 'desc',
    });

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    const transfers: TokenTransfer[] = data.result.map(
      (tx: {
        hash: string;
        from: string;
        to: string;
        tokenID: string;
        tokenValue: string;
        timeStamp: string;
        blockNumber: string;
      }) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        tokenId: tx.tokenID,
        value: tx.tokenValue,
        timestamp: parseInt(tx.timeStamp, 10) * 1000,
        blockNumber: parseInt(tx.blockNumber, 10),
        type: tx.to.toLowerCase() === address.toLowerCase() ? 'in' : 'out',
      })
    );

    setCachedTransfers(cacheKey, transfers);
    return transfers;
  } catch (error) {
    console.error('Error fetching ERC1155 transfers:', error);
    return [];
  }
}

/**
 * 为 ERC3525 交易添加 slot 和 value 信息
 */
async function enrichERC3525WithSlots(
  transfers: TokenTransfer[],
  contractAddress: string
): Promise<void> {
  const tokenIds = [...new Set(transfers.map(tx => tx.tokenId).filter(Boolean))] as string[];

  if (tokenIds.length === 0) return;

  const tokenInfoMap = new Map<string, { slot: string; value: string }>();

  for (const tokenId of tokenIds) {
    try {
      const slot = await getERC3525Slot(contractAddress, tokenId);
      let value = '1';
      try {
        value = await getERC3525Value(contractAddress, tokenId);
      } catch {
        // token value 获取失败，使用默认值
      }
      tokenInfoMap.set(tokenId, { slot, value });
    } catch {
      // 可能是 token 已被销毁，忽略错误
    }
  }

  for (const tx of transfers) {
    if (tx.tokenId && tokenInfoMap.has(tx.tokenId)) {
      const info = tokenInfoMap.get(tx.tokenId)!;
      tx.slotId = info.slot;
      // 对于铸造交易（from 为零地址），使用当前 value
      if (tx.from === '0x0000000000000000000000000000000000000000') {
        tx.value = info.value;
      }
    }
  }
}

/**
 * 获取 ERC3525 Token 转账历史 (使用 ERC721 接口，因为 ERC3525 继承自 ERC721)
 */
export async function getERC3525TokenTransfers(
  contractAddress: string,
  address: string,
  tokenId?: string,
  _apiKey?: string
): Promise<TokenTransfer[]> {
  const cacheKey = getCacheKey('erc3525', contractAddress, `${address}_${tokenId || 'all'}`);
  const cached = getCachedTransfers(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = buildApiUrl({
      module: 'account',
      action: 'tokennfttx',
      contractaddress: contractAddress,
      address: address,
      sort: 'desc',
    });

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    let transfers: TokenTransfer[] = data.result.map(
      (tx: {
        hash: string;
        from: string;
        to: string;
        tokenID: string;
        timeStamp: string;
        blockNumber: string;
      }) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        tokenId: tx.tokenID,
        timestamp: parseInt(tx.timeStamp, 10) * 1000,
        blockNumber: parseInt(tx.blockNumber, 10),
        type: tx.to.toLowerCase() === address.toLowerCase() ? 'in' : 'out',
      })
    );

    // 如果指定了 tokenId，则过滤
    if (tokenId) {
      transfers = transfers.filter(t => t.tokenId === tokenId);
    }

    // 为 ERC3525 交易添加 slot 和 value 信息
    await enrichERC3525WithSlots(transfers, contractAddress);

    setCachedTransfers(cacheKey, transfers);
    return transfers;
  } catch (error) {
    console.error('Error fetching ERC3525 transfers:', error);
    return [];
  }
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 资产接口（用于交易历史查询）
 */
interface AssetLike {
  contractAddress: string;
  tokenStandard: string;
}

/**
 * 获取用户的所有 RWA 资产交易历史
 * @param userAddress 用户地址
 * @param assets 资产列表 [{contractAddress, tokenStandard}]
 * @returns 合并后的交易列表（按时间排序）
 */
export async function getUserTransactionHistory(
  userAddress: string,
  assets: AssetLike[]
): Promise<TokenTransfer[]> {
  if (!userAddress || !assets || assets.length === 0) {
    return [];
  }

  const allTransactions: TokenTransfer[] = [];

  // 按合约地址去重
  const uniqueContracts = new Map<string, string>();
  assets.forEach(asset => {
    if (!asset.contractAddress) return;
    const key = asset.contractAddress.toLowerCase();
    if (!uniqueContracts.has(key)) {
      uniqueContracts.set(key, asset.tokenStandard);
    }
  });

  // 串行获取每个合约的交易（避免速率限制）
  for (const [contractAddress, tokenStandard] of uniqueContracts.entries()) {
    try {
      let transfers: TokenTransfer[];
      if (tokenStandard === 'ERC1155') {
        transfers = await getERC1155TokenTransfers(contractAddress, userAddress);
      } else if (tokenStandard === 'ERC3525' || tokenStandard === 'ERC721') {
        transfers = await getERC3525TokenTransfers(contractAddress, userAddress);
      } else {
        continue;
      }

      // 添加 contractAddress 到每个交易
      transfers.forEach(tx => {
        tx.contractAddress = contractAddress;
      });

      allTransactions.push(...transfers);

      // 添加延迟避免 Etherscan API 速率限制
      await delay(250);
    } catch (error) {
      console.error(`Error fetching transfers for ${contractAddress}:`, error);
    }
  }

  // 按时间降序排序
  allTransactions.sort((a, b) => b.timestamp - a.timestamp);

  return allTransactions;
}

export default {
  getERC20TokenTransfers,
  getERC1155TokenTransfers,
  getERC3525TokenTransfers,
  getUserTransactionHistory,
  clearTransferCache,
  formatTimestamp,
};
