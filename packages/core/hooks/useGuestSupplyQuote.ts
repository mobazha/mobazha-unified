'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  quoteGuestOrderSupply,
  type GuestOrderSupplyQuoteResponse,
} from '../services/api/guestCheckout';
import type { GuestCartItem } from '../stores/guestCartStore';
import {
  buildQuoteRequestFromCartItems,
  canProceedGuestCheckout,
  isSupplyQuoteAdvisoryDisabled,
  isSupplyQuoteAuthoritative,
} from '../utils/guestSupplyQuote';

const DEBOUNCE_MS = 350;

export interface UseGuestSupplyQuoteReturn {
  quote: GuestOrderSupplyQuoteResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  advisoryDisabled: boolean;
  authoritative: boolean;
  canProceed: boolean;
  /** Show panel when quote is loading, authoritative, or errored. */
  showPanel: boolean;
}

export function useGuestSupplyQuote(
  items: GuestCartItem[],
  enabled = true
): UseGuestSupplyQuoteReturn {
  const [quote, setQuote] = useState<GuestOrderSupplyQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const request = useMemo(() => buildQuoteRequestFromCartItems(items), [items]);

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
      const result = await quoteGuestOrderSupply(request);
      if (seq !== requestSeq.current) return;
      setQuote(result);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setQuote(null);
      setError(err instanceof Error ? err.message : 'Failed to check availability');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [enabled, request]);

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
  const canProceed = canProceedGuestCheckout(quote);
  const showPanel =
    enabled &&
    request.items.length > 0 &&
    (loading || error !== null || (quote !== null && authoritative));

  return {
    quote,
    loading,
    error,
    refresh: fetchQuote,
    advisoryDisabled,
    authoritative,
    canProceed,
    showPanel,
  };
}
