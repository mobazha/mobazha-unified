'use client';

import { useEffect, type ReactNode } from 'react';
import { beginRuntimeConfigRefresh, failRuntimeConfigRefresh } from '../config/runtimeConfig';
import { refreshRuntimeConfig } from '../services/api/runtimeConfig';

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    beginRuntimeConfigRefresh();
    void refreshRuntimeConfig().catch(() => {
      failRuntimeConfigRefresh();
    });
  }, []);

  return children;
}
