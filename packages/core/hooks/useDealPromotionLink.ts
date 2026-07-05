// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDealPromotionLink, getPublicDealPromotionLink } from '../services/api/dealPromotion';
import type { DealPromotionLink, PublicDealPromotionLink } from '../types/dealPromotion';
import { buildDealPromotionEntryHref } from '../utils/dealPromotion';

export interface UseDealPromotionLinkReturn {
  link: DealPromotionLink | null;
  promotion: PublicDealPromotionLink | null;
  shareHref: string | null;
  loading: boolean;
  error: string | null;
  ensureLink: () => Promise<DealPromotionLink | null>;
}

export function useDealPromotionLink(
  programId: string | undefined,
  enabled = true
): UseDealPromotionLinkReturn {
  const [link, setLink] = useState<DealPromotionLink | null>(null);
  const [promotion, setPromotion] = useState<PublicDealPromotionLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureLink = useCallback(async () => {
    if (!enabled || !programId) {
      setLink(null);
      setPromotion(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const nextLink = await createDealPromotionLink(programId);
      const nextPromotion = await getPublicDealPromotionLink(nextLink.publicToken);
      setLink(nextLink);
      setPromotion(nextPromotion);
      return nextLink;
    } catch (err) {
      setLink(null);
      setPromotion(null);
      setError(err instanceof Error ? err.message : 'link_failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, programId]);

  useEffect(() => {
    if (!enabled || !programId) {
      setLink(null);
      setPromotion(null);
      setError(null);
      return;
    }
    void ensureLink();
  }, [enabled, ensureLink, programId]);

  const shareHref = useMemo(() => {
    if (!link?.publicToken || typeof window === 'undefined') return null;
    const path = buildDealPromotionEntryHref(link.publicToken);
    return `${window.location.origin}${path}`;
  }, [link?.publicToken]);

  return {
    link,
    promotion,
    shareHref,
    loading,
    error,
    ensureLink,
  };
}
