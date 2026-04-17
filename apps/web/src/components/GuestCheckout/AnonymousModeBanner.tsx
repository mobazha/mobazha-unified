'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface AnonymousModeBannerProps {
  className?: string;
}

export function AnonymousModeBanner({ className }: AnonymousModeBannerProps) {
  const { t } = useI18n();
  return (
    <div
      role="note"
      className={cn(
        'rounded-lg border border-amber-300/60 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {t('guestCheckout.anonymousBannerTitle')}
          </p>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-1">
            {t('guestCheckout.anonymousBannerSubtitle')}
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 text-xs font-medium underline underline-offset-2 text-amber-900 dark:text-amber-100 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {t('guestCheckout.anonymousLearnMore')}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="text-sm">
              <p className="font-semibold mb-2">{t('guestCheckout.anonymousLearnMore')}</p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground leading-relaxed">
                <li>{t('guestCheckout.anonymousPointNoAccount')}</li>
                <li>{t('guestCheckout.anonymousPointDirectPayment')}</li>
                <li>{t('guestCheckout.anonymousPointEmailOptional')}</li>
                <li>{t('guestCheckout.anonymousPointSaveLink')}</li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
