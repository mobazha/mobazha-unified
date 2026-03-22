'use client';

import React from 'react';
import { Lock, Settings } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import Link from 'next/link';

interface StorePrivateBannerProps {
  className?: string;
  variant?: 'buyer' | 'admin';
}

/**
 * Banner shown when a store is private.
 * - admin variant: shown to the store owner on their own store page, with link to manage access
 * - buyer variant: shown on storefront to visitors who have access
 */
export function StorePrivateBanner({ className = '', variant = 'buyer' }: StorePrivateBannerProps) {
  const { t } = useI18n();

  const message =
    variant === 'admin' ? t('store.privateBannerAdmin') : t('store.privateBannerBuyer');

  return (
    <div
      role="status"
      className={`flex items-center gap-2 pl-12 pr-4 lg:px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-sm ${className}`}
    >
      <Lock className="w-4 h-4 text-primary flex-shrink-0" />
      <span className="text-primary font-medium flex-1">{message}</span>
      {variant === 'admin' && (
        <Link
          href="/admin/settings/access-control/privacy"
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          <Settings className="w-3 h-3" />
          {t('store.manageAccess')}
        </Link>
      )}
    </div>
  );
}
