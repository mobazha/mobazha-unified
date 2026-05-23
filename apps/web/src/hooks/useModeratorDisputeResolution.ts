'use client';

import { useCallback, useState } from 'react';
import { disputesApi, useI18n } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';

export type ModeratorResolveDecision = 'buyer' | 'seller' | 'split';

export function useModeratorDisputeResolution(orderId: string, onSuccess?: () => void) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [pendingDecision, setPendingDecision] = useState<ModeratorResolveDecision | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const requestResolve = useCallback((decision: ModeratorResolveDecision) => {
    setPendingDecision(decision);
  }, []);

  const cancelResolve = useCallback(() => {
    setPendingDecision(null);
  }, []);

  const confirmResolve = useCallback(async () => {
    if (!pendingDecision) return;

    const buyerPercentage =
      pendingDecision === 'buyer' ? 100 : pendingDecision === 'seller' ? 0 : 50;
    const vendorPercentage =
      pendingDecision === 'seller' ? 100 : pendingDecision === 'buyer' ? 0 : 50;
    const resolution =
      pendingDecision === 'buyer'
        ? t('order.resolveDisputeBuyerDesc')
        : pendingDecision === 'seller'
          ? t('order.resolveDisputeSellerDesc')
          : t('order.resolveDisputeSplitDesc');

    setIsResolving(true);
    try {
      const result = await disputesApi.resolveDispute(
        orderId,
        buyerPercentage,
        vendorPercentage,
        resolution
      );
      if (!result.success) {
        throw new Error(result.error || t('order.resolveDisputeFailed'));
      }
      toast({
        title: t('order.resolveDispute'),
        description: t('order.disputeResolvedSuccess'),
      });
      onSuccess?.();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: `${t('order.resolveDisputeFailed')}${
          err instanceof Error ? err.message : String(err)
        }`,
        variant: 'destructive',
      });
    } finally {
      setIsResolving(false);
      setPendingDecision(null);
    }
  }, [pendingDecision, orderId, t, toast, onSuccess]);

  const confirmDescription =
    pendingDecision === 'buyer'
      ? t('order.resolveDisputeBuyerDesc')
      : pendingDecision === 'seller'
        ? t('order.resolveDisputeSellerDesc')
        : pendingDecision === 'split'
          ? t('order.resolveDisputeSplitDesc')
          : '';

  return {
    pendingDecision,
    isResolving,
    requestResolve,
    confirmResolve,
    cancelResolve,
    confirmDescription,
  };
}
