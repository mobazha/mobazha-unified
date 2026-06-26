'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  resolveCollectibleRedemptionPhase,
  useCollectibleRedemptions,
  useFeatureFlags,
  useI18n,
  truncateAddress,
  type CollectibleRedemptionPhase,
} from '@mobazha/core';
import { formatOrderDateTime } from '@/components/Order/utils';
import { ArrowLeft, CheckCircle2, Clock, RefreshCw, Truck } from 'lucide-react';
import { CollectiblesFeatureGuard } from '../CollectiblesFeatureGuard';

const PHASE_CONFIG: Record<CollectibleRedemptionPhase, { icon: React.ElementType; color: string }> =
  {
    redeem_requested: { icon: Clock, color: 'text-info' },
    shipped: { icon: Truck, color: 'text-warning' },
    settled: { icon: CheckCircle2, color: 'text-success' },
  };

export default function CollectibleRedemptionsPage() {
  const { t, locale } = useI18n();
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const enabled = isEnabled('collectiblesHubEnabled') && !flagsLoading;
  const { items, loading, error, refresh } = useCollectibleRedemptions({ enabled });

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [items]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('collectibles.redemptions.title')} />

      <main className="py-4 sm:py-8">
        <Container size="lg">
          <CollectiblesFeatureGuard>
            <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
              <Link href="/collectibles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('collectibles.redemptions.backToCollectibles')}
              </Link>
            </Button>

            <div className="mb-6 text-center sm:mb-8">
              <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                {t('collectibles.redemptions.title')}
              </h1>
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
                {t('collectibles.redemptions.subtitle')}
              </p>
            </div>

            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </Button>
            </div>

            {error ? (
              <Card className="mb-4 border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{error.message}</p>
              </Card>
            ) : null}

            {loading && sortedItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : null}

            {!loading && sortedItems.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('collectibles.redemptions.empty')}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {sortedItems.map(redemption => {
                  const phase = resolveCollectibleRedemptionPhase(redemption);
                  const phaseConfig = PHASE_CONFIG[phase];
                  const PhaseIcon = phaseConfig.icon;
                  return (
                    <Card key={redemption.redemptionID} className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <PhaseIcon className={`h-4 w-4 shrink-0 ${phaseConfig.color}`} />
                            <span className="text-sm font-medium text-foreground">
                              {t(`collectibles.tracking.phase.${phase}`)}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-muted-foreground">
                            {redemption.redemptionID}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('collectibles.tracking.nftMint')}:{' '}
                            <span className="font-mono">{truncateAddress(redemption.nftMint)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('collectibles.tracking.submittedAt')}:{' '}
                            {formatOrderDateTime(redemption.createdAt, { locale }) ?? '—'}
                          </p>
                          {redemption.trackingNo ? (
                            <p className="text-xs text-muted-foreground">
                              {t('collectibles.tracking.trackingNumber')}: {redemption.trackingNo}
                            </p>
                          ) : null}
                        </div>
                        <Button asChild size="sm" className="shrink-0">
                          <Link
                            href={`/collectibles/redeem/${encodeURIComponent(redemption.redemptionID)}`}
                          >
                            {t('collectibles.redemptions.viewTracking')}
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CollectiblesFeatureGuard>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
