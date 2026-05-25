'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useCommunityMarketplaces, useI18n, type PublicGroupMarketplace } from '@mobazha/core';
import { Package, RefreshCw, Search, ShieldCheck, Store, Users } from 'lucide-react';

type SortMode = 'featured' | 'products' | 'sellers' | 'name' | 'updated';

const platformLabels: Record<string, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
};

function marketplaceHref(marketplace: PublicGroupMarketplace) {
  return `/marketplace/${marketplace.slug || marketplace.publicID}`;
}

function logoFor(marketplace: PublicGroupMarketplace) {
  return (
    marketplace.logoURL ||
    `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(marketplace.publicID)}`
  );
}

function MarketplaceCard({
  marketplace,
  compact = false,
}: {
  marketplace: PublicGroupMarketplace;
  compact?: boolean;
}) {
  const description = marketplace.publicDescription || '真实 Telegram/Discord 社区驱动的市场。';

  if (compact) {
    return (
      <Link href={marketplaceHref(marketplace)}>
        <Card className="h-full p-4 transition-all hover:shadow-lg active:scale-[0.99]">
          <HStack gap="md" align="start">
            <img
              src={logoFor(marketplace)}
              alt={marketplace.name}
              className="h-14 w-14 flex-shrink-0 rounded-lg bg-muted object-cover"
            />
            <div className="min-w-0 flex-1">
              <HStack gap="xs" align="center" className="mb-1 flex-wrap">
                <h3 className="truncate text-base font-bold text-foreground">{marketplace.name}</h3>
                {marketplace.isFeatured && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    精选
                  </span>
                )}
              </HStack>
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{description}</p>
              <HStack gap="md" className="flex-wrap text-xs text-muted-foreground">
                <span>{platformLabels[marketplace.platform] || marketplace.platform}</span>
                <span>{marketplace.sellerCount} 卖家</span>
                <span>{marketplace.productCount} 商品</span>
              </HStack>
            </div>
          </HStack>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={marketplaceHref(marketplace)}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-xl active:scale-[0.99]">
        <div className="relative h-32 overflow-hidden bg-muted">
          {marketplace.bannerURL ? (
            <img src={marketplace.bannerURL} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.25),transparent_35%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="absolute right-3 top-3 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
            精选
          </span>
        </div>

        <div className="relative p-4">
          <img
            src={logoFor(marketplace)}
            alt={marketplace.name}
            className="-mt-10 mb-3 h-16 w-16 rounded-lg border-4 border-background bg-card object-cover shadow-lg"
          />
          <h3 className="mb-2 text-lg font-bold text-foreground">{marketplace.name}</h3>
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{description}</p>
          <HStack gap="lg" className="flex-wrap">
            <VStack gap="none" align="center">
              <span className="text-base font-bold text-foreground">{marketplace.sellerCount}</span>
              <span className="text-xs text-muted-foreground">卖家</span>
            </VStack>
            <VStack gap="none" align="center">
              <span className="text-base font-bold text-foreground">
                {marketplace.productCount}
              </span>
              <span className="text-xs text-muted-foreground">商品</span>
            </VStack>
            <VStack gap="none" align="center">
              <span className="text-base font-bold text-foreground">
                {platformLabels[marketplace.platform] || marketplace.platform}
              </span>
              <span className="text-xs text-muted-foreground">来源</span>
            </VStack>
          </HStack>
        </div>
      </Card>
    </Link>
  );
}

export default function MarketplacesPage() {
  const { t } = useI18n();
  const { marketplaces, loading, error, refresh } = useCommunityMarketplaces();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [sortBy, setSortBy] = useState<SortMode>('featured');

  const filteredMarketplaces = useMemo(() => {
    return marketplaces
      .filter(marketplace => {
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const haystack = [
            marketplace.name,
            marketplace.publicDescription || '',
            marketplace.platform,
            marketplace.slug || '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (selectedPlatform !== 'all' && marketplace.platform !== selectedPlatform) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'featured') {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          return a.sortOrder - b.sortOrder;
        }
        if (sortBy === 'products') return b.productCount - a.productCount;
        if (sortBy === 'sellers') return b.sellerCount - a.sellerCount;
        if (sortBy === 'updated') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        return a.name.localeCompare(b.name);
      });
  }, [marketplaces, searchQuery, selectedPlatform, sortBy]);

  const featuredMarketplaces = filteredMarketplaces.filter(marketplace => marketplace.isFeatured);
  const showFeatured =
    featuredMarketplaces.length > 0 && !searchQuery.trim() && selectedPlatform === 'all';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('marketplace.title')} />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          <div className="mb-6 text-center sm:mb-10">
            <h1 className="mb-2 text-2xl font-bold text-foreground sm:mb-4 sm:text-4xl">
              {t('marketplace.title')}
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-xl">
              发现真实 Telegram 和 Discord 社区市场，从可信卖家购买或申请成为卖家。
            </p>
          </div>

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
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="全部平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={value => setSortBy(value as SortMode)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">精选优先</SelectItem>
                  <SelectItem value="products">{t('marketplace.sortByProducts')}</SelectItem>
                  <SelectItem value="sellers">卖家最多</SelectItem>
                  <SelectItem value="updated">最近更新</SelectItem>
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
                  <h3 className="mb-2 text-lg font-semibold text-foreground">社区市场暂时不可用</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button variant="outline" onClick={refresh}>
                  重新加载
                </Button>
              </VStack>
            </Card>
          )}

          {!loading && !error && showFeatured && (
            <section className="mb-8 sm:mb-12">
              <HStack align="center" gap="sm" className="mb-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                  {t('marketplace.featuredMarketplaces')}
                </h2>
              </HStack>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredMarketplaces.map(marketplace => (
                  <MarketplaceCard key={marketplace.publicID} marketplace={marketplace} />
                ))}
              </div>
            </section>
          )}

          {!loading && !error && (
            <section>
              <HStack justify="between" align="center" className="mb-4 gap-3">
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                  {searchQuery || selectedPlatform !== 'all'
                    ? t('marketplace.searchResults')
                    : t('marketplace.allMarketplaces')}
                </h2>
                <Link href="/store/settings/sales-channels">
                  <Button size="sm">从群组创建/申请</Button>
                </Link>
              </HStack>

              {filteredMarketplaces.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredMarketplaces.map(marketplace => (
                    <MarketplaceCard key={marketplace.publicID} marketplace={marketplace} compact />
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
                          ? '暂无公开社区市场'
                          : t('marketplace.noMarketplacesFound')}
                      </h3>
                      <p className="mx-auto max-w-md text-sm text-muted-foreground">
                        {marketplaces.length === 0
                          ? '首批市场需要由运营激活后才会公开展示。你可以先从 Telegram 或 Discord 绑定真实社区。'
                          : t('empty.tryAdjustingFilters')}
                      </p>
                    </div>
                    <HStack gap="sm" className="flex-wrap justify-center">
                      {marketplaces.length > 0 && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedPlatform('all');
                          }}
                        >
                          {t('marketplace.clearFilters')}
                        </Button>
                      )}
                      <Link href="/store/settings/sales-channels">
                        <Button variant="outline">从群组创建/申请</Button>
                      </Link>
                    </HStack>
                  </VStack>
                </Card>
              )}
            </section>
          )}

          {!loading && !error && filteredMarketplaces.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <HStack gap="sm">
                <Users className="h-4 w-4 text-primary" />
                <span>成员资格由 Telegram/Discord 验证</span>
              </HStack>
              <HStack gap="sm">
                <Package className="h-4 w-4 text-primary" />
                <span>只统计已批准且可见的卖家商品</span>
              </HStack>
              <HStack gap="sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>公开展示需运营激活</span>
              </HStack>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
