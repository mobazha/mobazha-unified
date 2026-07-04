'use client';

import { useEffect, type ReactNode } from 'react';
import { beginRuntimeConfigRefresh, failRuntimeConfigRefresh } from '../config/runtimeConfig';
import { refreshRuntimeConfig } from '../services/api/runtimeConfig';
import { useUserStore } from '../stores/userStore';

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);

  useEffect(() => {
    beginRuntimeConfigRefresh();
    void refreshRuntimeConfig().catch(() => {
      failRuntimeConfigRefresh();
    });
  }, [isAuthenticated]);

  return children;
}
