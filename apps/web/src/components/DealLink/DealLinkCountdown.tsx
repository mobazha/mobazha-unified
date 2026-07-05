'use client';

import React, { useEffect, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { getDealLinkCountdownParts } from '@mobazha/core/utils/dealLink';
import { cn } from '@/lib/utils';

export interface DealLinkCountdownProps {
  expiresAt?: string;
  label?: string;
  className?: string;
  testId?: string;
}

export function DealLinkCountdown({
  expiresAt,
  label,
  className,
  testId = 'deal-link-countdown',
}: DealLinkCountdownProps) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parts = getDealLinkCountdownParts(expiresAt, now);
  if (!parts) return null;

  const display = parts.expired
    ? t('dealLink.countdownExpired')
    : t('dealLink.countdownValue', {
        days: parts.days,
        hours: parts.hours,
        minutes: parts.minutes,
        seconds: parts.seconds,
      });

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm',
        parts.expired && 'border-destructive/40 bg-destructive/5 text-destructive',
        className
      )}
      data-testid={testId}
      aria-live="polite"
      aria-label={label ?? t('dealLink.quoteExpiryLabel')}
    >
      <div className="text-xs text-muted-foreground">{label ?? t('dealLink.quoteExpiryLabel')}</div>
      <div className="font-medium">{display}</div>
    </div>
  );
}
