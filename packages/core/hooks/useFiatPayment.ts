'use client';

import { useState, useCallback, useRef } from 'react';
import * as fiatApi from '../services/api/fiat';
import type {
  FiatPaymentSession,
  FiatPaymentStatus,
  FiatPaymentResult,
  CreateFiatPaymentParams,
  FiatProviderID,
} from '../types/fiat';

interface UseFiatPaymentResult {
  session: FiatPaymentSession | null;
  status: FiatPaymentStatus;
  result: FiatPaymentResult | null;
  error: string | null;
  createSession: (
    vendorPeerID: string,
    provider: FiatProviderID,
    params: CreateFiatPaymentParams
  ) => Promise<FiatPaymentSession | null>;
  captureSession: (
    vendorPeerID: string,
    provider: FiatProviderID,
    sessionID: string
  ) => Promise<FiatPaymentResult | null>;
  reset: () => void;
}

/**
 * Manages the lifecycle of a fiat payment session:
 * createSession → (user interacts with Stripe/PayPal) → captureSession → done
 *
 * Stripe auto-captures, so captureSession is optional for Stripe.
 * PayPal requires explicit capture after buyer approval.
 */
export function useFiatPayment(): UseFiatPaymentResult {
  const [session, setSession] = useState<FiatPaymentSession | null>(null);
  const [status, setStatus] = useState<FiatPaymentStatus>('idle');
  const [result, setResult] = useState<FiatPaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setSession(null);
    setStatus('idle');
    setResult(null);
    setError(null);
    abortRef.current = false;
  }, []);

  const createSession = useCallback(
    async (
      vendorPeerID: string,
      provider: FiatProviderID,
      params: CreateFiatPaymentParams
    ): Promise<FiatPaymentSession | null> => {
      setStatus('creating');
      setError(null);
      try {
        const sess = await fiatApi.createPayment(vendorPeerID, provider, params);
        if (abortRef.current) return null;
        setSession(sess);
        setStatus('pending');
        return sess;
      } catch (err) {
        if (abortRef.current) return null;
        const msg = err instanceof Error ? err.message : 'Failed to create payment session';
        setError(msg);
        setStatus('failed');
        return null;
      }
    },
    []
  );

  const captureSession = useCallback(
    async (
      vendorPeerID: string,
      provider: FiatProviderID,
      sessionID: string
    ): Promise<FiatPaymentResult | null> => {
      setStatus('processing');
      setError(null);
      try {
        const res = await fiatApi.capturePayment(vendorPeerID, provider, sessionID);
        if (abortRef.current) return null;
        setResult(res);
        setStatus(res.status === 'succeeded' ? 'succeeded' : 'failed');
        return res;
      } catch (err) {
        if (abortRef.current) return null;
        const msg = err instanceof Error ? err.message : 'Failed to capture payment';
        setError(msg);
        setStatus('failed');
        return null;
      }
    },
    []
  );

  return {
    session,
    status,
    result,
    error,
    createSession,
    captureSession,
    reset,
  };
}
