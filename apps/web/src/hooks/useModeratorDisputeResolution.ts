'use client';

import { useCallback, useState } from 'react';
import {
  disputesApi,
  useI18n,
  type ModeratorRulingConstraints,
  type ModeratorRulingDraft,
  type ModeratorRulingPreset,
  type ModeratorRulingValidationErrors,
  createRulingDraftForConstraints,
  createRulingDraftFromPresetWithConstraints,
  isModeratorRulingDraftValid,
  isDisputeClosedFromCase,
  isVendorOrderUnconfirmedFromCase,
  mapModeratorDisputeApiError,
  rulingDraftWithBuyerPercentage,
  rulingDraftWithVendorPercentage,
  validateModeratorRulingDraft,
} from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';

export type ModeratorResolveDecision = ModeratorRulingPreset;

export function useModeratorDisputeResolution(orderId: string, onSuccess?: () => void) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<ModeratorRulingPreset | null>(null);
  const [draft, setDraft] = useState<ModeratorRulingDraft>(createRulingDraftForConstraints());
  const [constraints, setConstraints] = useState<ModeratorRulingConstraints>({
    lockVendorShareAboveZero: false,
  });
  const [vendorNotConfirmed, setVendorNotConfirmed] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ModeratorRulingValidationErrors>({});
  const [isResolving, setIsResolving] = useState(false);
  const [isOpeningSheet, setIsOpeningSheet] = useState(false);

  const openRulingSheet = useCallback(async () => {
    setIsOpeningSheet(true);
    setValidationErrors({});
    try {
      const caseDetails = await disputesApi.getCaseDetails(orderId);
      if (!caseDetails) {
        throw new Error('case details unavailable');
      }
      if (isDisputeClosedFromCase(caseDetails)) {
        toast({
          title: t('order.moderatorRuling.title'),
          description: t('order.moderatorRuling.errors.alreadyClosed'),
        });
        onSuccess?.();
        return;
      }
      const lock = isVendorOrderUnconfirmedFromCase(caseDetails);
      const nextConstraints: ModeratorRulingConstraints = { lockVendorShareAboveZero: lock };
      setVendorNotConfirmed(lock);
      setConstraints(nextConstraints);
      setDraft(createRulingDraftForConstraints(nextConstraints));
      setActivePreset(lock ? 'buyer' : null);
      setIsSheetOpen(true);
    } catch {
      toast({
        title: t('common.error'),
        description: t('order.moderatorRuling.errors.caseDetailsUnavailable'),
        variant: 'destructive',
      });
    } finally {
      setIsOpeningSheet(false);
    }
  }, [orderId, t, toast, onSuccess]);

  const applyPreset = useCallback(
    (preset: ModeratorRulingPreset) => {
      setActivePreset(preset);
      setDraft(createRulingDraftFromPresetWithConstraints(preset, constraints));
      setValidationErrors({});
    },
    [constraints]
  );

  const closeSheet = useCallback(() => {
    if (isResolving) return;
    setIsSheetOpen(false);
    setActivePreset(null);
    setValidationErrors({});
  }, [isResolving]);

  const setBuyerPercentage = useCallback(
    (value: number) => {
      setDraft(prev => rulingDraftWithBuyerPercentage(prev, value, constraints));
      setValidationErrors({});
    },
    [constraints]
  );

  const setVendorPercentage = useCallback(
    (value: number) => {
      setDraft(prev => rulingDraftWithVendorPercentage(prev, value, constraints));
      setValidationErrors({});
    },
    [constraints]
  );

  const setResolution = useCallback((value: string) => {
    setDraft(prev => ({ ...prev, resolution: value }));
    setValidationErrors({});
  }, []);

  const submitRuling = useCallback(async () => {
    const errors = validateModeratorRulingDraft(draft, constraints);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    if (!isModeratorRulingDraftValid(draft, constraints)) return;

    setIsResolving(true);
    try {
      const result = await disputesApi.resolveDispute(
        orderId,
        draft.buyerPercentage,
        draft.vendorPercentage,
        draft.resolution.trim()
      );
      if (!result.success) {
        throw new Error(result.error || t('order.resolveDisputeFailed'));
      }
      toast({
        title: t('order.resolveDispute'),
        description: t('order.disputeResolvedSuccess'),
      });
      setIsSheetOpen(false);
      setActivePreset(null);
      onSuccess?.();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const errorKey = mapModeratorDisputeApiError(raw);
      if (errorKey === 'order.moderatorRuling.errors.alreadyClosed') {
        toast({
          title: t('order.moderatorRuling.title'),
          description: t(errorKey),
        });
        setIsSheetOpen(false);
        setActivePreset(null);
        onSuccess?.();
        return;
      }
      toast({
        title: t('common.error'),
        description: t(errorKey),
        variant: 'destructive',
      });
    } finally {
      setIsResolving(false);
    }
  }, [constraints, draft, orderId, t, toast, onSuccess]);

  return {
    isSheetOpen,
    isResolving,
    isOpeningSheet,
    draft,
    activePreset,
    validationErrors,
    vendorNotConfirmed,
    constraints,
    openRulingSheet,
    applyPreset,
    closeSheet,
    setBuyerPercentage,
    setVendorPercentage,
    setResolution,
    submitRuling,
  };
}
