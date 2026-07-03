// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  collectibleHolderMatchesWallet,
  resolveMarketplaceBackHref,
  isCollectiblesPublicCatalogUnavailableError,
  resolveCollectibleCatalogDisplay,
  useCollectibleNFTs,
  useAppKit,
  useI18n,
} from '@mobazha/core';
import { ArrowLeft, Loader2, RefreshCw, Shield, Wallet } from 'lucide-react';

type CollectiblesView = 'catalog' | 'myCards';

export default function CollectiblesPage() {
  const { t } = useI18n();
  const { items, loading, error, refresh } = useCollectibleNFTs({ enabled: true });
  const { isConnected, isInitializing, address, connectSolana, openModal, chain } = useAppKit();
  const [activeView, setActiveView] = useState<CollectiblesView>('catalog');

  const catalogUnavailable = !!error && isCollectiblesPublicCatalogUnavailableError(error);
  const catalogReady = !loading && !catalogUnavailable;
  const curationHomeHref = resolveMarketplaceBackHref('/marketplace/m2-wilson');
  const solanaWalletAddress = useMemo(() => {
    if (!isConnected || !address?.trim() || address.startsWith('0x')) return null;
    if (chain?.chainNamespace && chain.chainNamespace !== 'solana') return null;
    return address.trim();
  }, [address, chain, isConnected]);

  const ownedItems = useMemo(() => {
    if (!solanaWalletAddress) return [];
    return items.filter(nft =>
      collectibleHolderMatchesWallet(nft.hubSlot?.currentHolder, solanaWalletAddress)
    );
  }, [items, solanaWalletAddress]);

  const displayItems = activeView === 'myCards' ? ownedItems : items;

  const handleConnectWallet = () => {
    if (isConnected && solanaWalletAddress) {
      void openModal({ view: 'Account' });
      return;
    }
    void connectSolana();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('collectibles.catalog.custodyCatalogTitle')} />

      <main className="py-4 sm:py-8">
        <Container size="lg">
          {loading && !catalogUnavailable ? (
            <div
              className="flex items-center justify-center py-20"
              data-testid="collectibles-catalog-loading"
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : catalogUnavailable ? (
            <Card
              className="mx-auto max-w-lg p-6 text-center"
              data-testid="collectibles-feature-disabled"
            >
              <p className="text-sm text-muted-foreground">{t('collectibles.featureDisabled')}</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/">{t('common.back')}</Link>
              </Button>
            </Card>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
                <Link href={curationHomeHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  {t('collectibles.catalog.backToMarketplace')}
                </Link>
              </Button>

              <div className="mb-6 sm:mb-8">
                <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                  {t('collectibles.catalog.custodyCatalogTitle')}
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                  {t('collectibles.catalog.custodyCatalogSubtitle')}
                </p>
              </div>

              <div
                className="mb-4 flex flex-wrap gap-2"
                role="tablist"
                aria-label={t('collectibles.catalog.navAria')}
              >
                <Button
                  type="button"
                  size="sm"
                  variant={activeView === 'catalog' ? 'default' : 'outline'}
                  role="tab"
                  aria-selected={activeView === 'catalog'}
                  onClick={() => setActiveView('catalog')}
                  data-testid="collectibles-tab-catalog"
                >
                  {t('collectibles.catalog.tabCatalog')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeView === 'myCards' ? 'default' : 'outline'}
                  role="tab"
                  aria-selected={activeView === 'myCards'}
                  onClick={() => setActiveView('myCards')}
                  data-testid="collectibles-tab-my-cards"
                >
                  {t('collectibles.catalog.tabMyCards')}
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  data-testid="collectibles-tab-redemptions"
                >
                  <Link href="/collectibles/redemptions">
                    {t('collectibles.catalog.tabRedemptions')}
                  </Link>
                </Button>
              </div>

              <Card className="mb-6 border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm text-muted-foreground">{t('collectibles.trustNote')}</p>
                </div>
              </Card>

              {activeView === 'myCards' && !solanaWalletAddress ? (
                <Card
                  className="mb-6 p-6 text-center"
                  data-testid="collectibles-my-cards-disconnected"
                >
                  <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    {t('collectibles.catalog.myCardsConnectPrompt')}
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={handleConnectWallet}
                    disabled={isInitializing}
                  >
                    {isInitializing
                      ? t('collectibles.checkout.connectingWallet')
                      : t('collectibles.catalog.connectWalletCta')}
                  </Button>
                </Card>
              ) : (
                <>
                  {activeView === 'myCards' && solanaWalletAddress ? (
                    <p className="mb-4 text-xs text-muted-foreground">
                      {t('collectibles.catalog.myCardsHoldHint')}
                    </p>
                  ) : null}

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

                  {error && catalogReady ? (
                    <Card className="mb-4 border-destructive/30 bg-destructive/5 p-4">
                      <p className="text-sm text-destructive">{error.message}</p>
                    </Card>
                  ) : null}

                  {loading && displayItems.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      {t('common.loading')}
                    </p>
                  ) : null}

                  {!loading && displayItems.length === 0 ? (
                    <Card className="p-8 text-center" data-testid="collectibles-catalog-empty">
                      <p className="text-sm text-muted-foreground">
                        {activeView === 'myCards'
                          ? t('collectibles.catalog.myCardsEmpty')
                          : t('collectibles.empty')}
                      </p>
                    </Card>
                  ) : (
                    <div
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      data-testid="collectibles-catalog-grid"
                    >
                      {displayItems.map(nft => {
                        const mint = nft.nftMint?.trim();
                        const display = resolveCollectibleCatalogDisplay(nft, t);

                        return (
                          <Card key={mint || nft.hubSlotID} className="overflow-hidden p-0">
                            {display.imageUrl ? (
                              <div className="aspect-[4/3] w-full bg-muted">
                                <img
                                  src={display.imageUrl}
                                  alt={display.displayName}
                                  className="h-full w-full object-contain p-3"
                                />
                              </div>
                            ) : null}
                            <div className="p-4">
                              <h2 className="line-clamp-2 text-base font-semibold text-foreground">
                                {display.displayName}
                              </h2>
                              {display.grade ? (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {display.grade}
                                </p>
                              ) : null}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="secondary">{t(display.custodyStatusKey)}</Badge>
                                <Badge variant={display.redeemable ? 'default' : 'outline'}>
                                  {display.redeemable
                                    ? t('collectibles.catalog.redeemableYes')
                                    : t('collectibles.catalog.redeemableNo')}
                                </Badge>
                              </div>
                              {mint ? (
                                <Button asChild className="mt-4 w-full" size="sm">
                                  <Link href={`/collectibles/${encodeURIComponent(mint)}`}>
                                    {t('collectibles.catalog.viewCustodyCta')}
                                  </Link>
                                </Button>
                              ) : (
                                <Button className="mt-4 w-full" size="sm" disabled>
                                  {t('collectibles.catalog.viewCustodyCta')}
                                </Button>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
