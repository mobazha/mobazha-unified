'use client';

import React, { memo, useMemo } from 'react';
import { useI18n, type DisplayOrder, type CancellationContext } from '@mobazha/core';
import { formatOrderDate } from '@/components/Order/utils';
import { cn } from '@/lib/utils';
import {
  Clock,
  CircleDollarSign,
  PackageCheck,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ShieldAlert,
  Gavel,
} from 'lucide-react';

export interface OrderStatusCardProps {
  displayOrder: DisplayOrder;
  className?: string;
}

interface StatusConfig {
  icon: React.ElementType;
  message: string;
  hint?: string;
  color: string;
  bgColor: string;
  progress: number;
  paymentStepLabel?: string;
}

function resolveCancellationCopy(
  cancellation: CancellationContext | undefined,
  isBuyer: boolean,
  t: (key: string) => string
): Pick<StatusConfig, 'message' | 'hint'> {
  if (!cancellation) {
    return {
      message: t('order.statusCard.cancelled'),
      hint: undefined,
    };
  }

  const { kind, wasFunded, refundConfirmed } = cancellation;

  switch (kind) {
    case 'seller_decline':
      return {
        message: isBuyer
          ? wasFunded
            ? refundConfirmed
              ? t('order.statusCard.declinedBuyerFundedRefunded')
              : t('order.statusCard.declinedBuyerFunded')
            : t('order.statusCard.declinedBuyerUnfunded')
          : wasFunded
            ? refundConfirmed
              ? t('order.statusCard.declinedSellerFundedRefunded')
              : t('order.statusCard.declinedSellerFunded')
            : t('order.statusCard.declinedSellerUnfunded'),
        hint: isBuyer
          ? wasFunded
            ? refundConfirmed
              ? t('order.statusCard.declinedHintBuyerFundedRefunded')
              : t('order.statusCard.declinedHintBuyerFunded')
            : t('order.statusCard.declinedHintBuyerUnfunded')
          : wasFunded
            ? refundConfirmed
              ? t('order.statusCard.declinedHintSellerFundedRefunded')
              : t('order.statusCard.declinedHintSellerFunded')
            : t('order.statusCard.declinedHintSellerUnfunded'),
      };
    case 'payment_verification_timeout':
      return {
        message: isBuyer
          ? t('order.statusCard.paymentVerificationTimeoutBuyer')
          : t('order.statusCard.paymentVerificationTimeoutSeller'),
        hint: isBuyer
          ? t('order.statusCard.paymentVerificationTimeoutHintBuyer')
          : t('order.statusCard.paymentVerificationTimeoutHintSeller'),
      };
    case 'cancelled_paid':
      return {
        message: isBuyer
          ? refundConfirmed
            ? t('order.statusCard.cancelledPaidBuyerRefunded')
            : t('order.statusCard.cancelledPaidBuyer')
          : refundConfirmed
            ? t('order.statusCard.cancelledPaidSellerRefunded')
            : t('order.statusCard.cancelledPaidSeller'),
        hint: isBuyer
          ? refundConfirmed
            ? t('order.statusCard.cancelledPaidHintBuyerRefunded')
            : t('order.statusCard.cancelledPaidHintBuyer')
          : refundConfirmed
            ? t('order.statusCard.cancelledPaidHintSellerRefunded')
            : t('order.statusCard.cancelledPaidHintSeller'),
      };
    case 'cancelled_unpaid':
      return {
        message: isBuyer
          ? t('order.statusCard.cancelledUnpaidBuyer')
          : t('order.statusCard.cancelledUnpaidSeller'),
        hint: isBuyer
          ? t('order.statusCard.cancelledUnpaidHintBuyer')
          : t('order.statusCard.cancelledUnpaidHintSeller'),
      };
    case 'payment_timeout':
    default:
      return {
        message: isBuyer
          ? t('order.statusCard.cancelledBuyer')
          : t('order.statusCard.cancelledSeller'),
        hint: isBuyer
          ? t('order.statusCard.cancelledHintBuyer')
          : t('order.statusCard.cancelledHintSeller'),
      };
  }
}

