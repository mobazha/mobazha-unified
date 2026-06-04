'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quoteCheckoutSupply } from '../services/api/orders';
import type { CheckoutSupplyQuoteResponse } from '../types/supplyAvailability';
import type { CheckoutSupplyQuoteLineInput } from '../utils/guestSupplyQuote';
import {
  buildQuoteRequestFromLines,
  hasSupplyAvailabilityWarning,
  isSupplyQuoteAdvisoryDisabled,
  isSupplyQuoteAuthoritative,
} from '../utils/guestSupplyQuote';

const DEBOUNCE_MS = 350;

export interface UseCheckoutSupplyQuoteReturn {
  quote: CheckoutSupplyQuoteResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  advisoryDisabled: boolean;
  authoritative: boolean;
  /** Standard checkout is advisory-only — always true (does not block submit). */
  canProceed: boolean;
  showPanel: boolean;
}

export function useCheckoutSupplyQuote(
  lines: CheckoutSupplyQuoteLineInput[],
  enabled = true
): UseCheckoutSupplyQuoteReturn {
  const [quote, setQuote] = useState<CheckoutSupplyQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const request = useMemo(() => buildQuoteRequestFromLines(lines), [lines]);
  const vendorPeerID = useMemo(() => {
    const peers = new Set(lines.map(line => line.vendorPeerID?.trim()).filter(Boolean));
    return peers.size === 1 ? [...peers][0] : undefined;
  }, [lines]);

  const fetchQuote = useCallback(async () => {
    if (!enabled || request.items.length === 0) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    try {
      const result = await quoteCheckoutSupply(request, { vendorPeerID });
      if (seq !== requestSeq.current) return;
      setQuote(result);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setQuote(null);
      setError(err instanceof Error ? err.message : 'Failed to check availability');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [enabled, request, vendorPeerID]);

  useEffect(() => {
    if (!enabled || request.items.length === 0) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      void fetchQuote();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, request, fetchQuote]);

  const advisoryDisabled = isSupplyQuoteAdvisoryDisabled(quote);
  const authoritative = isSupplyQuoteAuthoritative(quote);
  const showPanel =
    enabled &&
    request.items.length > 0 &&
    (loading ||
      error !== null ||
      (quote !== null && (authoritative || hasSupplyAvailabilityWarning(quote))));

  return {
    quote,
    loading,
    error,
    refresh: fetchQuote,
    advisoryDisabled,
    authoritative,
    canProceed: true,
    showPanel,
  };
}
