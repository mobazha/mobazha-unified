'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useDealPromotionPrograms, type UseDealPromotionProgramsReturn } from '@mobazha/core';

const DealLinksContext = createContext<UseDealPromotionProgramsReturn | null>(null);

export function DealLinksProvider({ children }: { children: React.ReactNode }) {
  const value = useDealPromotionPrograms();
  const memoized = useMemo(() => value, [value]);
  return <DealLinksContext.Provider value={memoized}>{children}</DealLinksContext.Provider>;
}

export function useDealLinksContext(): UseDealPromotionProgramsReturn {
  const ctx = useContext(DealLinksContext);
  if (!ctx) {
    throw new Error('useDealLinksContext must be used within DealLinksProvider');
  }
  return ctx;
}
