/**
 * 翻译资源索引
 */

export { ja } from './ja';
export { ko } from './ko';
export { es } from './es';
export { fr } from './fr';
export { de } from './de';
export { ru } from './ru';
export { pt } from './pt';

import { en as baseEn } from './en';
import { zh as baseZh } from './zh';
import { ja } from './ja';
import { ko } from './ko';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { ru } from './ru';
import { pt } from './pt';
import { commercialEnOverlay } from './commercial/en';
import { commercialZhOverlay } from './commercial/zh';
import type { Locale, PartialTranslationResource, TranslationResource } from '../types';

function mergeDeep<T extends object>(base: T, overlay: Partial<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overlay)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      key in out &&
      out[key] &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
    ) {
      out[key] = mergeDeep(out[key] as object, value as Partial<object>);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

export const en = mergeDeep(baseEn, commercialEnOverlay);
export const zh = mergeDeep(baseZh, commercialZhOverlay);

// 所有翻译资源
export const translations: Record<Locale, TranslationResource | PartialTranslationResource> = {
  en,
  zh,
  ja,
  ko,
  es,
  fr,
  de,
  ru,
  pt,
};

export default translations;
