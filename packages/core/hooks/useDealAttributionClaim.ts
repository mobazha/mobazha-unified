// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StoredDealAttributionClaim } from '../types/dealPromotion';
import {
  clearStoredDealAttributionClaim,
  isStoredDealAttributionClaimValid,
  readStoredDealAttributionClaim,
  writeStoredDealAttributionClaim,
} from '../utils/dealPromotion';

export interface UseDealAttributionClaimReturn {
  claim: StoredDealAttributionClaim | null;
  hasActiveClaim: boolean;
  clearClaim: () => void;
  persistClaim: (claim: StoredDealAttributionClaim) => void;
}

export function useDealAttributionClaim(
  dealToken: string | undefined
): UseDealAttributionClaimReturn {
  const [claim, setClaim] = useState<StoredDealAttributionClaim | null>(() =>
    readStoredDealAttributionClaim()
  );
  const [now, setNow] = useState(() => Date.now());
  const hasActiveClaim = isStoredDealAttributionClaimValid(claim, dealToken, now);

  useEffect(() => {
    if (!hasActiveClaim) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasActiveClaim]);

  useEffect(() => {
    if (claim && !hasActiveClaim) {
      clearStoredDealAttributionClaim();
    }
  }, [claim, hasActiveClaim]);

  const clearClaim = useCallback(() => {
    clearStoredDealAttributionClaim();
    setClaim(null);
  }, []);

  const persistClaim = useCallback((nextClaim: StoredDealAttributionClaim) => {
    writeStoredDealAttributionClaim(nextClaim);
    setClaim(nextClaim);
  }, []);

  return {
    claim: hasActiveClaim ? claim : null,
    hasActiveClaim,
    clearClaim,
    persistClaim,
  };
}
