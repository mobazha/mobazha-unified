// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  isFrontendFeatureEnabled,
  useI18n,
  useStorefrontMode,
  useUnifiedFrontendComposition,
  type UnifiedFrontendFeatureId,
} from '@mobazha/core';
import { usePlatform } from '@mobazha/ui/hooks';
import NotFound from '@/app/not-found';

interface UnifiedFrontendFeatureBoundaryProps {
  feature: UnifiedFrontendFeatureId;
  children: ReactNode;
  fallback?: ReactNode;
}

export function UnifiedFrontendFeatureBoundary({
  feature,
  children,
  fallback,
}: UnifiedFrontendFeatureBoundaryProps) {
  const { t } = useI18n();
  const storefrontContext = useStorefrontMode();
  const { isEmbeddedApp } = usePlatform();
  const sovereignBuild = typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__;
  const composition = useUnifiedFrontendComposition({
    sovereignBuild,
    channel: isEmbeddedApp ? 'embedded' : 'web',
    storefrontContext,
  });

  if (composition.status === 'pending') {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center"
        role="status"
        data-testid="frontend-composition-pending"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (composition.status === 'invalid') {
    const retryable = composition.diagnostics.some(diagnostic => diagnostic.retryable === true);
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center"
        role="alert"
        data-testid="frontend-composition-invalid"
      >
        <p className="text-sm text-muted-foreground">{t('common.error')}</p>
        {retryable ? (
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </button>
        ) : null}
      </div>
    );
  }

  if (!isFrontendFeatureEnabled(composition, feature)) return fallback ?? <NotFound />;
  return children;
}
