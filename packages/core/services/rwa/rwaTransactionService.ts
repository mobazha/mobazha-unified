/**
 * RWA 交易历史查询服务
 * 通过 Etherscan API 获取 Token 转账历史
 */

import type { TokenTransfer } from '../../types/rwa';

// Etherscan API 配置
const ETHERSCAN_API_URL = 'https://api-sepolia.etherscan.io/api';
// 注意：生产环境需要使用有效的 API Key
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
export async function getERC20TokenTransfers(
  contractAddress: string,
  address: string,
  apiKey?: string
): Promise<TokenTransfer[]> {
  const cacheKey = getCacheKey('erc20', contractAddress, address);
  const cached = getCachedTransfers(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = new URL(ETHERSCAN_API_URL);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokentx');
    url.searchParams.set('contractaddress', contractAddress);
    url.searchParams.set('address', address);
    url.searchParams.set('sort', 'desc');
    url.searchParams.set('apikey', apiKey || ETHERSCAN_API_KEY);

    const response = await fetch(url.toString());
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
  apiKey?: string
): Promise<TokenTransfer[]> {
  const cacheKey = getCacheKey('erc1155', contractAddress, address);
  const cached = getCachedTransfers(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = new URL(ETHERSCAN_API_URL);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'token1155tx');
    url.searchParams.set('contractaddress', contractAddress);
    url.searchParams.set('address', address);
    url.searchParams.set('sort', 'desc');
    url.searchParams.set('apikey', apiKey || ETHERSCAN_API_KEY);

    const response = await fetch(url.toString());
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
 * 获取 ERC3525 Token 转账历史 (使用 ERC721 接口，因为 ERC3525 继承自 ERC721)
 */
export async function getERC3525TokenTransfers(
  contractAddress: string,
  address: string,
  tokenId?: string,
  apiKey?: string
): Promise<TokenTransfer[]> {
  const cacheKey = getCacheKey('erc3525', contractAddress, `${address}_${tokenId || 'all'}`);
  const cached = getCachedTransfers(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = new URL(ETHERSCAN_API_URL);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokennfttx');
    url.searchParams.set('contractaddress', contractAddress);
    url.searchParams.set('address', address);
    url.searchParams.set('sort', 'desc');
    url.searchParams.set('apikey', apiKey || ETHERSCAN_API_KEY);

    const response = await fetch(url.toString());
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

    setCachedTransfers(cacheKey, transfers);
    return transfers;
  } catch (error) {
    console.error('Error fetching ERC3525 transfers:', error);
    return [];
  }
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? '1 天前' : `${days} 天前`;
  }
  if (hours > 0) {
    return hours === 1 ? '1 小时前' : `${hours} 小时前`;
  }
  if (minutes > 0) {
    return minutes === 1 ? '1 分钟前' : `${minutes} 分钟前`;
  }
  return '刚刚';
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

export default {
  getERC20TokenTransfers,
  getERC1155TokenTransfers,
  getERC3525TokenTransfers,
  clearTransferCache,
  formatRelativeTime,
  formatTimestamp,
};
