/**
 * 货币服务
 * 提供汇率获取、货币转换、价格格式化等功能
 */

import BigNumber from 'bignumber.js';
import type { ExchangeRates, FormatPriceOptions, ConvertCurrencyOptions } from '../types/currency';
import {
  getCurrencyByCode,
  getCurrencySymbol,
  getCurrencyDecimals,
  isCryptoCurrency,
  getBaseRateSymbol,
} from '../data/currencies';
import {
  formatStandardCryptoAmount,
  getPaymentCoinDisplayLabel,
  isFiatPaymentCoin,
} from '../data/tokens';
import { getExchangeRates as fetchExchangeRatesApi } from './api/wallet';
import { isSovereignMode } from '../config/env';

// BigNumber 配置
BigNumber.config({
  DECIMAL_PLACES: 20,
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
});

/**
 * 缓存的汇率数据
 */
let cachedRates: ExchangeRates = {};
let lastFetchTime: number | null = null;

/**
 * 汇率缓存时间 (毫秒)
 */
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * 汇率获取错误
 */
export class NoExchangeRateDataError extends Error {
  constructor(message?: string) {
    super(message || 'Missing exchange rate data');
    this.name = 'NoExchangeRateDataError';
  }
}

/**
 * 无效货币错误
 */
export class UnrecognizedCurrencyError extends Error {
  constructor(message?: string) {
    super(message || 'The currency is not recognized');
    this.name = 'UnrecognizedCurrencyError';
  }
}

/**
 * 获取上次成功获取汇率的时间戳（毫秒），null 表示尚未获取
 */
export function getLastFetchTime(): number | null {
  return lastFetchTime;
}

/**
 * 获取汇率数据
 * @param forceRefresh 是否强制刷新
 */
export async function fetchExchangeRates(forceRefresh = false): Promise<ExchangeRates> {
  const now = Date.now();

  // Sovereign mode is fully crypto-native — listings are priced natively in
  // XMR with no fiat conversion layer. Skip the external exchange
  // rate fetch entirely to preserve the zero-outbound guarantee. Returning
  // an empty rate map signals to callers that no fiat ≈ display should
  // be rendered.
  if (isSovereignMode()) {
    cachedRates = {};
    lastFetchTime = now;
    return cachedRates;
  }

  // 检查缓存
  if (!forceRefresh && lastFetchTime && now - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const rawRates = await fetchExchangeRatesApi();

    // API 返回格式 (USD 基准 flat map, string 值):
    //   { "BTC": "1538", "USD": "100", "ETH": "555555555555555", ... }
    // 值的含义: 1 USD = X 最小单位的目标货币
    // 解析为标准单位后 USD = 1.0，其他货币为相对 USD 的比率
    const rates: ExchangeRates = {};

    for (const [currency, rateValue] of Object.entries(rawRates)) {
      const currencyCode = currency.toUpperCase();
      const numValue =
        typeof rateValue === 'string'
          ? parseFloat(rateValue)
          : typeof rateValue === 'number'
            ? rateValue
            : 0;

      if (numValue > 0) {
        const decimals = getCurrencyDecimals(currencyCode);
        rates[currencyCode] = numValue / Math.pow(10, decimals);
      }
    }

    addTokenRateMappings(rates);

    cachedRates = rates;
    lastFetchTime = now;

    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    if (Object.keys(cachedRates).length > 0) {
      return cachedRates;
    }
    return {};
  }
}

/**
 * 为链上代币添加汇率映射
 */
function addTokenRateMappings(rates: ExchangeRates): void {
  const mappings: Record<string, string> = {
    MATICUSDT: 'USDT',
    MATICUSDC: 'USDC',
    ARBUSDT: 'USDT',
    ARBUSDC: 'USDC',
    ETHUSDT: 'USDT',
    ETHUSDC: 'USDC',
  };

  for (const [token, baseSymbol] of Object.entries(mappings)) {
    if (rates[baseSymbol] && !rates[token]) {
      rates[token] = rates[baseSymbol];
    }
  }
}

/**
 * 获取缓存的汇率数据
 */
export function getCachedRates(): ExchangeRates {
  return { ...cachedRates };
}

/**
 * 设置汇率数据 (用于测试或外部设置)
 */
export function setRates(rates: ExchangeRates): void {
  cachedRates = { ...rates };
  lastFetchTime = Date.now();
}

/**
 * 获取单个货币的汇率
 */
