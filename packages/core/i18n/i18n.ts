/**
 * 国际化核心实现
 */

import type { Locale, TranslationKey, TranslationParams, TranslationResource } from './types';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types';
import { translations } from './locales';
import { initCountryLocales } from '../utils/countryUtils';

// 当前语言
let currentLocale: Locale = DEFAULT_LOCALE;

// 语言变更监听器
type LocaleChangeListener = (locale: Locale) => void;
const listeners = new Set<LocaleChangeListener>();

/**
 * 获取当前语言
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * 设置当前语言
 */
export function setLocale(locale: Locale): void {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    return;
  }

  if (locale !== currentLocale) {
    currentLocale = locale;
    // 通知所有监听器
    listeners.forEach(listener => listener(locale));

    // 持久化到 localStorage（如果可用）
    if (typeof window !== 'undefined') {
      localStorage.setItem('mobazha-locale', locale);
    }
  }
}

/**
 * 添加语言变更监听器
 */
export function onLocaleChange(listener: LocaleChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 初始化语言（从持久化存储或浏览器语言）
 */
export function initLocale(): Locale {
  // 初始化国家名称多语言支持
  initCountryLocales();

  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  // 1. 尝试从 localStorage 读取
  const saved = localStorage.getItem('mobazha-locale') as Locale | null;
  if (saved && SUPPORTED_LOCALES.includes(saved)) {
    currentLocale = saved;
    return saved;
  }

  // 2. 尝试从浏览器语言检测
  const browserLang = navigator.language.split('-')[0] as Locale;
  if (SUPPORTED_LOCALES.includes(browserLang)) {
    currentLocale = browserLang;
    return browserLang;
  }

  return DEFAULT_LOCALE;
}

/**
 * 获取翻译值
 * @param key 翻译键，支持点号分隔的路径，如 "common.loading"
 * @param params 插值参数
 * @param locale 可选的语言，不传则使用当前语言
 */
export function getTranslation(
  key: TranslationKey,
  params?: TranslationParams,
  locale?: Locale
): string {
  const effectiveLocale = locale ?? currentLocale;
  const resource = translations[effectiveLocale];
  const fallback = translations[DEFAULT_LOCALE];

  // 解析点号分隔的路径
  const keys = key.split('.');
  let value: unknown = resource;
  let fallbackValue: unknown = fallback;

  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
    fallbackValue = (fallbackValue as Record<string, unknown>)?.[k];
  }

  // 获取字符串值，支持 defaultValue 作为安全网
  const defaultValue = params && 'defaultValue' in params ? String(params.defaultValue) : undefined;
  let result = (
    typeof value === 'string'
      ? value
      : typeof fallbackValue === 'string'
        ? fallbackValue
        : (defaultValue ?? key)
  ) as string;

  // 处理插值参数（跳过 defaultValue）
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      if (paramKey === 'defaultValue') return;
      result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
    });
  }

  return result;
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat(currentLocale).format(num);
}

/**
 * 格式化货币
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * 格式化日期
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(currentLocale, options).format(d);
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return getTranslation('time.justNow');
  } else if (diffMin < 60) {
    return getTranslation('time.minutesAgo', { count: diffMin });
  } else if (diffHour < 24) {
    return getTranslation('time.hoursAgo', { count: diffHour });
  } else if (diffDay < 7) {
    return getTranslation('time.daysAgo', { count: diffDay });
  } else if (diffWeek < 4) {
    return getTranslation('time.weeksAgo', { count: diffWeek });
  } else if (diffMonth < 12) {
    return getTranslation('time.monthsAgo', { count: diffMonth });
  } else {
    return getTranslation('time.yearsAgo', { count: diffYear });
  }
}

/**
 * 获取翻译资源
 */
export function getTranslations(): TranslationResource {
  return translations[currentLocale] as TranslationResource;
}

/**
 * i18n 实例（方便导出）
 */
export const i18n = {
  t: getTranslation,
  getLocale,
  setLocale,
  initLocale,
  onLocaleChange,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getTranslations,
  language: currentLocale,
};

/**
 * 获取 i18n 实例（用于非 React 环境）
 */
export function getI18n() {
  return {
    t: getTranslation,
    language: currentLocale,
  };
}

export default i18n;
