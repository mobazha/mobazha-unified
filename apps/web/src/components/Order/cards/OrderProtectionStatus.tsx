'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertTriangle, Shield } from 'lucide-react';

export type ProtectionLevel = 'full' | 'standard' | 'platform';

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
  protectionLevel?: ProtectionLevel;
  onExtendProtection?: () => Promise<void>;
  className?: string;
}

const LEVEL_STYLES: Record<ProtectionLevel, { bg: string; text: string }> = {
  full: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  standard: { bg: 'bg-primary/10', text: 'text-primary' },
  platform: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-400',
  },
};

const LEVEL_I18N: Record<ProtectionLevel, string> = {
  full: 'trust.protection.levelFull',
  standard: 'trust.protection.levelStandard',
  platform: 'trust.protection.levelPlatform',
};

export const OrderProtectionStatus = memo(function OrderProtectionStatus({
  stage,
  daysRemaining = 0,
  autoCompleteAt,
  extendable,
  extended,
  afterSaleWindowDays = 0,
  userRole,
  protectionLevel = 'standard',
  onExtendProtection,
  className,
}: OrderProtectionStatusProps) {
  const { t } = useI18n();
  const isDisputed = stage === 'DISPUTED';
  const isCancelable = protectionLevel === 'standard';

  const countdownText = useMemo(() => {
    if (stage !== 'PROTECTION_PERIOD' && stage !== 'DISPUTED') return null;
    if (isDisputed) return t('trust.protection.disputedDesc');
    const days = daysRemaining ?? 0;
    if (userRole === 'buyer') {
      return isCancelable
        ? t('trust.protection.cancelablePeriodDesc', { days })
        : t('trust.protection.daysRemaining', { days });
    }
    return isCancelable
      ? t('trust.protection.cancelableSellerCountdown', { days })
      : t('trust.protection.sellerCountdown', { days });
  }, [stage, daysRemaining, userRole, isDisputed, isCancelable, t]);

  const escrowText = useMemo(() => {
    if (stage !== 'ESCROWED') return null;
    return isCancelable
      ? t('trust.protection.cancelableEscrowedDesc')
      : t('trust.protection.escrowedDesc');
  }, [stage, isCancelable, t]);

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
    countdownText ||
    escrowText ||
    afterSaleText ||
    completedText ||
    autoCompleteText ||
    extensionText;

  if (!hasContent && !isDisputed) return null;

  const Icon = isDisputed ? AlertTriangle : protectionLevel === 'full' ? ShieldCheck : Shield;
  const iconColor = isDisputed ? 'text-warning' : 'text-primary';
  const bgStyle = isDisputed ? 'bg-warning/8 border-warning/20' : 'bg-primary/5 border-primary/15';

  const hasActions =
    stage === 'PROTECTION_PERIOD' &&
    extendable &&
    !extended &&
    userRole === 'buyer' &&
    onExtendProtection;

  const levelStyle = LEVEL_STYLES[protectionLevel];
  const levelLabel = t(LEVEL_I18N[protectionLevel]);

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
            {/* Protection level badge */}
            <span
              className={cn(
                'inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5',
                levelStyle.bg,
                levelStyle.text
              )}
              data-testid="protection-level-badge"
            >
              {levelLabel}
            </span>

            {escrowText && <p className="text-sm font-medium text-foreground">{escrowText}</p>}
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
