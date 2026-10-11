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
import { wantedEnOverlay } from './wanted/en';
import { wantedZhOverlay } from './wanted/zh';
import { wantedJaOverlay } from './wanted/ja';
import { wantedKoOverlay } from './wanted/ko';
import { wantedEsOverlay } from './wanted/es';
import { wantedFrOverlay } from './wanted/fr';
import { wantedDeOverlay } from './wanted/de';
import { wantedRuOverlay } from './wanted/ru';
import { wantedPtOverlay } from './wanted/pt';
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

export const en = mergeDeep(mergeDeep(baseEn, commercialEnOverlay), wantedEnOverlay);
export const zh = mergeDeep(mergeDeep(baseZh, commercialZhOverlay), wantedZhOverlay);
export const ja = mergeDeep(mergeDeep(baseJa, commercialJaOverlay), wantedJaOverlay);
export const ko = mergeDeep(mergeDeep(baseKo, commercialKoOverlay), wantedKoOverlay);
export const es = mergeDeep(mergeDeep(baseEs, commercialEsOverlay), wantedEsOverlay);
export const fr = mergeDeep(mergeDeep(baseFr, commercialFrOverlay), wantedFrOverlay);
export const de = mergeDeep(mergeDeep(baseDe, commercialDeOverlay), wantedDeOverlay);
export const ru = mergeDeep(mergeDeep(baseRu, commercialRuOverlay), wantedRuOverlay);
export const pt = mergeDeep(mergeDeep(basePt, commercialPtOverlay), wantedPtOverlay);

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