export function getExchangeRate(currency: string): number | undefined {
  const normalizedCode = getBaseRateSymbol(currency.toUpperCase());
  return cachedRates[normalizedCode];
}

/**
 * 转换货币金额
 * @param amount 金额 (标准单位，非最小单位)
 * @param fromCur 源货币代码
 * @param toCur 目标货币代码
 * @param options 转换选项
 */
export function convertCurrency(
  amount: number | string | BigNumber,
  fromCur: string,
  toCur: string,
  options: ConvertCurrencyOptions = {}
): number {
  const bigAmount = new BigNumber(amount);

  if (bigAmount.isNaN()) {
    console.error('Invalid amount for currency conversion:', amount);
    return 0;
  }

  // 规范化货币代码
  const fromCurCode = getBaseRateSymbol(fromCur.toUpperCase());
  const toCurCode = getBaseRateSymbol(toCur.toUpperCase());

  // 相同货币不需要转换
  if (fromCurCode === toCurCode) {
    return bigAmount.toNumber();
  }

  const fromRate = cachedRates[fromCurCode];
  const toRate = cachedRates[toCurCode];

  if (fromRate === undefined) {
    console.warn(`No exchange rate data for ${fromCur}`);
    return bigAmount.toNumber();
  }

  if (toRate === undefined) {
    console.warn(`No exchange rate data for ${toCur}`);
    return bigAmount.toNumber();
  }

  // 获取目标货币精度
  const toDiv = options.toDivisibility ?? getCurrencyDecimals(toCurCode);

  // 转换公式: amount * (toRate / fromRate)
  // 注意：这里假设 amount 已经是标准单位
  const result = bigAmount.times(toRate / fromRate).decimalPlaces(toDiv, BigNumber.ROUND_HALF_UP);

  return result.toNumber();
}

/**
 * 将最小单位转换为标准单位
 * @param amount 最小单位金额 (如 satoshi, wei, cents)
 * @param currency 货币代码
 */
export function fromMinimalUnit(amount: number | string, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  const bigAmount = new BigNumber(amount);
  return bigAmount.dividedBy(new BigNumber(10).pow(decimals)).toNumber();
}

/**
 * 将标准单位转换为最小单位
 * @param amount 标准单位金额
 * @param currency 货币代码
 */
export function toMinimalUnit(amount: number | string, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  const bigAmount = new BigNumber(amount);
  return bigAmount.times(new BigNumber(10).pow(decimals)).integerValue().toNumber();
}

/**
 * 获取智能小数位数
 * 当金额太小时，自动增加小数位以显示有效数字
 */
function getSmartDecimals(amount: number, desiredDecimals: number, maxDecimals = 20): number {
  if (amount === 0) return desiredDecimals;

  const absAmount = Math.abs(amount);
  let decimals = desiredDecimals;

  // 如果按当前精度格式化后为 0，增加精度
  while (decimals < maxDecimals) {
    const multiplier = Math.pow(10, decimals);
    if (Math.round(absAmount * multiplier) > 0) {
      break;
    }
    decimals++;
  }

  return Math.max(decimals, desiredDecimals);
}

/**
 * 格式化价格
 * @param amount 金额 (标准单位)
 * @param currency 货币代码
 * @param options 格式化选项
 */
export function formatPrice(
  amount: number | string,
  currency: string,
  options: FormatPriceOptions = {}
): string {
  const {
    locale = 'en-US',
    showSymbol = true,
    showCode = false,
    extendDecimalsOnZero = true,
    compact = false,
  } = options;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return showSymbol ? `${getCurrencySymbol(currency)}--` : '--';
  }

  const currencyInfo = getCurrencyByCode(currency);
  const isCrypto = isCryptoCurrency(currency);

  // 确定小数位数
  const minDecimals = options.minDecimals ?? (isCrypto ? 0 : 2);
  let maxDecimals = options.maxDecimals ?? currencyInfo?.decimals ?? (isCrypto ? 8 : 2);

  // 智能扩展小数位
  if (extendDecimalsOnZero && numAmount > 0) {
    maxDecimals = getSmartDecimals(numAmount, maxDecimals);
  }

  // 格式化数字
  let formattedAmount: string;

  if (compact && Math.abs(numAmount) >= 1000) {
    // 紧凑格式
    formattedAmount = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(numAmount);
  } else if (isCrypto) {
    // 加密货币：有效数字精度，避免 0.00029838 BTC 被 Intl 四舍五入为 0
    formattedAmount = formatStandardCryptoAmount(numAmount, currency);
  } else {
    // 法币格式化
    try {
      formattedAmount = new Intl.NumberFormat(locale, {
        style: showSymbol && !showCode ? 'currency' : 'decimal',
        currency: currency,
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
      }).format(numAmount);

      // 如果使用了 currency style，直接返回
      if (showSymbol && !showCode) {
        return formattedAmount;
      }
    } catch {
      // 不支持的货币，使用普通数字格式
      formattedAmount = new Intl.NumberFormat(locale, {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
      }).format(numAmount);
    }
  }

  // 添加符号或代码
  const symbol = getCurrencySymbol(currency);
  const cryptoDisplayCode = getPaymentCoinDisplayLabel(currency) || currency;

  if (showSymbol && showCode) {
    return `${formattedAmount} ${isCrypto ? cryptoDisplayCode : currency}`;
  } else if (showSymbol) {
    // 加密货币用可读代码（ETH）而非符号（Ξ）；法币符号放前面
    if (isCrypto) {
      return `${formattedAmount} ${cryptoDisplayCode}`;
    } else {
      return `${symbol}${formattedAmount}`;
    }
  } else if (showCode) {
    return `${formattedAmount} ${isCrypto ? cryptoDisplayCode : currency}`;
  }

  return formattedAmount;
}

