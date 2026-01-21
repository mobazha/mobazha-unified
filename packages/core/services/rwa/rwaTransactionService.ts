/**
 * RWA 交易历史查询服务
 * 通过 Etherscan V2 API 获取 Token 转账历史
 */

import type { TokenTransfer, ValueSource } from '../../types/rwa';
import { getERC3525Slot, getERC3525Value } from './rwaBalanceService';

// Etherscan V2 API 配置 (统一端点，通过 chainid 区分网络)
const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = 11155111; // Sepolia
// Etherscan API Key (V2 API 必需)
const ETHERSCAN_API_KEY = '';

// 缓存配置
const CACHE_TTL = 180 * 1000; // 180秒（3分钟）缓存，减少重复 API 调用
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

/**
 * 带指数退避重试的请求包装器
 * @param fn - 要执行的异步函数
 * @param maxRetries - 最大重试次数
 * @param baseDelay - 基础延迟时间 (ms)
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 100): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // 检查是否是速率限制错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRateLimit =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('429') ||
        (error as { status?: number })?.status === 429;
      if (isRateLimit && i < maxRetries - 1) {
        // 指数退避：100ms, 200ms, 400ms...
        const delayMs = baseDelay * Math.pow(2, i);
        console.log(`[TxService] Rate limited, retrying in ${delayMs}ms...`);
        await delay(delayMs);
      } else if (i < maxRetries - 1) {
        // 其他错误，短暂延迟后重试
        await delay(baseDelay);
      }
    }
  }
  throw lastError;
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
 * 获取用户发起的与 RWA 合约相关的交易 (通过市场合约购买/铸造)
 * @param userAddress 用户地址
 * @param rwaContractAddresses RWA 合约地址列表
 * @returns 交易列表
 */
export async function getUserInitiatedRwaTransactions(
  userAddress: string,
  rwaContractAddresses: string[]
): Promise<TokenTransfer[]> {
  if (!userAddress || !rwaContractAddresses || rwaContractAddresses.length === 0) {
    return [];
  }

  const cacheKey = getCacheKey('user_initiated', userAddress, 'all');
  const cached = getCachedTransfers(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = buildApiUrl({
      module: 'account',
      action: 'txlist',
      address: userAddress,
      page: '1',
      offset: '100',
      sort: 'desc',
    });

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    // 已知的市场/托管合约地址
    const marketContracts = ['0x1e7b873501bf3bac31e6e95f8d46cfcad44aac33'];

    const rwaAddressSet = new Set(rwaContractAddresses.map(a => a.toLowerCase()));
    const marketAddressSet = new Set(marketContracts);

    const relevantTxs = data.result.filter((tx: { to?: string }) => {
      const toAddress = tx.to?.toLowerCase();
      return rwaAddressSet.has(toAddress || '') || marketAddressSet.has(toAddress || '');
    });

    if (relevantTxs.length === 0) {
      setCachedTransfers(cacheKey, []);
      return [];
    }

    const transactions: TokenTransfer[] = [];

    for (const tx of relevantTxs) {
      const txTimestamp = parseInt(tx.timeStamp as string, 10) * 1000;
      const tokenTransfers = await parseTransactionLogs(
        tx.hash as string,
        rwaContractAddresses,
        userAddress,
        txTimestamp
      );
      transactions.push(...tokenTransfers);
      await delay(200);
    }

    setCachedTransfers(cacheKey, transactions);
    return transactions;
  } catch (error) {
    console.error('Error fetching user initiated transactions:', error);
    return [];
  }
}

/**
 * 解析交易日志，提取 ERC3525 Transfer 事件
 */
