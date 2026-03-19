/**
 * 货币系统类型定义
 */

/**
 * 货币类型 - 法币或加密货币
 */
export type CurrencyKind = 'fiat' | 'crypto';

/**
 * 货币信息
 */
export interface CurrencyInfo {
  /** 货币代码 (USD, BTC, ETH) */
  code: string;
  /** 显示符号 ($, ₿, Ξ) */
  symbol: string;
  /** 原生符号 */
  symbolNative: string;
  /** 名称 */
  name: string;
  /** 复数名称 */
  namePlural: string;
  /** 小数位数 (2 for USD, 8 for BTC, 18 for ETH) */
  decimals: number;
  /** 四舍五入精度 */
  rounding: number;
  /** 货币类型 */
  type: CurrencyKind;
}

/**
 * 汇率数据
 * key 为货币代码，value 为相对于基准货币的汇率
 * 基准货币为 USD（EXR-1a 迁移后）
 */
export type ExchangeRates = Record<string, number>;

/**
 * 汇率数据详情（完整格式，来自后端 CoinGecko Provider）
 */
export interface ExchangeRateDetail {
  /** 询价 */
  ask?: number;
  /** 出价 */
  bid?: number;
  /** 最新价 */
  last: number;
  /** 类型 */
  type?: 'fiat' | 'crypto';
}

/**
 * 完整汇率数据映射
 */
export type ExchangeRatesDetailed = Record<string, ExchangeRateDetail>;

/**
 * 带货币定义的价格
 */
export interface CurrencyPrice {
  /** 金额 (最小单位) */
  amount: number | string;
  /** 货币信息 */
  currency: {
    code: string;
    divisibility: number;
  };
}

/**
 * 价格格式化选项
 */
export interface FormatPriceOptions {
  /** 区域设置 (如 'en-US', 'zh-CN') */
  locale?: string;
  /** 最小小数位数 */
  minDecimals?: number;
  /** 最大小数位数 */
  maxDecimals?: number;
  /** 是否显示货币符号 */
  showSymbol?: boolean;
  /** 是否显示货币代码 */
  showCode?: boolean;
  /** 当结果为零时是否扩展小数位 */
  extendDecimalsOnZero?: boolean;
  /** 是否使用紧凑格式 (1K, 1M) */
  compact?: boolean;
}

/**
 * 货币转换选项
 */
export interface ConvertCurrencyOptions {
  /** 源货币精度 (不提供则自动获取) */
  fromDivisibility?: number;
  /** 目标货币精度 (不提供则自动获取) */
  toDivisibility?: number;
}

/**
 * 货币状态
 */
export interface CurrencyState {
  /** 汇率数据 */
  rates: ExchangeRates;
  /** 上次获取时间戳 */
  lastFetched: number | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 用户偏好的本地货币 */
  localCurrency: string;
}

/**
 * 货币 Store Actions
 */
export interface CurrencyActions {
  /** 获取汇率数据 */
  fetchRates: () => Promise<void>;
  /** 设置本地货币 */
  setLocalCurrency: (currency: string) => void;
  /** 重置状态 */
  reset: () => void;
}

/**
 * 完整货币 Store 类型
 */
export type CurrencyStore = CurrencyState & CurrencyActions;

/**
 * 常用货币代码列表
 */
export const POPULAR_FIAT_CURRENCIES = [
  'USD',
  'EUR',
  'CNY',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'HKD',
  'SGD',
  'KRW',
  'INR',
  'BRL',
  'MXN',
  'RUB',
  'ZAR',
  'TRY',
  'THB',
  'TWD',
  'VND',
] as const;

/**
 * 支持的加密货币代码
 */
export const SUPPORTED_CRYPTO_CURRENCIES = [
  'BTC',
  'ETH',
  'BCH',
  'LTC',
  'ZEC',
  'USDT',
  'USDC',
  'MATICUSDT',
  'MATICUSDC',
  'MATICMBZ',
  'CFX',
] as const;

/**
 * 默认本地货币
 */
export const DEFAULT_LOCAL_CURRENCY = 'USD';

/**
 * 汇率刷新间隔 (毫秒)
 */
export const EXCHANGE_RATE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
