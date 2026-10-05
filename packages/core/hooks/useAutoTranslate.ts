/**
 * React binding for {@link translateText}.
 *
 * Rendering contract: the hook always returns something renderable. On the
 * server — and until a translation arrives — `text` is the seller's original
 * string, so SSR output and the first client render agree (no hydration
 * mismatch) and nothing flickers.
 */

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from './useI18n';
import { shouldTranslate, translateText } from '../services/translation/contentTranslation';

export interface AutoTranslatedText {
  /** What to render: the translation when available, otherwise the original. */
  text: string;
  /** True when `text` is a machine translation rather than the seller's words. */
  translated: boolean;
  /** True while a translation request is in flight. */
  pending: boolean;
}

export interface UseAutoTranslateOptions {
  /** Language the content was written in (e.g. `listing.metadata.language`). */
  sourceLang?: string | null;
  /** Turn the hook off for a subtree without changing call sites. */
  enabled?: boolean;
}

export function useAutoTranslate(
  original: string | null | undefined,
  options: UseAutoTranslateOptions = {}
): AutoTranslatedText {
  const { sourceLang, enabled = true } = options;
  const { locale } = useI18n();
  const originalText = original ?? '';

  const eligible = useMemo(
    () => enabled && shouldTranslate(originalText, sourceLang, locale),
    [enabled, originalText, sourceLang, locale]
  );

  const [state, setState] = useState<AutoTranslatedText>({
    text: originalText,
    translated: false,
    pending: false,
  });

  useEffect(() => {
    if (!eligible) {
      setState({ text: originalText, translated: false, pending: false });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setState({ text: originalText, translated: false, pending: true });

    translateText(originalText, sourceLang, locale, controller.signal).then(result => {
      if (cancelled) return;
      setState({
        text: result,
        // A provider that echoes the input is not a translation.
        translated: result.trim() !== originalText.trim(),
        pending: false,
      });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [eligible, originalText, sourceLang, locale]);

  return state;
}
