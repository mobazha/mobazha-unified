'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { usePlatform } from '@mobazha/ui/hooks';

interface CheckoutSubpageHeaderProps {
  title: string;
  onBack: () => void;
}

/**
 * Header for mobile checkout sub-pages (payment method, moderator).
 * In TMA the native BackButton is used — no in-page back arrow.
 */
export function CheckoutSubpageHeader({ title, onBack }: CheckoutSubpageHeaderProps) {
  const { t } = useI18n();
  const { isEmbeddedApp } = usePlatform();

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center h-14 px-4 gap-2">
        {!isEmbeddedApp && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-full text-foreground touch-feedback active:bg-muted/50"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <span className="font-medium text-foreground">{title}</span>
      </div>
    </header>
  );
}
