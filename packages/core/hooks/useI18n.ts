/**
 * 国际化 React Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getLocale,
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
import { SUPPORTED_LOCALES, LOCALE_INFO } from '../i18n/types';

export interface UseI18nReturn extends I18nContextType {
  supportedLocales: typeof SUPPORTED_LOCALES;
  localeInfo: typeof LOCALE_INFO;
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
  const [locale, setLocaleState] = useState<Locale>(() => {
    // 在客户端初始化时检测语言
    if (typeof window !== 'undefined') {
      return initLocale();
    }
    return getLocale();
  });

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

  // 翻译函数
  const t = useCallback((key: TranslationKey, params?: TranslationParams): string => {
    return getTranslation(key, params);
  }, []);

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
