/**
 * 货币 Hook
 * 提供货币转换、格式化等功能的 React Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  useCurrencyStore,
  initializeCurrencyStore,
  type RefreshLevel,
} from '../stores/currencyStore';
import {
  convertCurrency,
  formatPrice as formatPriceService,
  fromMinimalUnit,
  toMinimalUnit,
} from '../services/currencyService';
import {
  getCurrencyByCode,
  getCurrencySymbol,
  getCurrencyDecimals,
  isCryptoCurrency,
  isFiatCurrency,
  getPopularCurrencies,
  ALL_CURRENCIES,
} from '../data/currencies';
import type { CurrencyInfo, FormatPriceOptions, ExchangeRates } from '../types/currency';
import type {
  FormatLocalPriceOptions,
  RenderPairedPriceOptions,
} from '../services/currencyService';

/**
 * useCurrency Hook 返回类型
 */
export interface UseCurrencyReturn {
  // 状态
  localCurrency: string;
  rates: ExchangeRates;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  // 设置
  setLocalCurrency: (currency: string) => void;
  refreshRates: () => Promise<void>;

  // 转换函数
  convertToLocal: (amount: number | string, fromCurrency: string) => number;
  convertBetween: (amount: number | string, fromCurrency: string, toCurrency: string) => number;

  // 格式化函数
  formatPrice: (amount: number | string, currency: string, options?: FormatPriceOptions) => string;
  formatLocalPrice: (
    amount: number | string,
    fromCurrency: string,
    options?: FormatLocalPriceOptions | boolean
  ) => string;
  renderPairedPrice: (
    amount: number | string,
    fromCurrency: string,
    options?: RenderPairedPriceOptions | boolean
  ) => string;

  // 单位转换
  fromMinimalUnit: (amount: number | string, currency: string) => number;
  toMinimalUnit: (amount: number | string, currency: string) => number;

  // 货币信息
  getCurrencyInfo: (code: string) => CurrencyInfo | undefined;
  getCurrencySymbol: (code: string) => string;
  getCurrencyDecimals: (code: string) => number;
  isCrypto: (code: string) => boolean;
  isFiat: (code: string) => boolean;

  // 货币列表
  popularCurrencies: CurrencyInfo[];
  allCurrencies: CurrencyInfo[];
}

/**
 * 货币 Hook
 * 提供完整的货币操作功能
 */
