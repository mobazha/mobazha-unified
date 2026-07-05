// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ordersApi } from '../services/api/orders';
import type { PaymentSelectionQuote } from '../types/paymentSelectionQuote';
import { isPaymentSelectionQuoteExpired } from '../utils/paymentSelectionQuote';

const DEBOUNCE_MS = 300;

export interface UsePaymentSelectionQuoteOptions {
  enabled?: boolean;
  orderID?: string;
  paymentCoin?: string;
  vendorPeerID?: string;
  /** When false (normal orders), hook stays idle and returns no quote. */
  isDealBacked?: boolean;
}

export interface UsePaymentSelectionQuoteReturn {
  quote: PaymentSelectionQuote | null;
  loading: boolean;
  error: string | null;
  expired: boolean;
  retry: () => Promise<void>;
  /** Authoritative quote id safe to pass to payment-session when true. */
  canUseQuote: boolean;
  paymentSelectionQuoteID: string | undefined;
}

export function usePaymentSelectionQuote(
  options: UsePaymentSelectionQuoteOptions = {}
): UsePaymentSelectionQuoteReturn {
  const { enabled = true, orderID, paymentCoin, vendorPeerID, isDealBacked = false } = options;

  const active =
    enabled && isDealBacked && Boolean(orderID?.trim()) && Boolean(paymentCoin?.trim());

  const [quote, setQuote] = useState<PaymentSelectionQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const requestSeq = useRef(0);
  const fetchRef = useRef<() => Promise<void>>(async () => {});

  const fetchQuote = useCallback(async () => {
    const resolvedOrderID = orderID?.trim();
    const resolvedPaymentCoin = paymentCoin?.trim();
    if (!active || !resolvedOrderID || !resolvedPaymentCoin) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setQuote(null);

    try {
      const nextQuote = await ordersApi.createOrderPaymentSelectionQuote({
        orderId: resolvedOrderID,
        paymentCoin: resolvedPaymentCoin,
        vendorPeerID,
      });
      if (seq !== requestSeq.current) return;
      setNow(Date.now());
      setQuote(nextQuote);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setQuote(null);
      setError(err instanceof Error ? err.message : 'Failed to load payment quote');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [active, orderID, paymentCoin, vendorPeerID]);

  useEffect(() => {
    fetchRef.current = fetchQuote;
  }, [fetchQuote]);

  useEffect(() => {
    if (!active) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchRef.current();
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [active, orderID, paymentCoin, vendorPeerID]);

  useEffect(() => {
    if (!quote?.expiresAt) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [quote?.expiresAt]);

  const expired = active && quote != null && isPaymentSelectionQuoteExpired(quote, now);
  const canUseQuote = active && quote != null && !loading && !error && !expired;

  const retry = useCallback(async () => {
    await fetchRef.current();
  }, []);

  return {
    quote: active ? quote : null,
    loading: active ? loading : false,
    error: active ? error : null,
    expired,
    retry,
    canUseQuote,
    paymentSelectionQuoteID: canUseQuote ? quote?.id : undefined,
  };
}
