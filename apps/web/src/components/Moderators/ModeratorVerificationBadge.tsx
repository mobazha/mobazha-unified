'use client';

import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@mobazha/core';
import type { Moderator } from '@/components/Payment/types';
import { isModeratorVerified } from './moderatorDisplay';

export interface ModeratorVerificationBadgeProps {
  moderator: Moderator;
  className?: string;
}

/** Always shows verified or unverified — never silent. */
export function ModeratorVerificationBadge({
  moderator,
  className,
}: ModeratorVerificationBadgeProps) {
  const { t } = useI18n();
  const verified = isModeratorVerified(moderator);

  if (verified) {
    return (
      <Badge
        variant="secondary"
        className={cn('bg-primary/10 text-primary text-xs h-5 gap-0.5', className)}
      >
        <Shield className="w-3 h-3" aria-hidden />
        {t('payment.verified')}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-warning border-warning/40 text-xs h-5 gap-0.5', className)}
    >
      <AlertTriangle className="w-3 h-3" aria-hidden />
      {t('moderator.customUnverifiedBadge')}
    </Badge>
  );
}
