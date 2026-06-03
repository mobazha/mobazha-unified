'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertTriangle, Shield, Scale } from 'lucide-react';

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
  isModerated?: boolean;
  moderatorName?: string;
  canOpenDispute?: boolean;
  onExtendProtection?: () => Promise<void>;
  onOpenDispute?: () => void;
  /** Moderator ruling submitted; parties must accept before funds release */
  disputeRulingPendingAcceptance?: boolean;
  className?: string;
}

const LEVEL_STYLES: Record<ProtectionLevel, { bg: string; text: string }> = {
  full: { bg: 'bg-success/10', text: 'text-success' },
  standard: { bg: 'bg-primary/10', text: 'text-primary' },
  platform: { bg: 'bg-info/10', text: 'text-info' },
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
  isModerated = false,
  moderatorName,
  canOpenDispute = false,
  onExtendProtection,
  onOpenDispute,
  disputeRulingPendingAcceptance = false,
  className,
}: OrderProtectionStatusProps) {
  const { t } = useI18n();
  const isDisputed = stage === 'DISPUTED';
  const isRulingAwaitingAcceptance = isDisputed && disputeRulingPendingAcceptance;
  const isCancelable = protectionLevel === 'standard';

  const countdownText = useMemo(() => {
    if (stage !== 'PROTECTION_PERIOD' && stage !== 'DISPUTED') return null;
    if (isRulingAwaitingAcceptance) {
      return t('trust.protection.disputeRulingIssued');
    }
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
  }, [stage, daysRemaining, userRole, isDisputed, isRulingAwaitingAcceptance, isCancelable, t]);

  const escrowText = useMemo(() => {
    if (stage !== 'ESCROWED') return null;
    if (userRole === 'seller') {
      return isCancelable
        ? t('trust.protection.cancelableEscrowedSellerDesc')
        : t('trust.protection.escrowedSellerDesc');
    }
    return isCancelable
      ? t('trust.protection.cancelableEscrowedDesc')
      : t('trust.protection.escrowedDesc');
  }, [stage, isCancelable, userRole, t]);

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

  const arbitrationTitle =
    isModerated && !isDisputed ? t('trust.protection.arbitrationReady') : null;
  const arbitrationDesc =
    isModerated && !isDisputed
      ? t('trust.protection.arbitrationReadyDesc', {
          moderator: moderatorName || t('order.moderator'),
        })
      : null;

  const disputedModeratorNote = useMemo(() => {
    if (!isDisputed || !isModerated || !moderatorName) return null;
    if (isRulingAwaitingAcceptance) {
      return t('trust.protection.disputeRulingIssuedModeratorNote', { moderator: moderatorName });
    }
    return t('trust.protection.disputedModeratorAssigned', { moderator: moderatorName });
  }, [isDisputed, isModerated, isRulingAwaitingAcceptance, moderatorName, t]);

  const hasContent =
    countdownText ||
    escrowText ||
    afterSaleText ||
    completedText ||
    autoCompleteText ||
    extensionText ||
    arbitrationTitle ||
    disputedModeratorNote;

  if (!hasContent && !isDisputed) return null;

  const Icon = isRulingAwaitingAcceptance
    ? Scale
    : isDisputed
      ? AlertTriangle
      : protectionLevel === 'full'
        ? ShieldCheck
        : Shield;
  const iconColor = isRulingAwaitingAcceptance
    ? 'text-primary'
    : isDisputed
      ? 'text-warning'
      : 'text-primary';
  const bgStyle = isRulingAwaitingAcceptance
    ? 'bg-primary/8 border-primary/20'
    : isDisputed
      ? 'bg-warning/8 border-warning/20'
      : 'bg-primary/5 border-primary/15';

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
                  isRulingAwaitingAcceptance
                    ? 'text-primary'
                    : isDisputed
                      ? 'text-warning'
                      : 'text-foreground'
                )}
              >
                {countdownText}
              </p>
            )}
            {isRulingAwaitingAcceptance && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {t('trust.protection.disputeRulingIssuedDesc')}
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
            {arbitrationTitle && (
              <div className="mt-2 rounded-lg border border-primary/15 bg-background/60 px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{arbitrationTitle}</p>
                {arbitrationDesc && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {arbitrationDesc}
                  </p>
                )}
                {canOpenDispute && onOpenDispute && (
                  <button
                    type="button"
                    onClick={onOpenDispute}
                    className="mt-2 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-destructive transition-colors"
                    data-testid="order-protection-open-dispute"
                  >
                    {t('order.dispute.haveProblem')}
                  </button>
                )}
              </div>
            )}
            {disputedModeratorNote && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {disputedModeratorNote}
              </p>
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
