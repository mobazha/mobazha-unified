'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CollectiblesFeatureGuardProps {
  enabled: boolean;
  children: ReactNode;
}

/** SaaS-only surface; hidden when collectiblesHubEnabled is off. */
export function CollectiblesFeatureGuard({ enabled, children }: CollectiblesFeatureGuardProps) {
  const { t } = useI18n();

  if (!enabled) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">{t('collectibles.featureDisabled')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">{t('common.back')}</Link>
        </Button>
      </Card>
    );
  }

  return <>{children}</>;
}
