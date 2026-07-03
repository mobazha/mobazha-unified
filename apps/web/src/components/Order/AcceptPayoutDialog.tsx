'use client';

import React, { useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import {
  useI18n,
  isDisputeRulingAvailable,
  type AcceptPayoutPhase,
  type DisplayDispute,
  type DisplayOrderSettlementBreakdown,
} from '@mobazha/core';
import { DisputeRulingSummary } from '@/components/Order/cards/DisputeRulingSummary';

export interface AcceptPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  acceptPayoutPhase?: AcceptPayoutPhase;
  isModerated?: boolean;
  dispute?: DisplayDispute | null;
  settlementBreakdown?: DisplayOrderSettlementBreakdown;
  paymentCoin?: string;
}

function getConfirmLabel(
  t: ReturnType<typeof useI18n>['t'],
  options: { isLoading: boolean; acceptPayoutPhase: AcceptPayoutPhase }
): string {
  const { isLoading, acceptPayoutPhase } = options;
  if (!isLoading) {
    return t('order.actions.acceptPayout');
  }
  if (acceptPayoutPhase === 'releasing') {
    return t('order.acceptPayout.phase.releasing');
  }
  if (acceptPayoutPhase === 'accepting') {
    return t('order.acceptPayout.phase.accepting');
  }
  return t('common.processing');
}

function getPhaseHint(
  t: ReturnType<typeof useI18n>['t'],
  options: { isLoading: boolean; acceptPayoutPhase: AcceptPayoutPhase; isModerated: boolean }
): string | null {
  const { isLoading, acceptPayoutPhase, isModerated } = options;
  if (!isLoading) {
    return isModerated ? t('order.dialogs.acceptPayout.releaseHint') : null;
  }
  if (acceptPayoutPhase === 'releasing') {
    return t('order.acceptPayout.phase.releasingHint');
  }
  if (acceptPayoutPhase === 'accepting') {
    return t('order.acceptPayout.phase.acceptingHint');
  }
  if (isModerated) {
    return t('order.acceptPayout.phase.releasingHint');
  }
  return null;
}

export function AcceptPayoutDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  acceptPayoutPhase = 'idle',
  isModerated = false,
  dispute,
  settlementBreakdown,
  paymentCoin,
}: AcceptPayoutDialogProps) {
  const { t } = useI18n();

  const confirmLabel = useMemo(
    () => getConfirmLabel(t, { isLoading, acceptPayoutPhase }),
    [acceptPayoutPhase, isLoading, t]
  );

  const phaseHint = useMemo(
    () => getPhaseHint(t, { isLoading, acceptPayoutPhase, isModerated }),
    [acceptPayoutPhase, isLoading, isModerated, t]
  );

  const showSummary = Boolean(dispute && isDisputeRulingAvailable(dispute));

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && isLoading) return;
      onOpenChange(newOpen);
    },
    [isLoading, onOpenChange]
  );

  const handleConfirm = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (isLoading) return;
      onConfirm();
    },
    [isLoading, onConfirm]
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid="accept-payout-dialog" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('order.dialogs.acceptPayout.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('order.dialogs.acceptPayout.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {showSummary && dispute ? (
          <DisputeRulingSummary
            dispute={dispute}
            settlementBreakdown={settlementBreakdown}
            paymentCoin={paymentCoin}
          />
        ) : null}

        {phaseHint ? (
          <p
            className="text-xs text-muted-foreground text-center leading-relaxed"
            aria-live="polite"
          >
            {phaseHint}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AcceptPayoutDialog;
