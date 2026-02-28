'use client';

/**
 * RichTextSection — PG-201
 *
 * Free-form HTML content area. Must be 'use client' because
 * DOMPurify requires a DOM environment for sanitization.
 */

import { useMemo } from 'react';
import type { RichTextSectionProps } from '@mobazha/core';
import DOMPurify from 'dompurify';

const WIDTH_CLASS = {
  sm: 'max-w-xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  full: 'max-w-full',
} as const;

export function RichTextSection({ content, maxWidth }: RichTextSectionProps) {
  const sanitized = useMemo(() => {
    if (typeof window === 'undefined') return content;
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        's',
        'a',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'blockquote',
        'pre',
        'code',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'hr',
        'span',
        'div',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style', 'width', 'height'],
    });
  }, [content]);

  if (!content.trim()) return null;

  return (
    <div className={`mx-auto ${WIDTH_CLASS[maxWidth] ?? WIDTH_CLASS.md}`}>
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        style={{ fontFamily: 'var(--store-font, inherit)' }}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  );
}