export function useCurrency(): UseCurrencyReturn {
  // 从 store 获取状态和方法
  const {
    localCurrency,
    rates,
    loading,
    error,
    lastFetched,
    setLocalCurrency,
    fetchRates,
    formatLocalPrice: storeFormatLocalPrice,
    renderPairedPrice: storeRenderPairedPrice,
    convertToLocal: storeConvertToLocal,
  } = useCurrencyStore(
    useShallow(state => ({
      localCurrency: state.localCurrency,
      rates: state.rates,
      loading: state.loading,
      error: state.error,
      lastFetched: state.lastFetched,
      setLocalCurrency: state.setLocalCurrency,
      fetchRates: state.fetchRates,
      formatLocalPrice: state.formatLocalPrice,
      renderPairedPrice: state.renderPairedPrice,
      convertToLocal: state.convertToLocal,
    }))
  );

  // 初始化时获取汇率
  useEffect(() => {
    // 如果没有汇率数据，初始化
    if (Object.keys(rates).length === 0 && !loading) {
      initializeCurrencyStore();
    }

    // 清理
    return () => {
      // 注意：不在 unmount 时清理，因为其他组件可能还在使用
      // cleanupCurrencyStore();
    };
  }, []);

  /**
   * 刷新汇率
   */
  const refreshRates = useCallback(async () => {
    await fetchRates();
  }, [fetchRates]);

  /**
   * 转换到本地货币
   */
  const convertToLocal = useCallback(
    (amount: number | string, fromCurrency: string): number => {
      return storeConvertToLocal(amount, fromCurrency);
    },
    [storeConvertToLocal]
  );

  /**
   * 货币间转换
   */
  const convertBetween = useCallback(
    (amount: number | string, fromCurrency: string, toCurrency: string): number => {
      return convertCurrency(amount, fromCurrency, toCurrency);
    },
    []
  );

  /**
   * 格式化价格
   */
  const formatPrice = useCallback(
    (amount: number | string, currency: string, options?: FormatPriceOptions): string => {
      return formatPriceService(amount, currency, options);
    },
    []
  );

  /**
   * 格式化为本地货币价格
   * @param amount 金额 (默认为最小单位，即 API 返回的原始值)
   * @param fromCurrency 源货币代码
   * @param options 格式化选项，或 boolean 向后兼容旧的 isMinimalUnit 参数
   */
  const formatLocalPrice = useCallback(
    (
      amount: number | string,
      fromCurrency: string,
      options?: FormatLocalPriceOptions | boolean
    ): string => {
      return storeFormatLocalPrice(amount, fromCurrency, options);
    },
    [storeFormatLocalPrice]
  );

  /**
   * 渲染配对价格
   * @param amount 金额 (默认为最小单位，即 API 返回的原始值)
   * @param fromCurrency 源货币代码
   * @param options 选项，或 boolean 向后兼容
   */
  const renderPairedPrice = useCallback(
    (
      amount: number | string,
      fromCurrency: string,
      options?: RenderPairedPriceOptions | boolean
    ): string => {
      return storeRenderPairedPrice(amount, fromCurrency, options);
    },
    [storeRenderPairedPrice]
  );

  /**
   * 从最小单位转换
   */
  const fromMinUnit = useCallback((amount: number | string, currency: string): number => {
    return fromMinimalUnit(amount, currency);
  }, []);

  /**
   * 转换到最小单位
   */
  const toMinUnit = useCallback((amount: number | string, currency: string): number => {
    return toMinimalUnit(amount, currency);
  }, []);

  /**
   * 获取货币信息
   */
  const getCurrencyInfo = useCallback((code: string): CurrencyInfo | undefined => {
    return getCurrencyByCode(code);
  }, []);

  /**
   * 获取货币符号
   */
  const getSymbol = useCallback((code: string): string => {
    return getCurrencySymbol(code);
  }, []);

  /**
   * 获取货币精度
   */
  const getDecimals = useCallback((code: string): number => {
    return getCurrencyDecimals(code);
  }, []);

  /**
   * 是否为加密货币
   */
  const isCrypto = useCallback((code: string): boolean => {
    return isCryptoCurrency(code);
  }, []);

  /**
   * 是否为法币
   */
  const isFiat = useCallback((code: string): boolean => {
    return isFiatCurrency(code);
  }, []);

  // 缓存的货币列表
  const popularCurrencies = useMemo(() => getPopularCurrencies(), []);
  const allCurrencies = useMemo(() => ALL_CURRENCIES, []);

  return {
    // 状态
    localCurrency,
    rates,
    loading,
    error,
    lastFetched,

    // 设置
    setLocalCurrency,
    refreshRates,

    // 转换函数
    convertToLocal,
    convertBetween,

    // 格式化函数
    formatPrice,
    formatLocalPrice,
    renderPairedPrice,

    // 单位转换
    fromMinimalUnit: fromMinUnit,
    toMinimalUnit: toMinUnit,

    // 货币信息
    getCurrencyInfo,
    getCurrencySymbol: getSymbol,
    getCurrencyDecimals: getDecimals,
    isCrypto,
    isFiat,

    // 货币列表
    popularCurrencies,
    allCurrencies,
  };
}

/**
 * 简化版 Hook，只返回格式化函数
 * 用于性能敏感的场景
 */
export function useCurrencyFormat() {
  const formatLocalPrice = useCurrencyStore(state => state.formatLocalPrice);
  const formatPrice = useCurrencyStore(state => state.formatPrice);
  const localCurrency = useCurrencyStore(state => state.localCurrency);

  return {
    formatLocalPrice,
    formatPrice,
    localCurrency,
  };
}

/**
 * 仅获取本地货币设置的 Hook
 */
export function useLocalCurrency() {
  const localCurrency = useCurrencyStore(state => state.localCurrency);
  const setLocalCurrency = useCurrencyStore(state => state.setLocalCurrency);

  return {
    localCurrency,
    setLocalCurrency,
  };
}

/**
 * 汇率新鲜度 Hook — 用于结账/支付页面
 *
 * 进入页面时设置更高的刷新频率并强制刷新一次，
 * 离开页面时恢复默认。同时提供 "X seconds ago" 倒计时。
 */
export function useRateFreshness(level: RefreshLevel) {
  const lastFetched = useCurrencyStore(state => state.lastFetched);
  const setRefreshLevel = useCurrencyStore(state => state.setRefreshLevel);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    setRefreshLevel(level);
    return () => {
      setRefreshLevel('default');
    };
  }, [level, setRefreshLevel]);

  useEffect(() => {
    const tick = () => {
      if (lastFetched) {
        setSecondsAgo(Math.round((Date.now() - lastFetched) / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastFetched]);

  return { secondsAgo, lastFetched };
}

export default useCurrency;
