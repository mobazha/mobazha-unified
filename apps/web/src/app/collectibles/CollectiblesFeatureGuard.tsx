// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useFeatureFlags, useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CollectiblesFeatureGuardProps {
  children: ReactNode;
}

/** SaaS-only surface; hidden when collectiblesHubEnabled is off. */
export function CollectiblesFeatureGuard({ children }: CollectiblesFeatureGuardProps) {
  const { t } = useI18n();
  const { isEnabled, loading } = useFeatureFlags();
  const enabled = isEnabled('collectiblesHubEnabled');

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-testid="collectibles-flags-loading"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <Card
        className="mx-auto max-w-lg p-6 text-center"
        data-testid="collectibles-feature-disabled"
      >
        <p className="text-sm text-muted-foreground">{t('collectibles.featureDisabled')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">{t('common.back')}</Link>
        </Button>
      </Card>
    );
  }

  return <>{children}</>;
}
