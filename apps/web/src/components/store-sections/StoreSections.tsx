'use client';

import React from 'react';
import type { StoreConfig, UserProfile } from '@mobazha/core';
import { useStorefrontConfigPublic } from '@mobazha/core';
import { StoreThemeProvider } from './StoreThemeProvider';
import { SectionRenderer } from './SectionRenderer';

interface StoreSectionsProps {
  peerId: string;
  profile?: UserProfile;
  /** Owner-provided config (already fetched by admin); skips public API fetch */
  ownerConfig?: StoreConfig | null;
}

/**
 * Wrapper that fetches (or accepts) a StoreConfig and renders sections.
 * Returns null when no config exists, letting the parent fall back
 * to the classic store layout.
 */
export function StoreSections({ peerId, profile, ownerConfig }: StoreSectionsProps) {
  const { config: publicConfig, isLoading } = useStorefrontConfigPublic(
    ownerConfig !== undefined ? null : peerId
  );

  const config = ownerConfig ?? publicConfig;

  if (isLoading && ownerConfig === undefined) {
    return null;
  }

  if (!config || !config.sections?.length) {
    return null;
  }

  return (
    <StoreThemeProvider theme={config.theme}>
      <SectionRenderer sections={config.sections} profile={profile} peerId={peerId} />
    </StoreThemeProvider>
  );
}
