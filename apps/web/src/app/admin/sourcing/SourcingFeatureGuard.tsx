'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2, Lock } from 'lucide-react';
import { useI18n, useFeatureFlags } from '@mobazha/core';

export function SourcingFeatureGuard({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { isEnabled, loading } = useFeatureFlags();
  const enabled = isEnabled('supplyChainEnabled');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 text-center"
        data-testid="sourcing-disabled"
      >
        <Lock className="w-10 h-10 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {t('admin.sourcing.featureDisabled')}
        </h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {t('admin.sourcing.featureDisabledDesc')}
        </p>
        <Link
          href="/admin"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          {t('admin.sourcing.backToDashboard')}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
