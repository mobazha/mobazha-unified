'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useI18n,
  useRuntimeCapability,
  useRuntimeConfigStatus,
  type RuntimeCapabilityKey,
} from '@mobazha/core';
import NotFound from '@/app/not-found';

export function RuntimeCapabilityBoundary({
  capability,
  children,
  fallback,
}: {
  capability: RuntimeCapabilityKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { t } = useI18n();
  const status = useRuntimeConfigStatus();
  const enabled = useRuntimeCapability(capability);
  if (status !== 'ready') {
    const failed = status === 'error';
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center"
        role="status"
        data-testid="runtime-capability-pending"
      >
        {failed ? null : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">
          {failed ? t('common.error') : t('common.loading')}
        </p>
        {failed ? (
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
  if (!enabled) return fallback ?? <NotFound />;
  return children;
}