/**
 * 转换并格式化价格
 * @param amount 金额 (标准单位)
 * @param fromCur 源货币代码
 * @param toCur 目标货币代码
 * @param options 格式化选项
 */
export function convertAndFormatPrice(
  amount: number | string,
  fromCur: string,
  toCur: string,
  options: FormatPriceOptions = {}
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // 规范化货币代码
  const fromCurCode = getBaseRateSymbol(fromCur.toUpperCase());
  const toCurCode = getBaseRateSymbol(toCur.toUpperCase());

  // 如果是同一货币，直接格式化
  if (fromCurCode === toCurCode) {
    return formatPrice(numAmount, fromCur, options);
  }

  // 检查是否有汇率数据
  const fromRate = cachedRates[fromCurCode];
  const toRate = cachedRates[toCurCode];

  // 如果没有汇率数据，显示原始货币格式（不要尝试转换后显示为目标货币）
  if (fromRate === undefined || toRate === undefined) {
    return formatPrice(numAmount, fromCur, options);
  }

  try {
    const convertedAmount = convertCurrency(numAmount, fromCur, toCur);
    return formatPrice(convertedAmount, toCur, options);
  } catch {
    // 转换失败，返回原始货币格式
    return formatPrice(numAmount, fromCur, options);
  }
}

/**
 * 渲染配对价格选项
 */
export interface RenderPairedPriceOptions {
  /** 金额是否为最小单位 (默认 true) */
  isMinimalUnit?: boolean;
  /** 明确的精度值 */
  divisibility?: number;
}

/**
 * 渲染配对价格
 * 显示原价和转换后的价格，如 "$1.00 (¥7.29)"
 *
 * @param amount 金额 (默认为最小单位，即 API 返回的原始值)
 * @param fromCur 原始货币
 * @param toCur 目标货币
 * @param options 选项
 *
 * @example
 * // API 返回 100 cents (USD)，用户本地货币为 CNY
 * renderPairedPrice(100, 'USD', 'CNY') // "$1.00 (¥7.29)"
 */
export function renderPairedPrice(
  amount: number | string,
  fromCur: string,
  toCur: string,
  options: RenderPairedPriceOptions | boolean = {}
): string {
  // 兼容旧的 boolean 参数
  const opts: RenderPairedPriceOptions =
    typeof options === 'boolean' ? { isMinimalUnit: options } : options;

  const {
    isMinimalUnit = true, // 默认为 true，因为 API 返回的都是最小单位
    divisibility,
  } = opts;

  let numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // 如果是最小单位，先转换为标准单位
  if (isMinimalUnit) {
    const div = divisibility ?? getCurrencyDecimals(fromCur);
    numAmount = new BigNumber(numAmount).dividedBy(new BigNumber(10).pow(div)).toNumber();
  }

  // 规范化货币代码
  const fromCurCode = getBaseRateSymbol(fromCur.toUpperCase());
  const toCurCode = getBaseRateSymbol(toCur.toUpperCase());

  // 如果是同一货币，只显示一个
  if (fromCurCode === toCurCode) {
    return formatPrice(numAmount, fromCur);
  }

  const fromRate = cachedRates[fromCurCode];
  const toRate = cachedRates[toCurCode];

  // 如果没有汇率数据，只显示原价
  if (fromRate === undefined || toRate === undefined) {
    return formatPrice(numAmount, fromCur);
  }

  const baseFormatted = formatPrice(numAmount, fromCur);
  const convertedFormatted = convertAndFormatPrice(numAmount, fromCur, toCur);

  return `${baseFormatted} (${convertedFormatted})`;
}

