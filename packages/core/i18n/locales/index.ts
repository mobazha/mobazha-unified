/**
 * 翻译资源索引
 */

export { en } from './en';
export { zh } from './zh';
export { ja } from './ja';
export { ko } from './ko';
export { es } from './es';
export { fr } from './fr';
export { de } from './de';
export { ru } from './ru';
export { pt } from './pt';

import { en } from './en';
import { zh } from './zh';
import { ja } from './ja';
import { ko } from './ko';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { ru } from './ru';
import { pt } from './pt';
import type { Locale, PartialTranslationResource, TranslationResource } from '../types';

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
