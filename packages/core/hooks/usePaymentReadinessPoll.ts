/**
 * Polls payment-session readiness and listens for paymentReadiness WebSocket pushes.
 * Used on the checkout payment page while waiting for seller ORDER_OPEN receipt.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ordersApi } from '../services/api/orders';
import { onWebSocketMessage, type WebSocketMessage } from '../services/websocket';
import type { PaymentReadinessView, PaymentSession } from '../types/paymentSession';
import {
  derivePaymentReadinessFlags,
  derivePaymentReadinessUxTier,
  PAYMENT_READINESS_UX_ESCALATION_MS,
  PAYMENT_READINESS_UX_PREPARING_MS,
  type PaymentReadinessUxTier,
  shouldShowPaymentReadinessRecovery,
} from '../utils/paymentReadinessState';

export type PaymentReadinessPollStatus = PaymentReadinessView['status'] | undefined;

export interface UsePaymentReadinessPollOptions {
  enabled?: boolean;
  /** Seller store peerID — required for cross-store payment-session polling in SaaS mode. */
  vendorPeerID?: string;
}

export interface UsePaymentReadinessPollReturn {
  paymentSession: PaymentSession | null;
  paymentReadiness: PaymentReadinessView | undefined;
  status: PaymentReadinessPollStatus;
  /** Set when payment-session fetch failed; must not be shown as seller-receipt waiting. */
  readinessFetchError: string | null;
  /** True while a payment-session request is in flight (distinct from blocked/waiting UX). */
  isFetchingSession: boolean;
  isCheckingReadiness: boolean;
  isAwaitingSellerReceipt: boolean;
  isReadyToPay: boolean;
  /** @deprecated Prefer readinessUxTier === 'escalated' for recovery UI. */
  sellerReceiptTimedOut: boolean;
  readinessUxTier: PaymentReadinessUxTier;
  showReadinessRecovery: boolean;
  refresh: () => Promise<PaymentSession | null>;
}

function matchesPaymentReadinessMessage(message: WebSocketMessage, orderId: string): boolean {
  if (message.type !== 'paymentReadiness') return false;
  const data = message.data as { paymentReadiness?: { orderID?: string } } | undefined;
  return data?.paymentReadiness?.orderID === orderId;
}

