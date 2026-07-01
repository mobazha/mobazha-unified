/**
 * RWA 资产价格历史 Mock 数据
 * 用于开发和测试阶段
 */

import type { PricePoint, PriceHistory, PriceStats, TimeRange } from '../types/rwa';

/**
 * 生成随机价格波动
 */
function generatePriceVariation(basePrice: number, volatility: number): number {
  const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
  return Math.max(basePrice * 0.5, basePrice + change); // 确保价格不低于基准价的 50%
}

/**
 * 生成 mock 价格历史数据
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param basePrice 基准价格
 * @param volatility 波动率 (0-1)
 * @param trend 趋势 ('up' | 'down' | 'stable')
 */
export function generateMockPriceHistory(
  startDate: Date,
  endDate: Date,
  basePrice: number,
  volatility: number = 0.1,
  trend: 'up' | 'down' | 'stable' = 'stable'
): PricePoint[] {
  const points: PricePoint[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / dayMs);

  // 趋势系数
  const trendFactor = trend === 'up' ? 0.002 : trend === 'down' ? -0.001 : 0;

  let currentPrice = basePrice;

  for (let i = 0; i <= totalDays; i++) {
    const timestamp = startDate.getTime() + i * dayMs;

    // 应用趋势
    currentPrice = currentPrice * (1 + trendFactor);

    // 应用随机波动
    const price = generatePriceVariation(currentPrice, volatility);

    // 随机生成成交量
    const volume = Math.floor(Math.random() * 100 + 10).toString();

    points.push({
      timestamp,
      price: price.toFixed(2),
      volume,
    });

    // 更新当前价格基准
    currentPrice = price;
  }

  return points;
}

/**
 * 计算价格统计数据
 */
export function calculatePriceStats(points: PricePoint[]): PriceStats {
  if (points.length === 0) {
    return {
      lastPrice: '0',
      highPrice: '0',
      lowPrice: '0',
      avgPrice: '0',
      priceChange: '0',
      totalVolume: '0',
    };
  }

  const prices = points.map(p => parseFloat(p.price));
  const volumes = points.map(p => parseFloat(p.volume || '0'));

  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const highPrice = Math.max(...prices);
  const lowPrice = Math.min(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const totalVolume = volumes.reduce((a, b) => a + b, 0);
  const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  return {
    lastPrice: lastPrice.toFixed(2),
    highPrice: highPrice.toFixed(2),
    lowPrice: lowPrice.toFixed(2),
    avgPrice: avgPrice.toFixed(2),
    priceChange: priceChange.toFixed(2),
    totalVolume: totalVolume.toFixed(0),
  };
}

/**
 * 根据时间范围过滤价格数据
 */
export function filterByTimeRange(points: PricePoint[], timeRange: TimeRange): PricePoint[] {
  if (timeRange === 'ALL') {
    return points;
  }

  const now = Date.now();
  let cutoffTime: number;

  switch (timeRange) {
    case '1W':
      cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '1M':
      cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      return points;
  }

  return points.filter(p => p.timestamp >= cutoffTime);
}

// ==================== 预定义资产的 Mock 价格数据 ====================

/**
 * 资产价格配置
 */
interface AssetPriceConfig {
  basePrice: number;
  volatility: number;
  trend: 'up' | 'down' | 'stable';
  currency: string;
}

/**
 * 预定义资产的价格配置
 * key 格式: contractAddress_tokenId 或 contractAddress_slotId (小写)
 */
const assetPriceConfigs: Record<string, AssetPriceConfig> = {
  // ERC1155 - 游戏主播权益 (tokenId: 1)
  '0xc7345ea65fd12cc3cad8f9991cfa46c13c0b1df8_1': {
    basePrice: 50,
    volatility: 0.08,
    trend: 'up',
    currency: 'USDT',
  },
  // ERC1155 - 科技博主权益 (tokenId: 2)
  '0xc7345ea65fd12cc3cad8f9991cfa46c13c0b1df8_2': {
    basePrice: 30,
    volatility: 0.1,
    trend: 'stable',
    currency: 'USDT',
  },
  // ERC3525 - 百老汇 Hamilton 票房份额 (slotId: 1)
  '0xccf9c481a2ddac0ad5a55c3a07c5cd04ca3d343e_slot_1': {
    basePrice: 100,
    volatility: 0.05,
    trend: 'up',
    currency: 'USDT',
  },
  // ERC3525 - 百老汇 Phantom 票房份额 (slotId: 2)
  '0xccf9c481a2ddac0ad5a55c3a07c5cd04ca3d343e_slot_2': {
    basePrice: 80,
    volatility: 0.06,
    trend: 'stable',
    currency: 'USDT',
  },
};

/**
 * 默认价格配置
 */
const defaultPriceConfig: AssetPriceConfig = {
  basePrice: 50,
  volatility: 0.1,
  trend: 'stable',
  currency: 'USDT',
};

/**
 * 获取资产的价格配置
 */
function getAssetPriceConfig(
  contractAddress: string,
  tokenId?: string,
  slotId?: string
): AssetPriceConfig {
  const addr = contractAddress.toLowerCase();

  // 优先使用 slotId (ERC3525)
  if (slotId) {
    const key = `${addr}_slot_${slotId}`;
    if (assetPriceConfigs[key]) {
      return assetPriceConfigs[key];
    }
  }

  // 使用 tokenId (ERC1155/ERC721)
  if (tokenId) {
    const key = `${addr}_${tokenId}`;
    if (assetPriceConfigs[key]) {
      return assetPriceConfigs[key];
    }
  }

  // 只使用合约地址
  if (assetPriceConfigs[addr]) {
    return assetPriceConfigs[addr];
  }

  return defaultPriceConfig;
}

/**
 * 获取 Mock 价格历史
 */
export function getMockPriceHistory(
  contractAddress: string,
  tokenId?: string,
  slotId?: string,
  timeRange: TimeRange = 'ALL'
): PriceHistory {
  const config = getAssetPriceConfig(contractAddress, tokenId, slotId);

  // 生成过去一年的价格数据
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  const allPoints = generateMockPriceHistory(
    startDate,
    endDate,
    config.basePrice,
    config.volatility,
    config.trend
  );

  // 根据时间范围过滤
  const points = filterByTimeRange(allPoints, timeRange);
  const stats = calculatePriceStats(points);

  return {
    contractAddress,
    tokenId,
    slotId,
    points,
    currency: config.currency,
    stats,
  };
}

export default {
  generateMockPriceHistory,
  calculatePriceStats,
  filterByTimeRange,
  getMockPriceHistory,
};
