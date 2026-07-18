/**
 * 翻译资源索引
 */

import { en as baseEn } from './en';
import { zh as baseZh } from './zh';
import { ja as baseJa } from './ja';
import { ko as baseKo } from './ko';
import { es as baseEs } from './es';
import { fr as baseFr } from './fr';
import { de as baseDe } from './de';
import { ru as baseRu } from './ru';
import { pt as basePt } from './pt';
import { commercialEnOverlay } from './commercial/en';
import { commercialZhOverlay } from './commercial/zh';
import { commercialJaOverlay } from './commercial/ja';
import { commercialKoOverlay } from './commercial/ko';
import { commercialEsOverlay } from './commercial/es';
import { commercialFrOverlay } from './commercial/fr';
import { commercialDeOverlay } from './commercial/de';
import { commercialRuOverlay } from './commercial/ru';
import { commercialPtOverlay } from './commercial/pt';
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
export const ja = mergeDeep(baseJa, commercialJaOverlay);
export const ko = mergeDeep(baseKo, commercialKoOverlay);
export const es = mergeDeep(baseEs, commercialEsOverlay);
export const fr = mergeDeep(baseFr, commercialFrOverlay);
export const de = mergeDeep(baseDe, commercialDeOverlay);
export const ru = mergeDeep(baseRu, commercialRuOverlay);
export const pt = mergeDeep(basePt, commercialPtOverlay);

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
