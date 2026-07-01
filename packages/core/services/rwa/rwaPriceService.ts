/**
 * RWA 资产价格历史服务
 * 支持 Mock 数据和链上真实数据
 */

import type { PriceHistory, PricePoint, TimeRange } from '../../types/rwa';
import {
  getMockPriceHistory,
  calculatePriceStats,
  filterByTimeRange,
} from '../../data/rwaPriceMockData';
import { SEPOLIA_CONFIG } from '../../types/rwa';

// ==================== 配置 ====================

/**
 * 是否使用 Mock 数据
 * 生产环境应设为 false
 */
export const USE_MOCK_PRICE_DATA = true;

/**
 * Etherscan API 配置
 */
const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = 11155111; // Sepolia
// Community builds never ship provider credentials. Route real requests through
// an operator-controlled backend before disabling mock price data.
const ETHERSCAN_API_KEY = '';

/**
 * SwapExecuted 事件签名
 * event SwapExecuted(uint256 indexed orderId, address indexed seller, address indexed buyer, uint256 amount, uint256 price, uint256 platformFeeAmount)
 * TODO: 在真实数据模式下使用此常量过滤事件
 */
// const SWAP_EXECUTED_TOPIC = '0x7b7e1c3e4a7e5d1d6b4a8f3e2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b';

// ==================== 缓存 ====================

const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存
const priceCache = new Map<string, { data: PriceHistory; timestamp: number }>();

/**
 * 生成缓存键
 */
function getCacheKey(
  contractAddress: string,
  tokenId?: string,
  slotId?: string,
  timeRange?: TimeRange
): string {
  return `${contractAddress.toLowerCase()}_${tokenId || ''}_${slotId || ''}_${timeRange || 'ALL'}`;
}

/**
 * 获取缓存数据
 */
function getCachedData(key: string): PriceHistory | null {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * 设置缓存
 */
function setCachedData(key: string, data: PriceHistory): void {
  priceCache.set(key, { data, timestamp: Date.now() });
}

/**
 * 清除价格缓存
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

// ==================== 链上数据获取 ====================

/**
 * 构建 Etherscan API URL
 */
function buildApiUrl(params: Record<string, string>): string {
  const url = new URL(ETHERSCAN_API_URL);
  url.searchParams.set('chainid', CHAIN_ID.toString());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });
  url.searchParams.set('apikey', ETHERSCAN_API_KEY);
  return url.toString();
}

/**
 * 从链上获取 SwapExecuted 事件
 * 解析出价格历史数据
 */
async function fetchOnChainPriceHistory(
  _contractAddress: string,
  _tokenId?: string,
  _slotId?: string
): Promise<PricePoint[]> {
  try {
    const universalSwapAddress = SEPOLIA_CONFIG.universalSwapAddress;

    // 查询 SwapExecuted 事件日志
    const url = buildApiUrl({
      module: 'logs',
      action: 'getLogs',
      address: universalSwapAddress,
      fromBlock: '0',
      toBlock: 'latest',
    });

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      console.warn('Failed to fetch swap events:', data.message);
      return [];
    }

    const points: PricePoint[] = [];

    for (const log of data.result) {
      try {
        // 解析事件数据
        // 注意：实际的事件解析需要根据合约 ABI 来实现
        // 这里是简化的示例

        // 从日志数据中提取价格和时间戳
        const timestamp = parseInt(log.timeStamp, 16) * 1000;
        const logData = log.data;

        // 解析 data 字段 (包含 amount, price, platformFeeAmount)
        // data 是打包的 uint256 数组
        if (logData && logData.length >= 130) {
          // 0x + 64 chars (amount) + 64 chars (price)
          const priceHex = '0x' + logData.slice(66, 130);
          const price = BigInt(priceHex);

          // 转换为 USDT 格式 (6 位小数)
          const priceInUsdt = Number(price) / 1e6;

          // TODO: 需要过滤特定 tokenContract 和 tokenId 的交易
          // 这需要从订单映射中获取订单详情

          points.push({
            timestamp,
            price: priceInUsdt.toFixed(2),
            txHash: log.transactionHash,
          });
        }
      } catch (parseError) {
        console.warn('Error parsing swap event:', parseError);
      }
    }

    // 按时间排序
    points.sort((a, b) => a.timestamp - b.timestamp);

    return points;
  } catch (error) {
    console.error('Error fetching on-chain price history:', error);
    return [];
  }
}

// ==================== 主要 API ====================

/**
 * 获取资产价格历史
 * @param contractAddress 合约地址
 * @param tokenId Token ID (ERC1155/ERC721)
 * @param slotId Slot ID (ERC3525)
 * @param timeRange 时间范围
 * @returns 价格历史数据
 */
export async function getPriceHistory(
  contractAddress: string,
  tokenId?: string,
  slotId?: string,
  timeRange: TimeRange = 'ALL'
): Promise<PriceHistory> {
  // 检查缓存
  const cacheKey = getCacheKey(contractAddress, tokenId, slotId, timeRange);
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  let result: PriceHistory;

  if (USE_MOCK_PRICE_DATA) {
    // 使用 Mock 数据
    result = getMockPriceHistory(contractAddress, tokenId, slotId, timeRange);
  } else {
    // 从链上获取真实数据
    const allPoints = await fetchOnChainPriceHistory(contractAddress, tokenId, slotId);
    const points = filterByTimeRange(allPoints, timeRange);
    const stats = calculatePriceStats(points);

    result = {
      contractAddress,
      tokenId,
      slotId,
      points,
      currency: 'USDT',
      stats,
    };
  }

  // 缓存结果
  setCachedData(cacheKey, result);

  return result;
}

/**
 * 获取最新价格
 */
export async function getLatestPrice(
  contractAddress: string,
  tokenId?: string,
  slotId?: string
): Promise<string | null> {
  const history = await getPriceHistory(contractAddress, tokenId, slotId, '1W');

  if (history.points.length === 0) {
    return null;
  }

  return history.points[history.points.length - 1].price;
}

/**
 * 获取价格变化百分比
 */
export async function getPriceChange(
  contractAddress: string,
  tokenId?: string,
  slotId?: string,
  timeRange: TimeRange = '1W'
): Promise<string | null> {
  const history = await getPriceHistory(contractAddress, tokenId, slotId, timeRange);

  if (!history.stats) {
    return null;
  }

  return history.stats.priceChange;
}

/**
 * 格式化 RWA 价格显示
 */
export function formatRwaPrice(price: string | number, currency: string = 'USDT'): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `${numPrice.toFixed(2)} ${currency}`;
}

/**
 * 格式化价格变化显示
 */
export function formatPriceChange(change: string | number): string {
  const numChange = typeof change === 'string' ? parseFloat(change) : change;
  const sign = numChange >= 0 ? '+' : '';
  return `${sign}${numChange.toFixed(2)}%`;
}

export default {
  getPriceHistory,
  getLatestPrice,
  getPriceChange,
  clearPriceCache,
  formatRwaPrice,
  formatPriceChange,
  USE_MOCK_PRICE_DATA,
};
