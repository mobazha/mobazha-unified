'use client';

/**
 * AnnouncementBarSection — PG-201
 *
 * Dismissible banner for sales, news, or updates.
 * Dismissal stored in sessionStorage per section.id.
 */

import { useState } from 'react';
import type { AnnouncementBarProps } from '@mobazha/core';

interface Props extends AnnouncementBarProps {
  sectionId?: string;
}

export function AnnouncementBarSection({
  text,
  link,
  dismissible,
  backgroundColor,
  sectionId,
}: Props) {
  const storageKey = sectionId ? `announcement-dismissed-${sectionId}` : null;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined' || !storageKey) return false;
    return sessionStorage.getItem(storageKey) === '1';
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    if (storageKey) {
      sessionStorage.setItem(storageKey, '1');
    }
    setDismissed(true);
  };

  const bg = backgroundColor || 'var(--store-primary)';

  const content = link ? (
    <a href={link} className="underline underline-offset-2 hover:opacity-80">
      {text}
    </a>
  ) : (
    <span>{text}</span>
  );

  return (
    <div
      className="relative flex items-center justify-center px-4 py-2 text-sm"
      style={{
        backgroundColor: bg,
        color: 'var(--store-on-primary)',
        fontFamily: 'var(--store-font)',
      }}
    >
      {content}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
