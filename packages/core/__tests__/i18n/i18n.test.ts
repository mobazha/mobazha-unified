/**
 * i18n 模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocale,
  setLocale,
  getTranslation,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  initLocale,
} from '../../i18n/i18n';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/types';
import { translations } from '../../i18n/locales';

function flattenTranslations(
  value: unknown,
  prefix = '',
  result: Record<string, string> = {}
): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return result;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof nestedValue === 'string') {
      result[path] = nestedValue;
    } else {
      flattenTranslations(nestedValue, path, result);
    }
  }

  return result;
}

function interpolationParams(value: string): string[] {
  return Array.from(value.matchAll(/{{\s*([^}\s]+)\s*}}/g), match => match[1]).sort();
}

describe('i18n', () => {
  beforeEach(() => {
    // 重置为默认语言
    setLocale(DEFAULT_LOCALE);
    localStorage.clear();
  });

  describe('getLocale / setLocale', () => {
    it('应返回默认语言', () => {
      expect(getLocale()).toBe(DEFAULT_LOCALE);
    });

    it('应正确设置语言', () => {
      setLocale('zh');
      expect(getLocale()).toBe('zh');
    });

    it('设置无效语言时应保持原语言', () => {
      setLocale('invalid' as never);
      expect(getLocale()).toBe(DEFAULT_LOCALE);
    });

    it('应持久化语言设置到 localStorage', () => {
      setLocale('zh');
      expect(localStorage.setItem).toHaveBeenCalledWith('mobazha-locale', 'zh');
    });
  });

  describe('initLocale', () => {
    it('应从 localStorage 恢复语言设置', () => {
      localStorage.store['mobazha-locale'] = 'zh';
      const locale = initLocale();
      expect(locale).toBe('zh');
    });

    it('无存储时应返回默认语言', () => {
      const locale = initLocale();
      expect(locale).toBe(DEFAULT_LOCALE);
    });
  });

  describe('getTranslation', () => {
    it('应返回英文翻译', () => {
      setLocale('en');
      expect(getTranslation('common.loading')).toBe('Loading...');
      expect(getTranslation('nav.home')).toBe('Home');
    });

    it('应返回中文翻译', () => {
      setLocale('zh');
      expect(getTranslation('common.loading')).toBe('加载中...');
      expect(getTranslation('nav.home')).toBe('首页');
    });

    it('应支持参数插值', () => {
      setLocale('en');
      expect(getTranslation('search.results', { count: 42 })).toBe('42 results');
    });

    it('不存在的键应返回键本身', () => {
      expect(getTranslation('nonexistent.key')).toBe('nonexistent.key');
    });

    it('应为所有支持语言提供匿名订单恢复文案', () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(translations[locale].track?.title, locale).toBeTruthy();
        expect(translations[locale].track?.placeholder, locale).toBeTruthy();
        expect(translations[locale].track?.invalid, locale).toBeTruthy();
      }
    });

    it('中文资源应覆盖所有英文翻译键', () => {
      const english = flattenTranslations(translations.en);
      const chinese = flattenTranslations(translations.zh);
      const missingKeys = Object.keys(english).filter(key => !(key in chinese));

      expect(missingKeys).toEqual([]);
    });

    it('已有翻译应保留英文资源中的全部插值参数', () => {
      const english = flattenTranslations(translations.en);

      for (const locale of SUPPORTED_LOCALES.filter(locale => locale !== DEFAULT_LOCALE)) {
        const localized = flattenTranslations(translations[locale]);
        const mismatchedKeys = Object.keys(localized).filter(
          key =>
            key in english &&
            interpolationParams(localized[key]).join(',') !==
              interpolationParams(english[key]).join(',')
        );

        expect(mismatchedKeys, locale).toEqual([]);
      }
    });

    it('所有支持语言都应提供支付报价和服务订单关键文案', () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(translations[locale].product?.free, locale).toBeTruthy();
        expect(translations[locale].payment?.selectionQuote?.title, locale).toBeTruthy();
        expect(translations[locale].payment?.selectionQuote?.expiresIn, locale).toBeTruthy();
        expect(translations[locale].admin?.orders?.guestOrderTypeService, locale).toBeTruthy();
      }
    });
  });

  describe('formatNumber', () => {
    it('应正确格式化数字 (英文)', () => {
      setLocale('en');
      expect(formatNumber(1234567.89)).toMatch(/1,234,567/);
    });

    it('应正确格式化数字 (中文)', () => {
      setLocale('zh');
      expect(formatNumber(1234567.89)).toMatch(/1,234,567/);
    });
  });

  describe('formatCurrency', () => {
    it('应正确格式化货币', () => {
      setLocale('en');
      const formatted = formatCurrency(99.99, 'USD');
      expect(formatted).toMatch(/\$99\.99/);
    });
  });

  describe('formatRelativeTime', () => {
    it('应返回 "刚刚" 对于最近的时间', () => {
      setLocale('en');
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('Just now');
    });

    it('应返回分钟格式', () => {
      setLocale('en');
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toMatch(/5 min ago/);
    });

    it('应返回小时格式', () => {
      setLocale('en');
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toMatch(/2h ago/);
    });
  });

  describe('SUPPORTED_LOCALES', () => {
    it('应包含所有支持的语言', () => {
      expect(SUPPORTED_LOCALES).toContain('en');
      expect(SUPPORTED_LOCALES).toContain('zh');
      expect(SUPPORTED_LOCALES).toContain('ja');
      expect(SUPPORTED_LOCALES).toContain('ko');
      expect(SUPPORTED_LOCALES).toContain('es');
      expect(SUPPORTED_LOCALES).toContain('fr');
      expect(SUPPORTED_LOCALES).toContain('de');
      expect(SUPPORTED_LOCALES).toContain('ru');
      expect(SUPPORTED_LOCALES).toContain('pt');
    });
  });
});
