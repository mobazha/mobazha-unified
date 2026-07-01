/**
 * 国际化 React Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  setLocale as setI18nLocale,
  getTranslation,
  onLocaleChange,
  initLocale,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from '../i18n/i18n';
import type { Locale, TranslationKey, TranslationParams, I18nContextType } from '../i18n/types';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALE_INFO } from '../i18n/types';

export interface UseI18nReturn extends I18nContextType {
  supportedLocales: typeof SUPPORTED_LOCALES;
  localeInfo: typeof LOCALE_INFO;
  /** 别名：等同于 locale */
  language: Locale;
  /** 别名：等同于 setLocale */
  setLanguage: (locale: Locale) => void;
}

/**
 * 国际化 Hook
 * 提供翻译函数和语言切换功能
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useI18n();
 *
 * return (
 *   <div>
 *     <h1>{t('home.welcome')}</h1>
 *     <button onClick={() => setLocale('zh')}>中文</button>
 *   </div>
 * );
 * ```
 */
export function useI18n(): UseI18nReturn {
  // 首次渲染始终使用默认语言，避免 hydration mismatch
  // 不能使用 getLocale() 因为模块级变量可能已被修改
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // 客户端 hydration 完成后初始化实际语言
  // 这里需要同步 setState 以确保用户看到正确的语言
  useEffect(() => {
    const detectedLocale = initLocale();
    if (detectedLocale !== DEFAULT_LOCALE) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始化语言需要在 effect 中同步设置
      setLocaleState(detectedLocale);
    }
  }, []);

  // 监听语言变化
  useEffect(() => {
    const unsubscribe = onLocaleChange(newLocale => {
      setLocaleState(newLocale);
    });
    return unsubscribe;
  }, []);

  // 设置语言
  const setLocale = useCallback((newLocale: Locale) => {
    setI18nLocale(newLocale);
    // State will be updated by the onLocaleChange listener
  }, []);

  // 翻译函数 - 使用 locale state 确保 hydration 一致性
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
      return getTranslation(key, params, locale);
    },
    [locale]
  );

  // 数字格式化
  const formatNum = useCallback((num: number): string => {
    return formatNumber(num);
  }, []);

  // 货币格式化
  const formatCurr = useCallback((amount: number, currency?: string): string => {
    return formatCurrency(amount, currency);
  }, []);

  // 日期格式化
  const formatDt = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      return formatDate(date, options);
    },
    []
  );

  // 相对时间格式化
  const formatRelTime = useCallback((date: Date | string | number): string => {
    return formatRelativeTime(date);
  }, []);

  // 返回值 memo 化
  return useMemo(
    () => ({
      locale,
      setLocale,
      // 别名：兼容 language/setLanguage 命名
      language: locale,
      setLanguage: setLocale,
      t,
      formatNumber: formatNum,
      formatCurrency: formatCurr,
      formatDate: formatDt,
      formatRelativeTime: formatRelTime,
      supportedLocales: SUPPORTED_LOCALES,
      localeInfo: LOCALE_INFO,
    }),
    [locale, setLocale, t, formatNum, formatCurr, formatDt, formatRelTime]
  );
}

export default useI18n;
