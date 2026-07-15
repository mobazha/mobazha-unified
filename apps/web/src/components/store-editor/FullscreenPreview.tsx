'use client';

/**
 * FullscreenPreview — PG-203 V2-P4
 *
 * Buyer's-eye view of whatever the seller is currently editing, unsaved edits
 * included. Deliberately an in-page overlay rather than a new tab: a tab could
 * only ever load the *saved* draft from the node, which is not what the seller
 * is looking at, and "preview" that silently drops your last edit is worse than
 * no preview. Renders through the same SectionRenderer buyers get, so what is
 * shown here is what ships.
 */

import React, { useEffect } from 'react';
import { useI18n } from '@mobazha/core';
import type { StoreConfig, UserProfile } from '@mobazha/core';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionRenderer, StoreThemeProvider } from '@/components/store-sections';
import { cn } from '@/lib/utils';

interface FullscreenPreviewProps {
  open: boolean;
  config: StoreConfig;
  peerId: string;
  profile?: UserProfile;
  /** Whether what's on screen differs from what buyers currently see. */
  isDraft: boolean;
  onClose: () => void;
}

export function FullscreenPreview({
  open,
  config,
  peerId,
  profile,
  isDraft,
  onClose,
}: FullscreenPreviewProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={t('admin.storeBranding.fullscreenPreview')}
      data-testid="fullscreen-preview"
    >
      <div className="flex items-center justify-between gap-3 px-4 h-12 border-b border-border bg-card shrink-0">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
            isDraft
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isDraft
            ? t('admin.storeBranding.previewBannerDraft')
            : t('admin.storeBranding.previewBannerLive')}
        </span>
        <Button variant="outline" size="sm" onClick={onClose} data-testid="exit-preview">
          <X className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">{t('admin.storeBranding.exitPreview')}</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <StoreThemeProvider theme={config.theme}>
          <SectionRenderer sections={config.sections} peerId={peerId} profile={profile} />
        </StoreThemeProvider>
      </div>
    </div>
  );
}
