import type { PaymentReadinessStatus } from '../types/paymentSession';

export interface PaymentReadinessFlags {
  isCheckingReadiness: boolean;
  isAwaitingSellerReceipt: boolean;
  isReadyToPay: boolean;
  sellerReceiptTimedOut: boolean;
  shouldPoll: boolean;
}

/** UX tier for progressive disclosure while payment readiness is blocked. */
export type PaymentReadinessUxTier = 'none' | 'preparing' | 'confirming' | 'escalated';

/** Light skeleton only — typical SaaS happy path resolves within this window. */
export const PAYMENT_READINESS_UX_PREPARING_MS = 800;

/** Soft waiting copy before surfacing seller-receipt recovery actions. */
export const PAYMENT_READINESS_UX_ESCALATION_MS = 30_000;

export function isSellerReceiptTimedOut(
  sellerReceiptTimeoutAt: string | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!sellerReceiptTimeoutAt) return false;
  const timeoutMs = Date.parse(sellerReceiptTimeoutAt);
  return Number.isFinite(timeoutMs) && nowMs > timeoutMs;
}

export function derivePaymentReadinessFlags(params: {
  enabled: boolean;
  hasFetchedSession: boolean;
  /** False when GET succeeded with 404 / empty body. */
  hasPaymentSession?: boolean;
  status: PaymentReadinessStatus | undefined;
  sellerReceiptTimeoutAt?: string;
  nowMs?: number;
}): PaymentReadinessFlags {
  const { enabled, hasFetchedSession, status, sellerReceiptTimeoutAt, nowMs } = params;
  const hasPaymentSession = params.hasPaymentSession !== false;

  if (!enabled) {
    return {
      isCheckingReadiness: false,
      isAwaitingSellerReceipt: false,
      isReadyToPay: true,
      sellerReceiptTimedOut: false,
      shouldPoll: false,
    };
  }

  const isCheckingReadiness = !hasFetchedSession;
  const isAwaitingSellerReceipt =
    hasFetchedSession && hasPaymentSession && status === 'awaiting_seller_receipt';
  const isReadyToPay =
    hasFetchedSession && hasPaymentSession && (status === 'ready_to_pay' || status === undefined);
  const sellerReceiptTimedOut =
    isAwaitingSellerReceipt && isSellerReceiptTimedOut(sellerReceiptTimeoutAt, nowMs);
  const shouldPoll = isCheckingReadiness || isAwaitingSellerReceipt;

  return {
    isCheckingReadiness,
    isAwaitingSellerReceipt,
    isReadyToPay,
    sellerReceiptTimedOut,
    shouldPoll,
  };
}

/** i18n keys under `payment.*` for blocked-state copy (title + hint). */
export interface PaymentReadinessBlockedCopyKeys {
  titleKey:
    | 'payment.preparingPayment'
    | 'payment.confirmingOrder'
    | 'payment.sellerReceiptTimedOut'
    | 'payment.awaitingSellerReceipt';
  hintKey:
    | 'payment.preparingPaymentHint'
    | 'payment.confirmingOrderHint'
    | 'payment.sellerReceiptTimedOutHint'
    | 'payment.awaitingSellerReceiptHint';
}

export function getPaymentReadinessBlockedCopyKeys(params: {
  tier: PaymentReadinessUxTier;
  showRecovery?: boolean;
}): PaymentReadinessBlockedCopyKeys {
  const { tier, showRecovery = tier === 'escalated' } = params;

  if (showRecovery) {
    return {
      titleKey: 'payment.sellerReceiptTimedOut',
      hintKey: 'payment.sellerReceiptTimedOutHint',
    };
  }

  switch (tier) {
    case 'preparing':
      return {
        titleKey: 'payment.preparingPayment',
        hintKey: 'payment.preparingPaymentHint',
      };
    case 'confirming':
      return {
        titleKey: 'payment.confirmingOrder',
        hintKey: 'payment.confirmingOrderHint',
      };
    case 'escalated':
      return {
        titleKey: 'payment.sellerReceiptTimedOut',
        hintKey: 'payment.sellerReceiptTimedOutHint',
      };
    default:
      return {
        titleKey: 'payment.preparingPayment',
        hintKey: 'payment.preparingPaymentHint',
      };
  }
}

export function shouldShowPaymentReadinessPlaceholder(tier: PaymentReadinessUxTier): boolean {
  return tier === 'preparing' || tier === 'confirming';
}

export function derivePaymentReadinessUxTier(params: {
  isPaymentBlocked: boolean;
  waitingStartedAtMs: number | null;
  nowMs?: number;
}): PaymentReadinessUxTier {
  const { isPaymentBlocked, waitingStartedAtMs, nowMs = Date.now() } = params;
  if (!isPaymentBlocked) {
    return 'none';
  }
  if (waitingStartedAtMs == null) {
    return 'preparing';
  }

  const elapsed = nowMs - waitingStartedAtMs;
  if (elapsed < PAYMENT_READINESS_UX_PREPARING_MS) {
    return 'preparing';
  }
  if (elapsed < PAYMENT_READINESS_UX_ESCALATION_MS) {
    return 'confirming';
  }
  return 'escalated';
}

export function shouldShowPaymentReadinessRecovery(tier: PaymentReadinessUxTier): boolean {
  return tier === 'escalated';
}
