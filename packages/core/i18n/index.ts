/**
 * 国际化模块
 * 提供多语言支持
 */

export * from './types';
export { translations, en, zh } from './locales';
export {
  i18n,
  getTranslation,
  setLocale,
  getLocale,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from './i18n';
