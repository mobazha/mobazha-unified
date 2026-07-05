// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  activateDealPromotionProgram,
  createDealPromotionProgram,
  listDealPromotionPrograms,
  pauseDealPromotionProgram,
} from '../services/api/dealPromotion';
import { listSellerDealLinks } from '../services/api/sellerDealLink';
import type { DealPromotionProgram, DealPromotionProgramRequest } from '../types/dealPromotion';
import type { SellerDealLink } from '../types/sellerDealLink';

export interface UseDealPromotionProgramsReturn {
  programs: DealPromotionProgram[];
  dealLinks: SellerDealLink[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createProgram: (input: DealPromotionProgramRequest) => Promise<DealPromotionProgram>;
  activateProgram: (programId: string) => Promise<DealPromotionProgram>;
  pauseProgram: (programId: string) => Promise<DealPromotionProgram>;
  busyProgramId: string | null;
}

export function useDealPromotionPrograms(enabled = true): UseDealPromotionProgramsReturn {
  const [programs, setPrograms] = useState<DealPromotionProgram[]>([]);
  const [dealLinks, setDealLinks] = useState<SellerDealLink[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [busyProgramId, setBusyProgramId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setPrograms([]);
      setDealLinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextPrograms, nextDealLinks] = await Promise.all([
        listDealPromotionPrograms(),
        listSellerDealLinks(),
      ]);
      setPrograms(nextPrograms);
      setDealLinks(nextDealLinks);
    } catch (err) {
      setPrograms([]);
      setDealLinks([]);
      setError(err instanceof Error ? err.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createProgram = useCallback(async (input: DealPromotionProgramRequest) => {
    const created = await createDealPromotionProgram(input);
    setPrograms(current => [created, ...current.filter(item => item.id !== created.id)]);
    return created;
  }, []);

  const activateProgram = useCallback(async (programId: string) => {
    setBusyProgramId(programId);
    try {
      const updated = await activateDealPromotionProgram(programId);
      setPrograms(current => current.map(item => (item.id === updated.id ? updated : item)));
      return updated;
    } finally {
      setBusyProgramId(null);
    }
  }, []);

  const pauseProgram = useCallback(async (programId: string) => {
    setBusyProgramId(programId);
    try {
      const updated = await pauseDealPromotionProgram(programId);
      setPrograms(current => current.map(item => (item.id === updated.id ? updated : item)));
      return updated;
    } finally {
      setBusyProgramId(null);
    }
  }, []);

  return useMemo(
    () => ({
      programs,
      dealLinks,
      loading,
      error,
      reload,
      createProgram,
      activateProgram,
      pauseProgram,
      busyProgramId,
    }),
    [
      programs,
      dealLinks,
      loading,
      error,
      reload,
      createProgram,
      activateProgram,
      pauseProgram,
      busyProgramId,
    ]
  );
}
