'use client';

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

function SectionsSkeleton() {
  return (
    <div className="animate-pulse space-y-6 py-4" aria-busy="true" aria-label="Loading storefront">
      <div className="h-48 bg-muted rounded-lg" />
      <div className="space-y-3 px-4">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
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
    return <SectionsSkeleton />;
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
