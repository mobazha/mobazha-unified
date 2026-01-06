/**
 * 翻译资源索引
 */

export { en } from './en';
export { zh } from './zh';

import { en } from './en';
import { zh } from './zh';
import type { Locale, TranslationResource } from '../types';

// 所有翻译资源
export const translations: Record<Locale, TranslationResource> = {
  en,
  zh,
};

export default translations;
