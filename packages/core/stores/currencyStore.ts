/**
 * 货币状态管理
 * 管理汇率数据和用户货币偏好
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ExchangeRates } from '../types/currency';
import {
  fetchExchangeRates,
  setRates,
  convertCurrency,
  formatPrice,
  convertAndFormatPrice,
  renderPairedPrice,
  formatLocalPrice,
  fromMinimalUnit,
  toMinimalUnit,
  type FormatLocalPriceOptions,
  type RenderPairedPriceOptions,
} from '../services/currencyService';
import { DEFAULT_LOCAL_CURRENCY, EXCHANGE_RATE_REFRESH_INTERVAL } from '../types/currency';

/**
 * 货币 Store 状态接口
 */
interface CurrencyStoreState {
  // 状态
  rates: ExchangeRates;
  lastFetched: number | null;
  loading: boolean;
  error: string | null;
  localCurrency: string;

  // 动作
  fetchRates: () => Promise<void>;
  setLocalCurrency: (currency: string) => void;
  reset: () => void;

  // 工具方法 (使用 store 中的 rates 和 localCurrency)
  convertToLocal: (amount: number | string, fromCurrency: string) => number;
  formatLocalPrice: (
    amount: number | string,
    fromCurrency: string,
    options?: FormatLocalPriceOptions | boolean
  ) => string;
  formatPrice: (amount: number | string, currency: string) => string;
  renderPairedPrice: (
    amount: number | string,
    fromCurrency: string,
    options?: RenderPairedPriceOptions | boolean
  ) => string;
}

// 自动刷新定时器
let refreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 货币 Store
 */
export const useCurrencyStore = create<CurrencyStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        rates: {},
        lastFetched: null,
        loading: false,
        error: null,
        localCurrency: DEFAULT_LOCAL_CURRENCY,

        /**
         * 获取汇率数据
         */
        fetchRates: async () => {
          set({ loading: true, error: null });

          try {
            const rates = await fetchExchangeRates(true);
            set({
              rates,
              lastFetched: Date.now(),
              loading: false,
            });
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '获取汇率失败',
              loading: false,
            });
          }
        },

        /**
         * 设置本地货币
         */
        setLocalCurrency: (currency: string) => {
          set({ localCurrency: currency.toUpperCase() });
        },

        /**
         * 重置状态
         */
        reset: () => {
          set({
            rates: {},
            lastFetched: null,
            loading: false,
            error: null,
            localCurrency: DEFAULT_LOCAL_CURRENCY,
          });
        },

        /**
         * 转换到本地货币
         */
        convertToLocal: (amount: number | string, fromCurrency: string) => {
          const { localCurrency, rates } = get();
          // 确保服务层有最新的汇率数据
          if (Object.keys(rates).length > 0) {
            setRates(rates);
          }
          return convertCurrency(amount, fromCurrency, localCurrency);
        },

        /**
         * 格式化为本地货币价格
         * @param amount 金额 (默认为最小单位)
         * @param fromCurrency 源货币代码
         * @param options 格式化选项 (或 boolean 向后兼容)
         */
        formatLocalPrice: (
          amount: number | string,
          fromCurrency: string,
          options?: FormatLocalPriceOptions | boolean
        ) => {
          const { localCurrency, rates } = get();
          // 确保服务层有最新的汇率数据
          if (Object.keys(rates).length > 0) {
            setRates(rates);
          }
          return formatLocalPrice(amount, fromCurrency, localCurrency, options);
        },

        /**
         * 格式化价格
         */
        formatPrice: (amount: number | string, currency: string) => {
          return formatPrice(amount, currency);
        },

        /**
         * 渲染配对价格
         * @param amount 金额 (默认为最小单位)
         * @param fromCurrency 源货币代码
         * @param options 选项 (或 boolean 向后兼容)
         */
        renderPairedPrice: (
          amount: number | string,
          fromCurrency: string,
          options?: RenderPairedPriceOptions | boolean
        ) => {
          const { localCurrency, rates } = get();
          // 确保服务层有最新的汇率数据
          if (Object.keys(rates).length > 0) {
            setRates(rates);
          }
          return renderPairedPrice(amount, fromCurrency, localCurrency, options);
        },
      }),
      {
        name: 'currency-storage',
        // 只持久化用户偏好，不持久化汇率数据
        partialize: state => ({ localCurrency: state.localCurrency }),
      }
    ),
    { name: 'CurrencyStore' }
  )
);

/**
 * 初始化货币系统
 * 应在应用启动时调用
 */
export function initializeCurrencyStore(): void {
  const store = useCurrencyStore.getState();

  // 立即获取汇率
  store.fetchRates();

  // 设置自动刷新
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(() => {
    store.fetchRates();
  }, EXCHANGE_RATE_REFRESH_INTERVAL);
}

/**
 * 清理货币系统
 * 应在应用卸载时调用
 */
export function cleanupCurrencyStore(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// 选择器
export const selectRates = (state: CurrencyStoreState) => state.rates;
export const selectLocalCurrency = (state: CurrencyStoreState) => state.localCurrency;
export const selectCurrencyLoading = (state: CurrencyStoreState) => state.loading;
export const selectCurrencyError = (state: CurrencyStoreState) => state.error;
export const selectLastFetched = (state: CurrencyStoreState) => state.lastFetched;

// 导出工具函数以便直接使用
export {
  convertCurrency,
  formatPrice,
  convertAndFormatPrice,
  renderPairedPrice,
  formatLocalPrice,
  fromMinimalUnit,
  toMinimalUnit,
};
