'use client';

import React, { useState } from 'react';
import { useAutoTranslate, useI18n } from '@mobazha/core';

type TranslatedTag = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';

export interface TranslatedTextProps {
  /** Seller-authored text, rendered as-is until a translation is available. */
  text?: string | null;
  /** Language the text was written in (e.g. `listing.metadata.language`). */
  sourceLang?: string | null;
  as?: TranslatedTag;
  className?: string;
  /** Show the "Auto-translated / Original" toggle. Defaults to true. */
  showBadge?: boolean;
  /**
   * How to render the source text. Defaults to `text`, but rich descriptions
   * pass their sanitized HTML here so the original keeps its formatting while
   * the translation — which is plain text — stays safe to render.
   */
  renderOriginal?: () => React.ReactNode;
}

/**
 * Flatten listing HTML into plain text so it can be sent to a translation
 * provider. Block elements become newlines; formatting and links do not
 * survive, which is intentional — translated HTML would have to be trusted.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Renders UI-agnostic, seller-authored content in the reader's language.
 *
 * The translation is best-effort: the original string is shown first and stays
 * on screen whenever the provider is unreachable, and readers can always flip
 * back to the seller's exact words — important on a marketplace, where the
 * listing text is the contract.
 */
export function TranslatedText({
  text,
  sourceLang,
  as = 'span',
  className,
  showBadge = true,
  renderOriginal,
}: TranslatedTextProps) {
  const { t } = useI18n();
  const { text: translatedText, translated } = useAutoTranslate(text, { sourceLang });
  const [preferOriginal, setPreferOriginal] = useState(false);

  const showingTranslation = translated && !preferOriginal;
  const value = showingTranslation ? translatedText : renderOriginal ? renderOriginal() : (text ?? '');
  const Tag = as;

  return (
    <Tag className={className}>
      {value}
      {translated && showBadge && (
        <button
          type="button"
          onClick={() => setPreferOriginal(previous => !previous)}
          className="ms-2 align-middle text-[10px] font-normal lowercase tracking-wide text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          {preferOriginal
            ? t('common.autoTranslated', { defaultValue: 'Auto-translated' })
            : t('common.original', { defaultValue: 'Original' })}
        </button>
      )}
    </Tag>
  );
}

export default TranslatedText;
