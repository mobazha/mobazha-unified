'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export interface OrderProtectionStatusProps {
  stage:
    | 'ESCROWED'
    | 'SHIPPING'
    | 'PROTECTION_PERIOD'
    | 'COMPLETED'
    | 'DISPUTED'
    | 'AFTER_SALE_WINDOW';
  daysRemaining?: number;
  autoCompleteAt?: string; // ISO date
  extendable?: boolean;
  extended?: boolean;
  afterSaleWindowDays?: number;
  userRole: 'buyer' | 'seller';
  onExtendProtection?: () => Promise<void>;
  className?: string;
}

export const OrderProtectionStatus = memo(function OrderProtectionStatus({
  stage,
  daysRemaining = 0,
  autoCompleteAt,
  extendable,
  extended,
  afterSaleWindowDays = 0,
  userRole,
  onExtendProtection,
  className,
}: OrderProtectionStatusProps) {
  const { t } = useI18n();
  const isDisputed = stage === 'DISPUTED';

  const countdownText = useMemo(() => {
    if (stage !== 'PROTECTION_PERIOD' && stage !== 'DISPUTED') return null;
    if (isDisputed) return t('trust.protection.disputedDesc');
    const days = daysRemaining ?? 0;
    return userRole === 'buyer'
      ? t('trust.protection.daysRemaining', { days })
      : t('trust.protection.sellerCountdown', { days });
  }, [stage, daysRemaining, userRole, isDisputed, t]);

  const autoCompleteText = useMemo(() => {
    if (stage !== 'PROTECTION_PERIOD' || !autoCompleteAt) return null;
    const date = new Date(autoCompleteAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return t('trust.protection.autoCompleteAt', { date });
  }, [stage, autoCompleteAt, t]);

  const [extending, setExtending] = useState(false);

  const handleExtend = useCallback(async () => {
    if (!onExtendProtection || extending) return;
    setExtending(true);
    try {
      await onExtendProtection();
    } finally {
      setExtending(false);
    }
  }, [onExtendProtection, extending]);

  const extensionText = useMemo(() => {
    if (stage !== 'PROTECTION_PERIOD') return null;
    if (extended) {
      return userRole === 'seller'
        ? t('trust.protection.sellerExtended')
        : t('trust.protection.extended');
    }
    if (extendable && userRole === 'buyer' && !onExtendProtection) {
      return t('trust.protection.extendable');
    }
    return null;
  }, [stage, extended, extendable, userRole, onExtendProtection, t]);

  const completedText = useMemo(() => {
    if (stage !== 'COMPLETED') return null;
    return userRole === 'seller'
      ? t('trust.protection.completedSellerDesc')
      : t('trust.protection.completedDesc');
  }, [stage, userRole, t]);

  const afterSaleText = useMemo(() => {
    if (stage !== 'AFTER_SALE_WINDOW') return null;
    const days = afterSaleWindowDays ?? 0;
    return t('trust.protection.afterSaleDesc', { days });
  }, [stage, afterSaleWindowDays, t]);

  const hasContent =
    countdownText || afterSaleText || completedText || autoCompleteText || extensionText;

  if (!hasContent && !isDisputed) return null;

  const Icon = isDisputed ? AlertTriangle : ShieldCheck;
  const iconColor = isDisputed ? 'text-warning' : 'text-primary';
  const bgStyle = isDisputed ? 'bg-warning/8 border-warning/20' : 'bg-primary/5 border-primary/15';

  const hasActions =
    stage === 'PROTECTION_PERIOD' &&
    extendable &&
    !extended &&
    userRole === 'buyer' &&
    onExtendProtection;

  return (
    <div
      className={cn('rounded-xl border p-3', bgStyle, className)}
      data-testid="order-protection-status"
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('mt-0.5 shrink-0', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <div
          className={cn(
            'flex-1 min-w-0',
            hasActions && 'sm:flex sm:items-start sm:justify-between sm:gap-4'
          )}
        >
          <div className="min-w-0">
            {countdownText && (
              <p
                className={cn(
                  'text-sm font-medium',
                  isDisputed ? 'text-warning' : 'text-foreground'
                )}
              >
                {countdownText}
              </p>
            )}
            {autoCompleteText && (
              <p className="text-xs text-muted-foreground mt-0.5">{autoCompleteText}</p>
            )}
            {extensionText && (
              <p
                className={cn(
                  'text-xs mt-0.5',
                  extended ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {extensionText}
              </p>
            )}
            {completedText && <p className="text-sm font-medium text-success">{completedText}</p>}
            {afterSaleText && (
              <p className="text-xs text-muted-foreground mt-0.5">{afterSaleText}</p>
            )}
          </div>
          {hasActions && (
            <div className="mt-2 sm:mt-0 shrink-0">
              <button
                type="button"
                onClick={handleExtend}
                disabled={extending}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                  'bg-primary/10 text-primary hover:bg-primary/20',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {extending ? t('common.loading') : t('trust.protection.extendButton')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
