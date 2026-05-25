'use client';

import React, { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  getOrderActions,
  getPrimaryAction,
  getSecondaryActions,
  getActionButtonConfig,
  useI18n,
  type OrderAction,
  type UserRole,
  type OrderState,
} from '@mobazha/core';

export interface OrderActionSheetProps {
  orderState: OrderState;
  userRole: UserRole;
  timestamp: string;
  isModerated?: boolean;
  isShipped?: boolean;
  paymentMethod?: string;
  fundsReleasedAtConfirmation?: boolean;
  hasRated?: boolean;
  inAfterSaleWindow?: boolean;
  hasAfterSaleDispute?: boolean;
  contractType?: string;
  hasPreconfiguredDigitalAssets?: boolean;
  digitalDeliveryStatus?: string | null;
  canSyncDigitalDelivery?: boolean;
  canRetryDigitalDelivery?: boolean;
  manualDigitalFallbackAllowed?: boolean;
  isTransitioning?: boolean;
  onAction: (action: OrderAction) => void;
  className?: string;
}

/**
 * Mobile-optimized bottom action bar for order operations.
 * Renders the primary action as a full-width prominent button,
 * with secondary actions as smaller outline buttons below.
 */
export const OrderActionSheet = memo(function OrderActionSheet({
  orderState,
  userRole,
  timestamp: _timestamp,
  isModerated,
  isShipped,
  paymentMethod,
  fundsReleasedAtConfirmation = false,
  hasRated,
  inAfterSaleWindow = false,
  hasAfterSaleDispute = false,
  contractType,
  hasPreconfiguredDigitalAssets = false,
  digitalDeliveryStatus,
  canSyncDigitalDelivery = false,
  canRetryDigitalDelivery = false,
  manualDigitalFallbackAllowed = false,
  isTransitioning = false,
  onAction,
  className,
}: OrderActionSheetProps) {
  const { t } = useI18n();
  const actions = useMemo(
    () =>
      getOrderActions(orderState, userRole, {
        isModerated,
        isShipped,
        paymentMethod,
        hasRated,
        inAfterSaleWindow,
        hasAfterSaleDispute,
        fundsReleasedAtConfirmation,
      }),
    [
      orderState,
      userRole,
      isModerated,
      isShipped,
      paymentMethod,
      hasRated,
      inAfterSaleWindow,
      hasAfterSaleDispute,
      fundsReleasedAtConfirmation,
    ]
  );
  const visibleActions = useMemo(() => actions.filter(action => action !== 'Dispute'), [actions]);

  const primaryAction = useMemo(() => getPrimaryAction(visibleActions), [visibleActions]);
  const secondaryActions = useMemo(() => getSecondaryActions(visibleActions), [visibleActions]);
  const primaryConfig = useMemo(
    () =>
      primaryAction
        ? getActionButtonConfig(primaryAction, userRole, {
            contractType,
            hasPreconfiguredDigitalAssets,
            digitalDeliveryStatus,
            canSyncDigitalDelivery,
            canRetryDigitalDelivery,
            manualDigitalFallbackAllowed,
          })
        : null,
    [
      primaryAction,
      userRole,
      contractType,
      hasPreconfiguredDigitalAssets,
      digitalDeliveryStatus,
      canSyncDigitalDelivery,
      canRetryDigitalDelivery,
      manualDigitalFallbackAllowed,
    ]
  );

  if (visibleActions.length === 0 && !isTransitioning) return null;

  if (isTransitioning) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${className ?? ''}`}
      >
        <div className="flex items-center justify-center gap-2 h-12">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t('order.actions.updatingStatus')}</span>
        </div>
      </div>
    );
  }

  const getActionLabel = (action: OrderAction, fallback: string): string => {
    if (action === 'Ship' && contractType === 'DIGITAL_GOOD') {
      if (canSyncDigitalDelivery) {
        return t('order.actions.syncDelivery');
      }
      if (canRetryDigitalDelivery) {
        return t('order.actions.retryDigitalDelivery');
      }
      if (manualDigitalFallbackAllowed) {
        return t('order.actions.deliverDigital');
      }
      return t('order.actions.deliveryPending');
    }

    const labelMap: Partial<Record<OrderAction, string>> = {
      Pay: t('order.actions.pay'),
      Cancel: t('order.actions.cancel'),
      Dispute: t('order.actions.dispute'),
      AfterSaleDispute: t('order.actions.reportIssue'),
      Complete: t('order.actions.complete'),
      WriteReview: t('order.actions.writeReview'),
      Accept: t('order.actions.accept'),
      Decline: t('order.actions.decline'),
      Refund: t('order.actions.refund'),
      Claim: t('order.actions.claim'),
      AcceptPayout: t('order.actions.acceptPayout'),
    };

    return labelMap[action] || fallback;
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${className ?? ''}`}
    >
      {primaryAction && primaryConfig && (
        <Button
          onClick={() => onAction(primaryAction)}
          variant={primaryConfig.variant as 'default' | 'destructive' | 'outline'}
          className="w-full h-12 text-[15px] font-semibold mb-2"
        >
          {getActionLabel(primaryAction, primaryConfig.label)}
        </Button>
      )}

      {secondaryActions.length > 0 && (
        <div className="flex gap-2">
          {secondaryActions.map(action => {
            const config = getActionButtonConfig(action, userRole, {
              contractType,
              hasPreconfiguredDigitalAssets,
              digitalDeliveryStatus,
              canSyncDigitalDelivery,
              canRetryDigitalDelivery,
              manualDigitalFallbackAllowed,
            });
            return (
              <Button
                key={action}
                onClick={() => onAction(action)}
                variant="outline"
                size="sm"
                className="flex-1 h-10 text-sm"
              >
                {getActionLabel(action, config.label)}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
});
