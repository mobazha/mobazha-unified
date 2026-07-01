'use client';

/**
 * RichTextSection — PG-201
 *
 * Free-form HTML content area. Must be 'use client' because
 * DOMPurify requires a DOM environment for sanitization.
 */

import { useState, useEffect } from 'react';
import type { RichTextSectionProps } from '@mobazha/core';
import { sanitizeRichHtml } from '@mobazha/core';

const WIDTH_CLASS = {
  sm: 'max-w-xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  full: 'max-w-full',
} as const;

export function RichTextSection({ content, maxWidth }: RichTextSectionProps) {
  const [sanitized, setSanitized] = useState('');

  useEffect(() => {
    setSanitized(sanitizeRichHtml(content));
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
