/**
 * Order 组件共享工具函数
 */

import { getBlockExplorerUrl, getOrderTransactionExplorerUrl } from '@mobazha/core';

const DATE_LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  ja: 'ja-JP',
  ko: 'ko-KR',
  pt: 'pt-BR',
  ru: 'ru-RU',
};

export function resolveOrderDateLocale(locale?: string): string {
  if (!locale) return DATE_LOCALE_MAP.en;
  return DATE_LOCALE_MAP[locale] || DATE_LOCALE_MAP.en;
}

/**
 * 格式化日期为本地化字符串
 * @param dateString - ISO 日期字符串
 * @param options - 额外的格式选项
 */
export function formatOrderDate(
  dateString: string,
  options: {
    includeTime?: boolean;
    short?: boolean;
    includeSeconds?: boolean;
    locale?: string;
  } = {}
): string {
  const { includeTime = true, short = false, includeSeconds = false, locale } = options;
  const dateLocale = resolveOrderDateLocale(locale);

  if (short) {
    return new Date(dateString).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (includeTime) {
    return new Date(dateString).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
    });
  }

  return new Date(dateString).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Nullable ISO datetime for order/redemption surfaces (default: date + time with seconds).
 */
export function formatOrderDateTime(
  dateString: string | undefined | null,
  options: {
    locale?: string;
    includeTime?: boolean;
    short?: boolean;
    includeSeconds?: boolean;
  } = {}
): string | null {
  if (!dateString?.trim()) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const { includeSeconds = true, ...rest } = options;
  return formatOrderDate(dateString, {
    ...rest,
    includeSeconds,
    includeTime: rest.includeTime ?? true,
  });
}

/**
 * 格式化时间
 * @param dateString - ISO 日期字符串
 */
export function formatTime(dateString: string, locale?: string): string {
  return new Date(dateString).toLocaleTimeString(resolveOrderDateLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 复制文本到剪贴板
 * @param text - 要复制的文本
 * @returns 是否成功
 */
export { copyToClipboard } from '@/lib/clipboard';

export { getBlockExplorerUrl, getOrderTransactionExplorerUrl };

/**
 * 角色颜色映射
 */
export function getRoleColor(role: string): string {
  switch (role) {
    case 'seller':
    case 'vendor':
      return 'text-primary';
    case 'buyer':
      return 'text-info';
    case 'moderator':
      return 'text-secondary-foreground';
    default:
      return 'text-muted-foreground';
  }
}
