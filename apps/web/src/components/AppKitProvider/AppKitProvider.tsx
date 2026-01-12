'use client';

/**
 * AppKit Provider Wrapper
 *
 * 包装 @mobazha/core 的 AppKitProvider，用于 Web App
 */

import { type ReactNode } from 'react';
import { AppKitProvider as CoreAppKitProvider } from '@mobazha/core';

interface AppKitProviderProps {
  children: ReactNode;
}

export function AppKitProvider({ children }: AppKitProviderProps) {
  return <CoreAppKitProvider autoInit={true}>{children}</CoreAppKitProvider>;
}

export default AppKitProvider;
