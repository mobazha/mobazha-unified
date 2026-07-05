'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptPublicDealLink,
  createDealLinkFeeQuote,
  getPublicDealLink,
} from '../services/api/dealLink';
import type { DealLinkFeeQuote, DealLinkPageErrorKind, PublicDealLink } from '../types/dealLink';
import {
  buildDealLinkAcceptanceRequest,
  classifyDealLinkError,
  computeDealLinkCanAccept,
  isDealLinkActive,
  isDealLinkFeeQuoteExpired,
  isPublicDealLinkExpired,
  resolveDealLinkIdempotencyState,
} from '../utils/dealLink';

export type DealLinkCheckoutPhase =
  | 'loading'
  | 'ready'
  | 'not_found'
  | 'expired'
  | 'inactive'
  | 'error';

export interface UseDealLinkCheckoutOptions {
  enabled?: boolean;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  onAccepted?: (orderID: string) => void;
}

export interface UseDealLinkCheckoutReturn {
  deal: PublicDealLink | null;
  quote: DealLinkFeeQuote | null;
  phase: DealLinkCheckoutPhase;
  quoteLoading: boolean;
  quoteError: DealLinkPageErrorKind | null;
  acceptLoading: boolean;
  acceptError: string | null;
  pageError: DealLinkPageErrorKind | null;
  quoteExpired: boolean;
  dealExpired: boolean;
  canAccept: boolean;
  refreshQuote: () => Promise<void>;
  reloadDeal: () => Promise<void>;
  acceptDeal: () => Promise<void>;
}

export function useDealLinkCheckout(
  token: string | undefined,
  options: UseDealLinkCheckoutOptions = {}
): UseDealLinkCheckoutReturn {
  const { enabled = true, isAuthenticated = false, onRequireAuth, onAccepted } = options;

  const [deal, setDeal] = useState<PublicDealLink | null>(null);
  const [quote, setQuote] = useState<DealLinkFeeQuote | null>(null);
  const [phase, setPhase] = useState<DealLinkCheckoutPhase>('loading');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<DealLinkPageErrorKind | null>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<DealLinkPageErrorKind | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const idempotencyStateRef = useRef({ quoteId: null as string | null, idempotencyKey: '' });
  const loadSeq = useRef(0);
  const quoteSeq = useRef(0);

  useEffect(() => {
    if (!quote?.expiresAt) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [quote?.expiresAt]);

  const dealExpired = deal ? isPublicDealLinkExpired(deal, now) : false;
  const quoteExpired = isDealLinkFeeQuoteExpired(quote, now);
  const canAccept = computeDealLinkCanAccept(deal, quote, now, acceptLoading);

  const reloadDeal = useCallback(async () => {
    if (!enabled || !token) {
      setDeal(null);
      setPhase('error');
      setPageError('not_found');
      return;
    }

    const seq = ++loadSeq.current;
    setPhase('loading');
    setPageError(null);

    try {
      const nextDeal = await getPublicDealLink(token);
      if (seq !== loadSeq.current) return;

      setDeal(nextDeal);

      if (isPublicDealLinkExpired(nextDeal)) {
        setPhase('expired');
        return;
      }
      if (nextDeal.status !== 'active') {
        setPhase('inactive');
        return;
      }
      setPhase('ready');
    } catch (error) {
      if (seq !== loadSeq.current) return;
      const kind = classifyDealLinkError(error);
      setDeal(null);
      setQuote(null);
      setPageError(kind);
      setPhase(kind === 'not_found' ? 'not_found' : kind === 'expired' ? 'expired' : 'error');
    }
  }, [enabled, token]);

  const refreshQuote = useCallback(async () => {
    if (!enabled || !token || !deal || !isDealLinkActive(deal)) {
      setQuote(null);
      return;
    }

    const seq = ++quoteSeq.current;
    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const nextQuote = await createDealLinkFeeQuote(token);
      if (seq !== quoteSeq.current) return;
      idempotencyStateRef.current = resolveDealLinkIdempotencyState(
        nextQuote.id,
        idempotencyStateRef.current
      );
      setNow(Date.now());
      setQuote(nextQuote);
    } catch (error) {
      if (seq !== quoteSeq.current) return;
      setQuote(null);
      setQuoteError(classifyDealLinkError(error));
    } finally {
      if (seq === quoteSeq.current) setQuoteLoading(false);
    }
  }, [deal, enabled, token]);

  useEffect(() => {
    void reloadDeal();
  }, [reloadDeal]);

  useEffect(() => {
    if (phase !== 'ready' || !deal) return;
    void refreshQuote();
  }, [deal, phase, refreshQuote]);

  const acceptDeal = useCallback(async () => {
    if (!token || !deal || !quote || !canAccept) return;

    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }

    setAcceptLoading(true);
    setAcceptError(null);

    try {
      const payload = buildDealLinkAcceptanceRequest(quote.id);
      const result = await acceptPublicDealLink(
        token,
        payload,
        idempotencyStateRef.current.idempotencyKey
      );
      if (!result.orderID) {
        throw new Error('Missing order ID');
      }
      onAccepted?.(result.orderID);
    } catch (error) {
      const kind = classifyDealLinkError(error);
      if (kind === 'quote_expired') {
        setQuoteError('quote_expired');
        setQuote(null);
      }
      setAcceptError(error instanceof Error ? error.message : 'accept_failed');
    } finally {
      setAcceptLoading(false);
    }
  }, [canAccept, deal, isAuthenticated, onAccepted, onRequireAuth, quote, token]);

  return {
    deal,
    quote,
    phase,
    quoteLoading,
    quoteError,
    acceptLoading,
    acceptError,
    pageError,
    quoteExpired,
    dealExpired,
    canAccept,
    refreshQuote,
    reloadDeal,
    acceptDeal,
  };
}
