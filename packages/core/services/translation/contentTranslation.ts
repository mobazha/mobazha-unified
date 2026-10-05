/**
 * On-demand translation for seller-authored content.
 *
 * UI copy lives in `packages/core/i18n/locales/*` and is selected with `t()`.
 * Listing content — title, description, tags — is *data*: the seller typed it
 * once in one language and it is rendered as-is, so a buyer browsing in
 * another language sees the seller's language.
 *
 * This module translates that data on demand. Design constraints:
 *
 * - **Never block rendering.** Every failure path (offline, rate limited,
 *   endpoint blocked in the buyer's region) resolves to the original text.
 * - **Translate once per string.** Results are cached in `localStorage`, so
 *   scrolling a catalogue does not re-request the same title.
 * - **Do not ship huge strings to a third party.** Descriptions longer than
 *   `MAX_TEXT_LENGTH` are left alone.
 *
 * Privacy note: the endpoint below is a third-party service, so seller
 * content leaves the browser. Deployments that cannot accept that should route
 * `translateText` through their own gateway; the hook and component built on
 * top of this module do not care where the text comes from.
 */

export type TranslationLocale = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'pt';

/** Our locale ids → provider language tags (the provider expects `zh-CN`). */
const PROVIDER_CODES: Record<TranslationLocale, string> = {
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
  de: 'de',
  ru: 'ru',
  pt: 'pt',
};

const CACHE_PREFIX = 'mbz:tr:1:';
const MAX_TEXT_LENGTH = 5000;
const REQUEST_TIMEOUT_MS = 8000;

/** `zh-Hans`, `zh_CN`, `ZH` → `zh`; unknown tags → undefined. */
export function normalizeLocaleTag(tag: string | null | undefined): TranslationLocale | undefined {
  if (!tag) return undefined;
  const base = tag.toLowerCase().split(/[-_]/)[0] as TranslationLocale;
  return PROVIDER_CODES[base] ? base : undefined;
}

/**
 * True when `text` is worth translating: it carries letters, both languages
 * are known, they differ, and the string is short enough to send.
 */
export function shouldTranslate(
  text: string | null | undefined,
  source: string | null | undefined,
  target: string | null | undefined
): boolean {
  if (!text || !text.trim()) return false;
  if (text.length > MAX_TEXT_LENGTH) return false;
  // Nothing to translate: prices, numbers, punctuation, emoji.
  if (!/\p{L}/u.test(text)) return false;
  const from = normalizeLocaleTag(source);
  const to = normalizeLocaleTag(target);
  if (!from || !to) return false;
  return from !== to;
}

/** djb2 — small, stable, and good enough to key a cache. */
function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(text: string, from: TranslationLocale, to: TranslationLocale): string {
  return `${CACHE_PREFIX}${from}>${to}:${text.length}:${hashText(text)}`;
}

export function readCachedTranslation(
  text: string,
  from: TranslationLocale,
  to: TranslationLocale
): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(cacheKey(text, from, to));
  } catch {
    return null;
  }
}

export function writeCachedTranslation(
  text: string,
  from: TranslationLocale,
  to: TranslationLocale,
  translated: string
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cacheKey(text, from, to), translated);
  } catch {
    /* Quota or private mode — caching is best effort. */
  }
}

/**
 * Translate `text` from `source` into `target`.
 *
 * Resolves with the original text when anything goes wrong, so callers can
 * render the result unconditionally.
 */
export async function translateText(
  text: string,
  source: string | null | undefined,
  target: string | null | undefined,
  signal?: AbortSignal
): Promise<string> {
  const from = normalizeLocaleTag(source);
  const to = normalizeLocaleTag(target);
  if (!from || !to || from === to || !text.trim()) return text;

  const cached = readCachedTranslation(text, from, to);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t' +
      `&sl=${encodeURIComponent(PROVIDER_CODES[from])}` +
      `&tl=${encodeURIComponent(PROVIDER_CODES[to])}` +
      `&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return text;

    const payload: unknown = await response.json();
    // Provider shape: [[[translated, original, ...], ...], ...]
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) return text;
    const translated = (payload[0] as unknown[])
      .map(segment => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
      .join('')
      .trim();
    if (!translated) return text;

    writeCachedTranslation(text, from, to, translated);
    return translated;
  } catch {
    // Aborted, offline, blocked or malformed — keep the seller's text.
    return text;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
