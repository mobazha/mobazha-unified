'use client';

import React from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCollectibleNFTs, useFeatureFlags, useI18n, truncateAddress } from '@mobazha/core';
import { RefreshCw, Shield } from 'lucide-react';
import { CollectiblesFeatureGuard } from './CollectiblesFeatureGuard';

export default function CollectiblesPage() {
  const { t } = useI18n();
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const enabled = isEnabled('collectiblesHubEnabled') && !flagsLoading;
  const { items, loading, error, refresh } = useCollectibleNFTs({ enabled });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('collectibles.title')} />

      <main className="py-4 sm:py-8">
        <Container size="lg">
          <CollectiblesFeatureGuard>
            <div className="mb-6 text-center sm:mb-8">
              <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                {t('collectibles.title')}
              </h1>
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
                {t('collectibles.subtitle')}
              </p>
            </div>

            <Card className="mb-6 border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">{t('collectibles.trustNote')}</p>
              </div>
            </Card>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button asChild variant="outline" size="sm">
                <Link href="/collectibles/redemptions">{t('collectibles.redemptions.title')}</Link>
              </Button>
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

            {error && (
              <Card className="mb-4 border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{error.message}</p>
              </Card>
            )}

            {loading && items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : null}

            {!loading && items.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">{t('collectibles.empty')}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(nft => {
                  const mint = nft.nftMint?.trim();
                  const slot = nft.hubSlot;
                  const cardTitle = slot?.certNumber || t('collectibles.tokenizedCard');
                  const cardSubtitle = slot?.grade || nft.tokenStandard || nft.chain || '';
                  return (
                    <Card key={mint || nft.hubSlotID} className="p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {cardTitle}
                      </p>
                      {cardSubtitle ? (
                        <p className="mt-1 text-sm font-medium text-foreground">{cardSubtitle}</p>
                      ) : null}
                      {mint ? (
                        <p className="mt-1 font-mono text-sm text-muted-foreground">
                          {truncateAddress(mint)}
                        </p>
                      ) : null}
                      {nft.hubSlotID ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('collectibles.hubSlot')}: {nft.hubSlotID}
                        </p>
                      ) : null}
                      {mint ? (
                        <Button asChild className="mt-4 w-full" size="sm">
                          <Link href={`/collectibles/${encodeURIComponent(mint)}`}>
                            {t('collectibles.viewDetails')}
                          </Link>
                        </Button>
                      ) : (
                        <Button className="mt-4 w-full" size="sm" disabled>
                          {t('collectibles.viewDetails')}
                        </Button>
                      )}
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
