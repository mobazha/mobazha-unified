// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useRef, useState } from 'react';
import { ordersApi } from '../services/api/orders';
import type { FiatPaymentSession, FiatPaymentStatus } from '../types/fiat';
import { paymentSessionToFiatSession } from '../utils/transforms/paymentSessionFiat';

export interface CreateQuotedFiatPaymentSessionParams {
  orderId: string;
  vendorPeerID?: string;
  paymentCoin: string;
  paymentSelectionQuoteID: string;
  fiatDescription?: string;
  fiatReturnURL?: string;
  fiatCancelURL?: string;
}

export interface UseQuotedFiatPaymentResult {
  session: FiatPaymentSession | null;
  status: FiatPaymentStatus;
  error: string | null;
  createSession: (
    params: CreateQuotedFiatPaymentSessionParams
  ) => Promise<FiatPaymentSession | null>;
  reset: () => void;
}

/** Creates provider checkout through the quote-bound PaymentSession endpoint. */
export function useQuotedFiatPayment(): UseQuotedFiatPaymentResult {
  const [session, setSession] = useState<FiatPaymentSession | null>(null);
  const [status, setStatus] = useState<FiatPaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const reset = useCallback(() => {
    requestSeq.current += 1;
    setSession(null);
    setStatus('idle');
    setError(null);
  }, []);

  const createSession = useCallback(
    async (params: CreateQuotedFiatPaymentSessionParams): Promise<FiatPaymentSession | null> => {
      const seq = ++requestSeq.current;
      setStatus('creating');
      setError(null);
      setSession(null);
      try {
        const paymentSession = await ordersApi.createOrderPaymentSession({
          orderId: params.orderId,
          paymentCoin: params.paymentCoin,
          vendorPeerID: params.vendorPeerID,
          paymentSelectionQuoteID: params.paymentSelectionQuoteID,
          fiatDescription: params.fiatDescription,
          fiatReturnURL: params.fiatReturnURL,
          fiatCancelURL: params.fiatCancelURL,
        });
        if (seq !== requestSeq.current) return null;
        const mapped = paymentSessionToFiatSession(paymentSession);
        if (!mapped) {
          setError('provider_session_unavailable');
          setStatus('failed');
          return null;
        }
        setSession(mapped);
        setStatus('pending');
        return mapped;
      } catch {
        if (seq !== requestSeq.current) return null;
        setError('payment_session_create_failed');
        setStatus('failed');
        return null;
      }
    },
    []
  );

  return { session, status, error, createSession, reset };
}
