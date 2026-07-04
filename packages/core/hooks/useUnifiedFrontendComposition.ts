'use client';

import { useMemo } from 'react';
import {
  createUnifiedFrontendFeatureCatalog,
  resolveFrontendComposition,
  UNIFIED_FRONTEND_SUPPORTED_PROFILES,
  type FrontendPresentationChannel,
  type ResolvedFrontendComposition,
} from '../config';
import { useRuntimeConfig, useRuntimeConfigStatus } from './useRuntimeConfig';

export interface UseUnifiedFrontendCompositionOptions {
  sovereignBuild: boolean;
  channel: FrontendPresentationChannel;
  storefrontContext: boolean;
}

export function useUnifiedFrontendComposition(
  options: UseUnifiedFrontendCompositionOptions
): ResolvedFrontendComposition {
  const runtimeConfig = useRuntimeConfig();
  const runtimeStatus = useRuntimeConfigStatus();
  const featureCatalog = useMemo(
    () => createUnifiedFrontendFeatureCatalog({ sovereignBuild: options.sovereignBuild }),
    [options.sovereignBuild]
  );

  return useMemo(
    () =>
      resolveFrontendComposition({
        runtimeConfig,
        runtimeStatus,
        channel: options.channel,
        storefrontContext: options.storefrontContext,
        supportedProfiles: UNIFIED_FRONTEND_SUPPORTED_PROFILES,
        featureCatalog,
      }),
    [featureCatalog, options.channel, options.storefrontContext, runtimeConfig, runtimeStatus]
  );
}
