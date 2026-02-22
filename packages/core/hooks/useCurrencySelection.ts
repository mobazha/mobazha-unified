'use client';

/**
 * 货币选择 Hook
 * 提供货币列表分组、搜索过滤、选中状态等逻辑
 * 用于设置页面的货币选择弹窗
 */

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from './useI18n';
import { useLocalCurrency } from './useCurrency';
import {
  FIAT_CURRENCIES,
  CRYPTO_CURRENCIES,
  getPopularCurrencies,
  getCurrencyDisplayName,
  getCurrencyFlag,
} from '../data/currencies';
import type { CurrencyInfo } from '../types/currency';

/**
 * 货币分组
 */
export interface CurrencySection {
  /** 分组标签（已国际化） */
  label: string;
  /** 该分组下的货币列表 */
  items: CurrencyInfo[];
}

/**
 * useCurrencySelection Hook 返回类型
 */
export interface UseCurrencySelectionReturn {
  /** 按分组展示的货币列表 */
  currencySections: CurrencySection[];
  /** 扁平化的货币列表（用于查找） */
  currencyOptions: CurrencyInfo[];
  /** 当前选中的货币信息 */
  selectedCurrencyInfo: CurrencyInfo | undefined;
  /** 搜索关键字 */
  searchQuery: string;
  /** 设置搜索关键字 */
  setSearchQuery: (query: string) => void;
  /** 当前选中的货币代码 */
  localCurrency: string;
  /** 设置选中的货币代码 */
  setLocalCurrency: (code: string) => void;
  /** 获取货币的本地化显示名称 */
  getDisplayName: (code: string) => string;
  /** 获取法币的国旗 emoji（加密货币返回 null） */
  getFlag: (code: string) => string | null;
}

/**
 * 货币选择 Hook
 *
 * 封装货币列表分组（常用/法币/加密货币）、搜索过滤、选中状态等共享逻辑。
 * 供 settings/general/page.tsx 等设置页面共用。
 */
export function useCurrencySelection(): UseCurrencySelectionReturn {
  const { t, language } = useI18n();
  const { localCurrency, setLocalCurrency } = useLocalCurrency();
  const [searchQuery, setSearchQuery] = useState('');

  const getDisplayName = useCallback(
    (code: string) => getCurrencyDisplayName(code, language),
    [language]
  );

  const currencySections = useMemo<CurrencySection[]>(() => {
    const popular = getPopularCurrencies();
    const all = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = all.filter(
        c =>
          c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          getCurrencyDisplayName(c.code, language).toLowerCase().includes(query) ||
          c.symbol.toLowerCase().includes(query)
      );
      const fiat = filtered.filter(c => c.type === 'fiat');
      const crypto = filtered.filter(c => c.type === 'crypto');
      const sections: CurrencySection[] = [];
      if (fiat.length > 0) sections.push({ label: t('settings.fiatCurrency'), items: fiat });
      if (crypto.length > 0) sections.push({ label: t('settings.cryptoCurrency'), items: crypto });
      return sections;
    }

    const popularCodes = new Set(popular.map(p => p.code));
    const otherFiat = FIAT_CURRENCIES.filter(c => !popularCodes.has(c.code)).sort((a, b) =>
      a.code.localeCompare(b.code)
    );
    const otherCrypto = CRYPTO_CURRENCIES.filter(c => !popularCodes.has(c.code)).sort((a, b) =>
      a.code.localeCompare(b.code)
    );

    const sections: CurrencySection[] = [];
    if (popular.length > 0) sections.push({ label: t('settings.popularCurrency'), items: popular });
    if (otherFiat.length > 0)
      sections.push({ label: t('settings.fiatCurrency'), items: otherFiat });
    if (otherCrypto.length > 0)
      sections.push({ label: t('settings.cryptoCurrency'), items: otherCrypto });
    return sections;
  }, [searchQuery, language, t]);

  const currencyOptions = useMemo(() => {
    return currencySections.flatMap(s => s.items);
  }, [currencySections]);

  const selectedCurrencyInfo = useMemo(() => {
    return currencyOptions.find(c => c.code === localCurrency) || currencyOptions[0];
  }, [localCurrency, currencyOptions]);

  return {
    currencySections,
    currencyOptions,
    selectedCurrencyInfo,
    searchQuery,
    setSearchQuery,
    localCurrency,
    setLocalCurrency,
    getDisplayName,
    getFlag: getCurrencyFlag,
  };
}