async function parseTransactionLogs(
  txHash: string,
  rwaContractAddresses: string[],
  userAddress: string,
  txTimestamp: number
): Promise<TokenTransfer[]> {
  try {
    const url = buildApiUrl({
      module: 'proxy',
      action: 'eth_getTransactionReceipt',
      txhash: txHash,
    });

    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !data.result.logs) {
      return [];
    }

    const rwaAddressSet = new Set(rwaContractAddresses.map(a => a.toLowerCase()));
    const transfers: TokenTransfer[] = [];

    const transferEventSig = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const transferValueEventSig =
      '0x0b2aac84f3ec956911fd78eae5311062972ff949f38412e8da39069d9f068cc6';
    const slotChangedEventSig =
      '0xe4f48c240d3b994948aa54f3e2f5fca59263dfe1d52b6e4cf39a5d249b5ccb65';

    const receipt = data.result;
    const blockNumber = parseInt(receipt.blockNumber, 16);

    // 收集 SlotChanged 事件
    const slotMap = new Map<string, string>();
    for (const log of receipt.logs) {
      if (log.topics[0] === slotChangedEventSig && rwaAddressSet.has(log.address.toLowerCase())) {
        const tokenId = parseInt(log.topics[1], 16).toString();
        const newSlot = parseInt(log.topics[3], 16).toString();
        slotMap.set(tokenId, newSlot);
      }
    }

    // 收集 TransferValue 事件
    const valueMap = new Map<string, { totalValue: bigint; sources: ValueSource[] }>();
    for (const log of receipt.logs) {
      if (log.topics[0] === transferValueEventSig && rwaAddressSet.has(log.address.toLowerCase())) {
        const fromTokenId = parseInt(log.topics[1], 16).toString();
        const toTokenId = parseInt(log.topics[2], 16).toString();
        const value = parseInt(log.data, 16);

        if (value > 0) {
          const existing = valueMap.get(toTokenId) || { totalValue: BigInt(0), sources: [] };
          existing.totalValue += BigInt(value);
          existing.sources.push({ fromTokenId, value: value.toString() });
          valueMap.set(toTokenId, existing);
        }
      }
    }

    // 处理 Transfer 事件
    for (const log of receipt.logs) {
      if (log.topics[0] !== transferEventSig) continue;
      if (!rwaAddressSet.has(log.address.toLowerCase())) continue;
      if (log.topics.length < 4) continue;

      const from = '0x' + log.topics[1].slice(26);
      const to = '0x' + log.topics[2].slice(26);
      const tokenId = parseInt(log.topics[3], 16).toString();

      let type: 'in' | 'out' = 'in';
      if (from === '0x0000000000000000000000000000000000000000') {
        type = 'in'; // mint
      } else if (to === '0x0000000000000000000000000000000000000000') {
        type = 'out'; // burn
      }

      const slotId = slotMap.get(tokenId);
      const valueInfo = valueMap.get(tokenId);
      const tokenValue = valueInfo?.totalValue?.toString() || '1';
      const valueSources = valueInfo?.sources || [];

      transfers.push({
        hash: txHash,
        blockNumber,
        timestamp: txTimestamp || Date.now(),
        from,
        to,
        tokenId,
        value: tokenValue,
        type,
        contractAddress: log.address,
        slotId,
        valueSources,
        initiatedBy: userAddress,
      });
    }

    return transfers;
  } catch (error) {
    console.error('Error parsing transaction logs:', error);
    return [];
  }
}

/**
 * 获取用户的所有 RWA 资产交易历史
 * 优化版本：并行查询多个合约，使用指数退避重试
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

  // 按合约地址去重
  const uniqueContracts = new Map<string, string>();
  assets.forEach(asset => {
    if (!asset.contractAddress) return;
    const key = asset.contractAddress.toLowerCase();
    if (!uniqueContracts.has(key)) {
      uniqueContracts.set(key, asset.tokenStandard);
    }
  });

  const contractEntries = [...uniqueContracts.entries()];
  const rwaContractAddresses = [...uniqueContracts.keys()];

  // 并行执行：合约交易查询 + 用户发起交易查询
  const [contractResults, userInitiatedTxs] = await Promise.all([
    // 1. 并行获取每个合约的交易历史
    Promise.all(
      contractEntries.map(async ([contractAddress, tokenStandard]) => {
        try {
          let transfers: TokenTransfer[];
          if (tokenStandard === 'ERC1155') {
            transfers = await withRetry(() =>
              getERC1155TokenTransfers(contractAddress, userAddress)
            );
          } else if (tokenStandard === 'ERC3525' || tokenStandard === 'ERC721') {
            transfers = await withRetry(() =>
              getERC3525TokenTransfers(contractAddress, userAddress)
            );
          } else {
            return [];
          }

          // 添加 contractAddress 到每个交易
          transfers.forEach(tx => {
            tx.contractAddress = contractAddress;
          });

          return transfers;
        } catch (error) {
          console.error(`Error fetching transfers for ${contractAddress}:`, error);
          return [];
        }
      })
    ),
    // 2. 获取用户发起的交易
    getUserInitiatedRwaTransactions(userAddress, rwaContractAddresses).catch(error => {
      console.error('Error fetching user initiated transactions:', error);
      return [] as TokenTransfer[];
    }),
  ]);

  // 合并所有合约的交易
  const allTransactions = contractResults.flat();

  // 合并用户发起的交易，去重
  const existingKeys = new Set(allTransactions.map(tx => `${tx.hash}_${tx.tokenId}`));
  for (const tx of userInitiatedTxs) {
    const key = `${tx.hash}_${tx.tokenId}`;
    if (!existingKeys.has(key)) {
      allTransactions.push(tx);
      existingKeys.add(key);
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
  getUserInitiatedRwaTransactions,
  clearTransferCache,
  formatTimestamp,
};
