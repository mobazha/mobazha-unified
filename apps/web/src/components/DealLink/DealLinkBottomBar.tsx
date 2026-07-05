'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useCurrency, useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DealLinkBottomBarProps {
  total: string;
  currency: string;
  onAccept: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function DealLinkBottomBar({
  total,
  currency,
  onAccept,
  disabled = false,
  loading = false,
  className,
}: DealLinkBottomBarProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm',
        'px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden',
        className
      )}
      data-testid="deal-link-mobile-cta"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">{t('dealLink.buyerTotal')}</div>
          <div className="text-lg font-semibold text-primary tabular-nums">
            {formatPrice(total, currency)}
          </div>
        </div>
        <Button
          type="button"
          size="lg"
          className="min-h-11 min-w-[148px]"
          onClick={onAccept}
          disabled={disabled || loading}
          data-testid="deal-link-accept-mobile"
          aria-label={t('dealLink.acceptCta')}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              {t('dealLink.accepting')}
            </>
          ) : (
            t('dealLink.acceptCta')
          )}
        </Button>
      </div>
    </div>
  );
}
