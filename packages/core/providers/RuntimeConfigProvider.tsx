'use client';

import { useEffect, type ReactNode } from 'react';
import { refreshRuntimeConfig } from '../services/api/runtimeConfig';

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void refreshRuntimeConfig().catch(() => {
      // The synchronous bootstrap and legacy defaults remain active.
    });
  }, []);

  return children;
}
