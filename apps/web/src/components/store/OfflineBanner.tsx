'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useI18n } from '@mobazha/core';

interface OfflineBannerProps {
  className?: string;
}

/**
 * Non-blocking sticky banner shown when a store is offline.
 * Displays cached/search-indexed data disclaimer per §5.3.3 spec.
 */
export function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const { t } = useI18n();

  return (
    <div
      role="status"
      className={`sticky top-0 z-30 flex items-center gap-2 px-4 py-2.5 bg-warning/10 border-b border-warning/20 text-sm ${className}`}
    >
      <WifiOff className="w-4 h-4 text-warning flex-shrink-0" />
      <span className="text-warning font-medium">{t('store.offlineBanner')}</span>
    </div>
  );
}