export const OrderStatusCard = memo(function OrderStatusCard({
  displayOrder: order,
  className,
}: OrderStatusCardProps) {
  const { t, locale } = useI18n();

  const isCryptoPayment = !order.fiatPayment;

  const config = useMemo((): StatusConfig => {
    const isBuyer = order.userRole === 'buyer';
    const isSubmittedAwaitingVerification = !!order.awaitingPaymentVerification;
    const isVerificationFailed = !!order.paymentVerificationFailed;
    const verificationFailureReason = (order.paymentVerificationFailureReason || '')
      .trim()
      .toLowerCase();
    const submittedBuyerKey = t('order.statusCard.paymentSubmittedBuyer');
    const submittedSellerKey = t('order.statusCard.paymentSubmittedSeller');
    const submittedHintKey = t('order.statusCard.paymentSubmittedHint');
    const submittedBuyerMessage =
      submittedBuyerKey === 'order.statusCard.paymentSubmittedBuyer'
        ? t('order.statusCard.pendingBuyer')
        : submittedBuyerKey;
    const submittedSellerMessage =
      submittedSellerKey === 'order.statusCard.paymentSubmittedSeller'
        ? t('order.statusCard.awaitingPaymentSeller')
        : submittedSellerKey;
    const submittedHint =
      submittedHintKey === 'order.statusCard.paymentSubmittedHint'
        ? t('order.statusCard.pendingBuyerConfirmingHint')
        : submittedHintKey;
    const failedReasonHint = (() => {
      switch (verificationFailureReason) {
        case 'address_mismatch':
          return t('order.statusCard.paymentVerificationFailedReasonAddressMismatch');
        case 'timeout':
          return t('order.statusCard.paymentVerificationFailedReasonTimeout');
        case 'provider_failed':
          return t('order.statusCard.paymentVerificationFailedReasonProviderFailed');
        default:
          return t('order.statusCard.paymentVerificationFailedReasonUnknown');
      }
    })();

    switch (order.status) {
      case 'awaiting_payment':
        if (isVerificationFailed) {
          return {
            icon: AlertTriangle,
            message: isBuyer
              ? t('order.statusCard.paymentVerificationFailedBuyer')
              : t('order.statusCard.paymentVerificationFailedSeller'),
            hint: failedReasonHint,
            color: 'text-destructive',
            bgColor: 'bg-destructive/8 border-destructive/20',
            progress: 0,
            paymentStepLabel: t('order.statusCard.stepPaymentRequired'),
          };
        }
        if (isSubmittedAwaitingVerification) {
          return {
            icon: Clock,
            message: isBuyer ? submittedBuyerMessage : submittedSellerMessage,
            hint: isBuyer ? submittedHint : undefined,
            color: 'text-warning',
            bgColor: 'bg-warning/8 border-warning/20',
            progress: 0,
            paymentStepLabel: t('order.statusCard.stepPaymentReview'),
          };
        }
        return {
          icon: CircleDollarSign,
          message: isBuyer
            ? t('order.statusCard.awaitingPaymentBuyer')
            : t('order.statusCard.awaitingPaymentSeller'),
          hint: isBuyer ? t('order.statusCard.awaitingPaymentHint') : undefined,
          color: 'text-destructive',
          bgColor: 'bg-destructive/8 border-destructive/20',
          progress: 0,
          paymentStepLabel: t('order.statusCard.stepPaymentRequired'),
        };
      case 'pending':
      case 'paid':
        return {
          icon: Clock,
          message: isBuyer
            ? t('order.statusCard.pendingBuyer')
            : t('order.statusCard.pendingSeller'),
          hint: isBuyer ? t('order.statusCard.pendingBuyerPaidHint') : undefined,
          color: 'text-warning',
          bgColor: 'bg-warning/8 border-warning/20',
          progress: 1,
        };
      case 'processing':
        return {
          icon: PackageCheck,
          message: isBuyer
            ? t('order.statusCard.processingBuyer')
            : t('order.statusCard.processingSeller'),
          color: 'text-info',
          bgColor: 'bg-info/8 border-info/20',
          progress: 2,
        };
      case 'shipped':
        return {
          icon: Truck,
          message: isBuyer
            ? t('order.statusCard.shippedBuyer')
            : t('order.statusCard.shippedSeller'),
          hint: isBuyer ? t('order.statusCard.shippedHint') : undefined,
          color: 'text-primary',
          bgColor: 'bg-primary/8 border-primary/20',
          progress: 3,
        };
      case 'delivered':
        return {
          icon: CheckCircle2,
          message: isBuyer
            ? t('order.statusCard.deliveredBuyer')
            : t('order.statusCard.deliveredSeller'),
          color: 'text-primary',
          bgColor: 'bg-primary/8 border-primary/20',
          progress: 3,
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          message: t('order.statusCard.completed'),
          color: 'text-success',
          bgColor: 'bg-success/8 border-success/20',
          progress: 4,
        };
      case 'disputed':
        return {
          icon: ShieldAlert,
          message: t('order.statusCard.disputed'),
          hint: isBuyer
            ? t('order.statusCard.disputedHintBuyer')
            : order.userRole === 'seller'
              ? t('order.statusCard.disputedHintSeller')
              : t('order.statusCard.disputedHint'),
          color: 'text-destructive',
          bgColor: 'bg-destructive/8 border-destructive/20',
          progress: -1,
        };
      case 'decided':
        return {
          icon: Gavel,
          message: t('order.statusCard.decided'),
          hint: isBuyer
            ? t('order.statusCard.decidedHintBuyer')
            : order.userRole === 'seller'
              ? t('order.statusCard.decidedHintSeller')
              : t('order.statusCard.decidedHint'),
          color: 'text-primary',
          bgColor: 'bg-primary/8 border-primary/20',
          progress: -1,
        };
      case 'cancelled': {
        const cancellationCopy = resolveCancellationCopy(order.cancellation, isBuyer, t);
        return {
          icon: XCircle,
          message: cancellationCopy.message,
          hint: cancellationCopy.hint,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40',
          progress: -1,
        };
      }
      case 'refunded':
        return {
          icon: RotateCcw,
          message: t('order.statusCard.refunded'),
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50 border-border/50',
          progress: -1,
        };
      default:
        return {
          icon: AlertTriangle,
          message: order.status,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50 border-border/50',
          progress: 0,
        };
    }
  }, [
    order.status,
    order.userRole,
    order.awaitingPaymentVerification,
    order.paymentVerificationFailed,
    order.paymentVerificationFailureReason,
    order.cancellation,
    t,
  ]);

  const stepLabels = useMemo(
    () => [
      config.paymentStepLabel || t('order.statusCard.stepPaid'),
      t('order.statusCard.stepAccepted'),
      t('order.statusCard.stepShipped'),
      t('order.statusCard.stepComplete'),
    ],
    [config.paymentStepLabel, t]
  );

  const Icon = config.icon;
  const isTerminal = config.progress < 0;
  const cancelReason = order.cancelReason;
  const showUserCancelReason =
    !!cancelReason &&
    cancelReason !== 'payment_timeout' &&
    cancelReason !== 'payment_verification_timeout';

  // Payment progress (partial / verified intermediate state) — shown only
  // for crypto payments still in the awaiting/pending verification window
  // where the buyer has deposited something but the verifier has not yet
  // flipped the order to "verified". Hide on terminal states and on the
  // verification-failed branch to avoid mixed-signal UI.
  const paymentProgress = order.paymentProgress;
  const showPaymentProgress =
    !!paymentProgress &&
    paymentProgress.percentage > 0 &&
    isCryptoPayment &&
    !isTerminal &&
    !order.paymentVerificationFailed &&
    (order.status === 'awaiting_payment' || order.status === 'pending');

  const paymentProgressReceivedLabel =
    paymentProgress && showPaymentProgress
      ? t('order.statusCard.paymentProgressReceived', {
          received: paymentProgress.totalReceivedFormatted ?? paymentProgress.totalReceived,
          expected: paymentProgress.expectedAmountFormatted ?? paymentProgress.expectedAmount,
          percentage: paymentProgress.percentage,
        })
      : '';

  const paymentProgressOverpaidLabel =
    paymentProgress && showPaymentProgress && paymentProgress.overpaidAmount
      ? t('order.statusCard.paymentProgressOverpaid', {
          amount: paymentProgress.overpaidAmountFormatted ?? paymentProgress.overpaidAmount,
        })
      : '';

  return (
    <div
      className={cn('rounded-xl border p-3', config.bgColor, className)}
      data-testid="order-status-card"
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 shrink-0', config.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', config.color)}>{config.message}</p>
          {config.hint && <p className="text-xs text-muted-foreground mt-0.5">{config.hint}</p>}
          {isTerminal && showUserCancelReason && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('order.statusCard.reason')}: {cancelReason}
            </p>
          )}
          {isTerminal && order.status === 'cancelled' && order.cancelledAt && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-2">
              <span>
                {t('order.statusCard.cancelledAt')}:{' '}
                {formatOrderDate(order.cancelledAt, { locale, includeSeconds: true })}
              </span>
            </div>
          )}
        </div>
      </div>

      {showPaymentProgress && paymentProgress && (
        <div className="mt-3 px-0.5" data-testid="order-payment-progress">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{t('order.statusCard.paymentProgress')}</span>
            <span className="font-medium text-foreground tabular-nums">
              {paymentProgress.percentage}%
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-muted-foreground/15 overflow-hidden"
            role="progressbar"
            aria-valuenow={paymentProgress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${paymentProgress.percentage}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{paymentProgressReceivedLabel}</p>
          {paymentProgressOverpaidLabel && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              {paymentProgressOverpaidLabel}
            </p>
          )}
        </div>
      )}

      {!isTerminal && (
        <div className="mt-3 px-0.5">
          <div className="flex items-center gap-1">
            {stepLabels.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < config.progress
                    ? 'bg-primary'
                    : i === config.progress
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/15'
                )}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {stepLabels.map((label, i) => (
              <span
                key={i}
                className={cn(
                  'text-[10px] leading-tight',
                  i < config.progress
                    ? 'text-primary font-medium'
                    : i === config.progress
                      ? 'text-primary/60'
                      : 'text-muted-foreground/50'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
