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
import { useI18n } from '@mobazha/core';
import type { CompletePhase } from '@/hooks/useOrderDetailPage';

export interface ConfirmReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  completePhase?: CompletePhase;
  isModerated?: boolean;
}

function getConfirmLabel(
  t: ReturnType<typeof useI18n>['t'],
  options: { isLoading: boolean; completePhase: CompletePhase; isModerated: boolean }
): string {
  const { isLoading, completePhase, isModerated } = options;
  if (!isLoading) {
    return isModerated ? t('order.review.submitAndRelease') : t('order.actions.complete');
  }
  if (completePhase === 'releasing') {
    return t('order.complete.phase.releasing');
  }
  if (completePhase === 'completing') {
    return t('order.complete.phase.completing');
  }
  if (isModerated) {
    return t('order.complete.phase.releasing');
  }
  return t('order.complete.phase.completing');
}

function getPhaseHint(
  t: ReturnType<typeof useI18n>['t'],
  options: { isLoading: boolean; completePhase: CompletePhase; isModerated: boolean }
): string | null {
  const { isLoading, completePhase, isModerated } = options;
  if (!isLoading) {
    return null;
  }
  if (completePhase === 'releasing') {
    return t('order.complete.phase.releasing');
  }
  if (completePhase === 'completing') {
    return t('order.complete.phase.completing');
  }
  if (isModerated) {
    return t('order.complete.phase.releasing');
  }
  return t('order.complete.phase.completing');
}

export function ConfirmReceiptDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  completePhase = 'idle',
  isModerated = false,
}: ConfirmReceiptDialogProps) {
  const { t } = useI18n();

  const confirmLabel = useMemo(
    () => getConfirmLabel(t, { isLoading, completePhase, isModerated }),
    [completePhase, isLoading, isModerated, t]
  );

  const phaseHint = useMemo(
    () => getPhaseHint(t, { isLoading, completePhase, isModerated }),
    [completePhase, isLoading, isModerated, t]
  );

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
      <AlertDialogContent data-testid="confirm-receipt-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('order.dialogs.completeOrder.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {isModerated
              ? t('order.dialogs.completeOrder.moderatedDescription')
              : t('order.dialogs.completeOrder.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {phaseHint && (
          <p className="text-xs text-primary text-center -mt-2" aria-live="polite">
            {phaseHint}
          </p>
        )}
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

export default ConfirmReceiptDialog;
