import { describe, expect, it } from 'vitest';
import {
  derivePaymentReadinessFlags,
  derivePaymentReadinessUxTier,
  getPaymentReadinessBlockedCopyKeys,
  isSellerReceiptTimedOut,
  PAYMENT_READINESS_UX_ESCALATION_MS,
  PAYMENT_READINESS_UX_PREPARING_MS,
  shouldShowPaymentReadinessPlaceholder,
  shouldShowPaymentReadinessRecovery,
} from '../../utils/paymentReadinessState';

describe('derivePaymentReadinessFlags', () => {
  it('treats unknown status as not ready while the first poll is in flight', () => {
    const flags = derivePaymentReadinessFlags({
      enabled: true,
      hasFetchedSession: false,
      status: undefined,
    });

    expect(flags.isCheckingReadiness).toBe(true);
    expect(flags.isAwaitingSellerReceipt).toBe(false);
    expect(flags.isReadyToPay).toBe(false);
    expect(flags.shouldPoll).toBe(true);
  });

  it('blocks payment while awaiting seller receipt', () => {
    const flags = derivePaymentReadinessFlags({
      enabled: true,
      hasFetchedSession: true,
      status: 'awaiting_seller_receipt',
    });

    expect(flags.isCheckingReadiness).toBe(false);
    expect(flags.isAwaitingSellerReceipt).toBe(true);
    expect(flags.isReadyToPay).toBe(false);
    expect(flags.shouldPoll).toBe(true);
  });

  it('allows payment for legacy sessions without paymentReadiness projection', () => {
    const flags = derivePaymentReadinessFlags({
      enabled: true,
      hasFetchedSession: true,
      status: undefined,
    });

    expect(flags.isReadyToPay).toBe(true);
    expect(flags.isAwaitingSellerReceipt).toBe(false);
    expect(flags.shouldPoll).toBe(false);
  });

  it('does not infer awaiting seller when session body is missing', () => {
    const flags = derivePaymentReadinessFlags({
      enabled: true,
      hasFetchedSession: true,
      hasPaymentSession: false,
      status: undefined,
    });

    expect(flags.isReadyToPay).toBe(false);
    expect(flags.isAwaitingSellerReceipt).toBe(false);
    expect(flags.shouldPoll).toBe(false);
  });

  it('allows payment only after ready_to_pay', () => {
    const flags = derivePaymentReadinessFlags({
      enabled: true,
      hasFetchedSession: true,
      status: 'ready_to_pay',
    });

    expect(flags.isReadyToPay).toBe(true);
    expect(flags.isAwaitingSellerReceipt).toBe(false);
    expect(flags.shouldPoll).toBe(false);
  });

  it('keeps payment available when polling is disabled', () => {
    const flags = derivePaymentReadinessFlags({
      enabled: false,
      hasFetchedSession: false,
      status: undefined,
    });

    expect(flags.isReadyToPay).toBe(true);
    expect(flags.shouldPoll).toBe(false);
  });
});

describe('isSellerReceiptTimedOut', () => {
  it('returns true after the timeout timestamp', () => {
    expect(
      isSellerReceiptTimedOut('2026-06-01T12:00:00.000Z', Date.parse('2026-06-01T12:00:01.000Z'))
    ).toBe(true);
  });

  it('returns false before the timeout timestamp', () => {
    expect(
      isSellerReceiptTimedOut('2026-06-01T12:00:00.000Z', Date.parse('2026-06-01T11:59:59.000Z'))
    ).toBe(false);
  });
});

describe('derivePaymentReadinessUxTier', () => {
  const startedAt = 1_000_000;

  it('returns none when payment is not blocked', () => {
    expect(
      derivePaymentReadinessUxTier({
        isPaymentBlocked: false,
        waitingStartedAtMs: startedAt,
        nowMs: startedAt + PAYMENT_READINESS_UX_ESCALATION_MS,
      })
    ).toBe('none');
  });

  it('returns preparing while blocked before the wait timer is stamped', () => {
    expect(
      derivePaymentReadinessUxTier({
        isPaymentBlocked: true,
        waitingStartedAtMs: null,
        nowMs: startedAt,
      })
    ).toBe('preparing');
  });

  it('returns preparing during the first UX window', () => {
    expect(
      derivePaymentReadinessUxTier({
        isPaymentBlocked: true,
        waitingStartedAtMs: startedAt,
        nowMs: startedAt + PAYMENT_READINESS_UX_PREPARING_MS - 1,
      })
    ).toBe('preparing');
  });

  it('returns confirming after preparing and before escalation', () => {
    expect(
      derivePaymentReadinessUxTier({
        isPaymentBlocked: true,
        waitingStartedAtMs: startedAt,
        nowMs: startedAt + PAYMENT_READINESS_UX_PREPARING_MS + 1,
      })
    ).toBe('confirming');
  });

  it('returns escalated after the UX escalation threshold', () => {
    expect(
      derivePaymentReadinessUxTier({
        isPaymentBlocked: true,
        waitingStartedAtMs: startedAt,
        nowMs: startedAt + PAYMENT_READINESS_UX_ESCALATION_MS,
      })
    ).toBe('escalated');
  });
});

describe('shouldShowPaymentReadinessRecovery', () => {
  it('shows recovery only on escalated tier', () => {
    expect(shouldShowPaymentReadinessRecovery('escalated')).toBe(true);
    expect(shouldShowPaymentReadinessRecovery('confirming')).toBe(false);
    expect(shouldShowPaymentReadinessRecovery('preparing')).toBe(false);
  });
});

describe('shouldShowPaymentReadinessPlaceholder', () => {
  it('shows placeholder during preparing and confirming tiers', () => {
    expect(shouldShowPaymentReadinessPlaceholder('preparing')).toBe(true);
    expect(shouldShowPaymentReadinessPlaceholder('confirming')).toBe(true);
    expect(shouldShowPaymentReadinessPlaceholder('escalated')).toBe(false);
    expect(shouldShowPaymentReadinessPlaceholder('none')).toBe(false);
  });
});

describe('getPaymentReadinessBlockedCopyKeys', () => {
  it('maps tiers to progressive copy keys', () => {
    expect(getPaymentReadinessBlockedCopyKeys({ tier: 'preparing' })).toEqual({
      titleKey: 'payment.preparingPayment',
      hintKey: 'payment.preparingPaymentHint',
    });
    expect(getPaymentReadinessBlockedCopyKeys({ tier: 'confirming' })).toEqual({
      titleKey: 'payment.confirmingOrder',
      hintKey: 'payment.confirmingOrderHint',
    });
  });

  it('uses recovery copy when escalated or showRecovery is set', () => {
    expect(getPaymentReadinessBlockedCopyKeys({ tier: 'escalated' })).toEqual({
      titleKey: 'payment.sellerReceiptTimedOut',
      hintKey: 'payment.sellerReceiptTimedOutHint',
    });
    expect(getPaymentReadinessBlockedCopyKeys({ tier: 'confirming', showRecovery: true })).toEqual({
      titleKey: 'payment.sellerReceiptTimedOut',
      hintKey: 'payment.sellerReceiptTimedOutHint',
    });
  });
});