/**
 * 格式化本地货币价格选项
 */
export interface FormatLocalPriceOptions {
  /** 金额是否为最小单位 (默认 true，因为 API 返回的都是最小单位) */
  isMinimalUnit?: boolean;
  /** 明确的精度值 (如果提供，则使用此值而非从货币配置获取) */
  divisibility?: number;
}

/**
 * 格式化本地货币价格
 * 将任意货币转换为用户偏好的本地货币并格式化
 *
 * @param amount 金额 (默认为最小单位，如 cents, satoshi, wei)
 * @param fromCur 源货币代码
 * @param localCurrency 本地货币代码
 * @param options 格式化选项
 *
 * @example
 * // API 返回 100 cents (USD)，用户本地货币为 CNY
 * formatLocalPrice(100, 'USD', 'CNY') // "¥7.29" (假设汇率 1 USD = 7.29 CNY)
 *
 * // API 返回 100000000 satoshi (1 BTC)，用户本地货币为 USD
 * formatLocalPrice(100000000, 'BTC', 'USD') // "$45,000.00" (假设 1 BTC = $45,000)
 */
export function formatLocalPrice(
  amount: number | string,
  fromCur: string,
  localCurrency: string,
  options: FormatLocalPriceOptions | boolean = {}
): string {
  // 兼容旧的 boolean 参数
  const opts: FormatLocalPriceOptions =
    typeof options === 'boolean' ? { isMinimalUnit: options } : options;

  const {
    isMinimalUnit = true, // 默认为 true，因为 API 返回的都是最小单位
    divisibility,
  } = opts;

  let numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // 如果是最小单位，先转换为标准单位
  if (isMinimalUnit) {
    // 使用明确提供的 divisibility，或从货币配置获取
    const div = divisibility ?? getCurrencyDecimals(fromCur);
    numAmount = new BigNumber(numAmount).dividedBy(new BigNumber(10).pow(div)).toNumber();
  }

  // 如果源货币和本地货币相同，直接格式化
  const fromCurCode = getBaseRateSymbol(fromCur.toUpperCase());
  const localCurCode = getBaseRateSymbol(localCurrency.toUpperCase());

  if (fromCurCode === localCurCode) {
    return formatPrice(numAmount, fromCur);
  }

  // 转换并格式化
  return convertAndFormatPrice(numAmount, fromCur, localCurrency);
}

/**
 * Format a payment amount for UI display (crypto or fiat).
 * Resolves display label from paymentCoin and/or currencyCode; returns null when
 * amount or label is missing so callers can fall back to other formatters.
 */
export function formatPaymentAmount(
  amount: string | number | undefined,
  paymentCoin?: string,
  currencyCode?: string
): string | null {
  if (amount === undefined || amount === null || amount === '') return null;

  const fiatCurrency = resolveFiatPaymentCurrencyCode(paymentCoin);
  const label =
    fiatCurrency || (paymentCoin ? getPaymentCoinDisplayLabel(paymentCoin) : currencyCode || '');
  if (!label) return null;

  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(numeric)) return null;

  const coinRef = isFiatPaymentCoin(paymentCoin) ? label : paymentCoin || label;
  if (isCryptoCurrency(coinRef) || isCryptoCurrency(label)) {
    return `${formatStandardCryptoAmount(numeric, coinRef)} ${label}`;
  }

  return formatPrice(numeric, label);
}

function resolveFiatPaymentCurrencyCode(paymentCoin?: string): string | undefined {
  if (!paymentCoin || !isFiatPaymentCoin(paymentCoin)) return undefined;
  const parts = paymentCoin.split(':');
  return parts.length >= 3 && parts[2] ? parts[2].toUpperCase() : undefined;
}

/**
 * 导出服务对象
 */
export const currencyService = {
  fetchExchangeRates,
  getCachedRates,
  setRates,
  getExchangeRate,
  getLastFetchTime,
  convertCurrency,
  fromMinimalUnit,
  toMinimalUnit,
  formatPrice,
  formatPaymentAmount,
  convertAndFormatPrice,
  renderPairedPrice,
  formatLocalPrice,
};

export default currencyService;
