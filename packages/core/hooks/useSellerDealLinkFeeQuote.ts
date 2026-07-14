'use client';

import { useCallback, useMemo } from 'react';
import type { DealLinkFeeQuote } from '../types/dealLink';
import { createSellerDealLinkFeeQuote } from '../services/api/sellerDealLink';

export interface UseSellerDealLinkFeeQuoteReturn {
  /** Request the current server-authored quote for this seller-owned Deal Link. */
  requestQuote: () => Promise<DealLinkFeeQuote>;
}

/**
 * Exposes the user-triggered seller Fee Quote mutation without coupling a web
 * component directly to the API service layer.
 */
export function useSellerDealLinkFeeQuote(dealLinkID: string): UseSellerDealLinkFeeQuoteReturn {
  const requestQuote = useCallback(
    (): Promise<DealLinkFeeQuote> => createSellerDealLinkFeeQuote(dealLinkID),
    [dealLinkID]
  );

  return useMemo(() => ({ requestQuote }), [requestQuote]);
}
