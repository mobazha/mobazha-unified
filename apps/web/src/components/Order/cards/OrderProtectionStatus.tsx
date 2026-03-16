'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { Lock, Truck, Timer, CheckCircle2, AlertTriangle } from 'lucide-react';

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

const STAGES = [
  { key: 'escrowed', icon: Lock },
  { key: 'shipping', icon: Truck },
  { key: 'protectionPeriod', icon: Timer },
  { key: 'completed', icon: CheckCircle2 },
] as const;

function getActiveStepIndex(stage: OrderProtectionStatusProps['stage']): number {
  switch (stage) {
    case 'ESCROWED':
      return 0;
    case 'SHIPPING':
      return 1;
    case 'PROTECTION_PERIOD':
    case 'DISPUTED':
      return 2;
    case 'COMPLETED':
    case 'AFTER_SALE_WINDOW':
      return 3;
    default:
      return 0;
  }
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
  const activeStep = getActiveStepIndex(stage);
  const isDisputed = stage === 'DISPUTED';

  const stageLabels = useMemo(() => STAGES.map(s => t(`trust.protection.${s.key}`)), [t]);

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

  const actionHints = useMemo(() => {
    if (stage !== 'PROTECTION_PERIOD' || userRole !== 'buyer') return null;
    return (
      <p className="text-xs text-muted-foreground mt-1">
        {t('trust.protection.confirmEarly')} · {t('trust.protection.reportIssue')}
      </p>
    );
  }, [stage, userRole, t]);

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

  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        isDisputed ? 'bg-warning/8 border-warning/20' : 'bg-card border-border',
        className
      )}
      data-testid="order-protection-status"
    >
      {isDisputed && (
        <div className="flex items-center gap-2 mb-3 text-warning">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">{t('trust.protection.disputed')}</span>
        </div>
      )}

      {/* Desktop: horizontal 4-step progress bar */}
      <div className="hidden md:block">
        <div className="flex items-center gap-1 px-0.5">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < activeStep || stage === 'COMPLETED' || stage === 'AFTER_SALE_WINDOW'
                  ? 'bg-success'
                  : i === activeStep && isDisputed
                    ? 'bg-warning'
                    : i === activeStep
                      ? 'bg-primary'
                      : 'bg-muted-foreground/15'
              )}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 gap-1">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const isCompleted =
              i < activeStep || stage === 'COMPLETED' || stage === 'AFTER_SALE_WINDOW';
            const isActive = i === activeStep && !isDisputed;
            const isActiveDisputed = i === activeStep && isDisputed;

            return (
              <div
                key={s.key}
                className={cn(
                  'flex flex-col items-center flex-1 min-w-0',
                  isCompleted && 'text-success',
                  isActive && 'text-primary',
                  isActiveDisputed && 'text-warning',
                  !isCompleted && !isActive && !isActiveDisputed && 'text-muted-foreground/50'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 mb-0.5" />
                <span
                  className={cn(
                    'text-[10px] leading-tight text-center truncate max-w-full',
                    (isCompleted || isActive || isActiveDisputed) && 'font-medium'
                  )}
                >
                  {stageLabels[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: compact vertical layout */}
      <div className="md:hidden flex flex-col gap-2">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const isCompleted =
            i < activeStep || stage === 'COMPLETED' || stage === 'AFTER_SALE_WINDOW';
          const isActive = i === activeStep && !isDisputed;
          const isActiveDisputed = i === activeStep && isDisputed;

          return (
            <div
              key={s.key}
              className={cn(
                'flex items-center gap-2',
                isCompleted && 'text-success',
                isActive && 'text-primary',
                isActiveDisputed && 'text-warning',
                !isCompleted && !isActive && !isActiveDisputed && 'text-muted-foreground/50'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                  isCompleted && 'bg-success/15',
                  isActive && 'bg-primary/15',
                  isActiveDisputed && 'bg-warning/15',
                  !isCompleted && !isActive && !isActiveDisputed && 'bg-muted/30'
                )}
              >
                <Icon className="w-3 h-3" />
              </div>
              <span
                className={cn(
                  'text-xs',
                  isCompleted && 'font-medium',
                  isActive && 'font-medium',
                  isActiveDisputed && 'font-medium'
                )}
              >
                {stageLabels[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Countdown / action hints / completion message */}
      {(countdownText ||
        actionHints ||
        afterSaleText ||
        completedText ||
        autoCompleteText ||
        extensionText) && (
        <div className="mt-3 pt-2 border-t border-border">
          {countdownText && (
            <p
              className={cn('text-sm font-medium', isDisputed ? 'text-warning' : 'text-foreground')}
            >
              {countdownText}
            </p>
          )}
          {autoCompleteText && (
            <p className="text-xs text-muted-foreground mt-1">{autoCompleteText}</p>
          )}
          {extensionText && (
            <p
              className={cn(
                'text-xs mt-1',
                extended ? 'text-primary font-medium' : 'text-muted-foreground'
              )}
            >
              {extensionText}
            </p>
          )}
          {stage === 'PROTECTION_PERIOD' &&
            extendable &&
            !extended &&
            userRole === 'buyer' &&
            onExtendProtection && (
              <button
                type="button"
                onClick={handleExtend}
                disabled={extending}
                className={cn(
                  'mt-2 text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                  'bg-primary/10 text-primary hover:bg-primary/20',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {extending ? t('common.loading') : t('trust.protection.extendButton')}
              </button>
            )}
          {completedText && <p className="text-sm font-medium text-success">{completedText}</p>}
          {actionHints}
          {afterSaleText && <p className="text-xs text-muted-foreground mt-1">{afterSaleText}</p>}
        </div>
      )}
    </div>
  );
});