export function usePaymentReadinessPoll(
  orderId: string | undefined,
  options: UsePaymentReadinessPollOptions = {}
): UsePaymentReadinessPollReturn {
  const enabled = options.enabled !== false && Boolean(orderId);
  const vendorPeerID = options.vendorPeerID?.trim();
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [hasFetchedSession, setHasFetchedSession] = useState(false);
  const [isFetchingSession, setIsFetchingSession] = useState(false);
  const [readinessFetchError, setReadinessFetchError] = useState<string | null>(null);
  const [waitingStartedAtMs, setWaitingStartedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const refreshRef = useRef<() => Promise<PaymentSession | null>>(async () => null);

  const refresh = useCallback(async (): Promise<PaymentSession | null> => {
    if (!orderId) return null;
    setIsFetchingSession(true);
    try {
      const session = await ordersApi.getOrderPaymentSession(orderId, {
        vendorPeerID,
      });
      if (session == null) {
        setReadinessFetchError('payment session not found');
        setHasFetchedSession(false);
        setPaymentSession(null);
        return null;
      }
      setReadinessFetchError(null);
      setHasFetchedSession(true);
      setPaymentSession(session);
      return session;
    } catch (err) {
      setReadinessFetchError(err instanceof Error ? err.message : 'payment session fetch failed');
      setHasFetchedSession(false);
      setPaymentSession(null);
      return null;
    } finally {
      setIsFetchingSession(false);
    }
  }, [orderId, vendorPeerID]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !orderId) return;

    let cancelled = false;
    const bootstrapId = window.setTimeout(() => {
      setHasFetchedSession(false);
      setReadinessFetchError(null);
      setPaymentSession(null);
      void refresh().finally(() => {
        if (cancelled) return;
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(bootstrapId);
    };
  }, [enabled, orderId, refresh]);

  const activeSession = enabled ? paymentSession : null;
  const activeFetchError = enabled ? readinessFetchError : null;
  const activeHasFetchedSession = enabled && hasFetchedSession;
  const activeIsFetchingSession = enabled && isFetchingSession;

  const paymentReadiness = activeSession?.paymentReadiness;
  const status = paymentReadiness?.status;
  const retryAfterSeconds = paymentReadiness?.retryAfterSeconds ?? 2;
  const sellerReceiptTimeoutAt = paymentReadiness?.sellerReceiptTimeoutAt;

  const {
    isCheckingReadiness: baseCheckingReadiness,
    isAwaitingSellerReceipt,
    isReadyToPay,
    sellerReceiptTimedOut,
    shouldPoll: baseShouldPoll,
  } = derivePaymentReadinessFlags({
    enabled,
    hasFetchedSession: activeHasFetchedSession,
    hasPaymentSession: activeSession != null,
    status,
    sellerReceiptTimeoutAt,
    nowMs,
  });

  const isCheckingReadiness = activeFetchError
    ? false
    : baseCheckingReadiness || activeIsFetchingSession;
  const shouldPoll = activeFetchError ? false : baseShouldPoll;

  const isPaymentBlocked =
    !activeFetchError &&
    (baseCheckingReadiness || activeIsFetchingSession || isAwaitingSellerReceipt);

  useEffect(() => {
    if (!isPaymentBlocked) {
      const resetId = window.setTimeout(() => setWaitingStartedAtMs(null), 0);
      return () => window.clearTimeout(resetId);
    }

    const stampId = window.setTimeout(() => {
      setWaitingStartedAtMs(prev => prev ?? Date.now());
    }, 0);
    return () => window.clearTimeout(stampId);
  }, [isPaymentBlocked]);

  useEffect(() => {
    if (!isPaymentBlocked || waitingStartedAtMs == null) return;

    const refreshNow = () => setNowMs(Date.now());
    const elapsed = Date.now() - waitingStartedAtMs;
    const timers: number[] = [];

    const schedule = (targetMs: number) => {
      const delay = targetMs - elapsed;
      if (delay > 0) {
        timers.push(window.setTimeout(refreshNow, delay + 50));
      }
    };

    schedule(PAYMENT_READINESS_UX_PREPARING_MS);
    schedule(PAYMENT_READINESS_UX_ESCALATION_MS);

    return () => {
      timers.forEach(id => window.clearTimeout(id));
    };
  }, [isPaymentBlocked, waitingStartedAtMs]);

  const readinessUxTier = derivePaymentReadinessUxTier({
    isPaymentBlocked,
    waitingStartedAtMs,
    nowMs,
  });
  const showReadinessRecovery = shouldShowPaymentReadinessRecovery(readinessUxTier);

  useEffect(() => {
    if (!shouldPoll) return;

    const intervalMs = Math.min(Math.max(retryAfterSeconds, 1), 5) * 1000;
    const intervalId = window.setInterval(() => {
      void refreshRef.current();
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [retryAfterSeconds, shouldPoll]);

  useEffect(() => {
    if (!enabled || !orderId) return;

    const unsubscribe = onWebSocketMessage((message: WebSocketMessage) => {
      if (matchesPaymentReadinessMessage(message, orderId)) {
        void refreshRef.current();
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, orderId]);

  return {
    paymentSession: activeSession,
    paymentReadiness,
    status,
    readinessFetchError: activeFetchError,
    isFetchingSession: activeIsFetchingSession,
    isCheckingReadiness,
    isAwaitingSellerReceipt,
    isReadyToPay,
    sellerReceiptTimedOut,
    readinessUxTier,
    showReadinessRecovery,
    refresh,
  };
}
