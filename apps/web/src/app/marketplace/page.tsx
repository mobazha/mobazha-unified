'use client';

import React, { useMemo, useState } from 'react';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { MarketplaceCard, MarketplaceTrustFooter } from '@/components/CommunityMarketplace';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { usePublicMarketplaces, useI18n, marketplaceVerticalKey } from '@mobazha/core';
import { RefreshCw, Search, Store } from 'lucide-react';

type SortMode = 'products' | 'sellers' | 'name' | 'updated';

export default function MarketplacesPage() {
  const { t } = useI18n();
  const { marketplaces, loading, error, refresh } = usePublicMarketplaces();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVertical, setSelectedVertical] = useState('all');
  const [sortBy, setSortBy] = useState<SortMode>('updated');

  const verticalOptions = useMemo(() => {
    const values = new Set<string>();
    for (const marketplace of marketplaces) {
      if (marketplace.vertical?.trim()) {
        values.add(marketplace.vertical.trim().toLowerCase());
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [marketplaces]);

  const filteredMarketplaces = useMemo(() => {
    return marketplaces
      .filter(marketplace => {
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const haystack = [
            marketplace.name,
            marketplace.description || '',
            marketplace.vertical,
            marketplace.slug || '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (
          selectedVertical !== 'all' &&
          marketplace.vertical.trim().toLowerCase() !== selectedVertical
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'products') return b.productCount - a.productCount;
        if (sortBy === 'sellers') return b.sellerCount - a.sellerCount;
        if (sortBy === 'updated') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        return a.name.localeCompare(b.name);
      });
  }, [marketplaces, searchQuery, selectedVertical, sortBy]);

  const showCuratedIntro =
    !loading && !error && marketplaces.length > 0 && marketplaces.length < 3 && !searchQuery.trim();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('marketplace.nativeTitle')} />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          <div className="mb-6 text-center sm:mb-10">
            <h1 className="mb-2 text-2xl font-bold text-foreground sm:mb-4 sm:text-4xl">
              {t('marketplace.nativeTitle')}
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-lg">
              {t('marketplace.nativeSubtitle')}
            </p>
          </div>

          {showCuratedIntro && (
            <Card className="mb-6 border-primary/20 bg-primary/5 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground">
                {t('marketplace.nativeIntroTitle')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('marketplace.nativeIntroDesc')}
              </p>
            </Card>
          )}

          <Card className="mb-5 p-3 sm:mb-8 sm:p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
              <div className="sm:col-span-2">
                <Input
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder={t('marketplace.searchPlaceholder')}
                  className="h-10 text-sm"
                  leftIcon={<Search className="h-5 w-5 text-muted-foreground" />}
                />
              </div>
              <Select value={selectedVertical} onValueChange={setSelectedVertical}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder={t('marketplace.allVerticals')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('marketplace.allVerticals')}</SelectItem>
                  {verticalOptions.map(vertical => (
                    <SelectItem key={vertical} value={vertical}>
                      {t(marketplaceVerticalKey(vertical))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={value => setSortBy(value as SortMode)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">{t('marketplace.sortByUpdated')}</SelectItem>
                  <SelectItem value="products">{t('marketplace.sortByProducts')}</SelectItem>
                  <SelectItem value="sellers">{t('marketplace.sortBySellers')}</SelectItem>
                  <SelectItem value="name">{t('marketplace.sortByName')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="h-72 animate-pulse bg-muted/50" />
              ))}
            </div>
          )}

          {!loading && error && (
            <Card className="p-8 text-center">
              <VStack gap="md" align="center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <RefreshCw className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {t('marketplace.unavailableNativeTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button variant="outline" onClick={refresh}>
                  {t('common.retry')}
                </Button>
              </VStack>
            </Card>
          )}

          {!loading && !error && (
            <section>
              <HStack justify="between" align="center" className="mb-4 gap-3">
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                  {searchQuery || selectedVertical !== 'all'
                    ? t('marketplace.searchResults')
                    : t('marketplace.allMarketplaces')}
                </h2>
              </HStack>

              {filteredMarketplaces.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredMarketplaces.map(marketplace => (
                    <MarketplaceCard key={marketplace.id} marketplace={marketplace} />
                  ))}
                </div>
              ) : (
                <Card className="py-12 text-center">
                  <VStack gap="md" align="center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Store className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {marketplaces.length === 0
                          ? t('marketplace.emptyNativeTitle')
                          : t('marketplace.noMarketplacesFound')}
                      </h3>
                      <p className="mx-auto max-w-md text-sm text-muted-foreground">
                        {marketplaces.length === 0
                          ? t('marketplace.emptyNativeDesc')
                          : t('empty.tryAdjustingFilters')}
                      </p>
                    </div>
                    {marketplaces.length > 0 && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedVertical('all');
                        }}
                      >
                        {t('marketplace.clearFilters')}
                      </Button>
                    )}
                  </VStack>
                </Card>
              )}
            </section>
          )}

          {!loading && !error && filteredMarketplaces.length > 0 && <MarketplaceTrustFooter />}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
