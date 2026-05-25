'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import {
  CommunityListingCard,
  CommunitySellerCard,
  MarketplaceLogo,
  MarketplaceTrustStrip,
} from '@/components/CommunityMarketplace';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Badge } from '@/components/ui/badge';
import {
  useCommunityMarketplaceDetail,
  useCommunityMarketplaceEnrichment,
  useI18n,
  marketplaceJoinModeKey,
  marketplacePlatformKey,
} from '@mobazha/core';
import { ExternalLink, Package, RefreshCw, Search, ShieldCheck, Store, Users } from 'lucide-react';

type DetailTab = 'products' | 'sellers' | 'about';

export default function MarketplaceDetailPage() {
  const params = useParams();
  const { t, formatRelativeTime } = useI18n();
  const slugParam = params.slug;
  const identifier = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const { detail, loading, error, refresh } = useCommunityMarketplaceDetail(identifier);
  const [activeTab, setActiveTab] = useState<DetailTab>('products');
  const [searchQuery, setSearchQuery] = useState('');

  const marketplace = detail?.marketplace;
  const listingRefs = useMemo(() => detail?.listings.listings ?? [], [detail?.listings.listings]);
  const sellers = detail?.sellers ?? [];
  const sellerPeerIDs = useMemo(() => sellers.map(s => s.peerID), [sellers]);

  const { listingPreviews, sellerProfiles } = useCommunityMarketplaceEnrichment(
    listingRefs,
    sellerPeerIDs
  );

  const filteredPreviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return listingPreviews;
    return listingPreviews.filter(
      preview =>
        preview.title.toLowerCase().includes(q) ||
        preview.slug.toLowerCase().includes(q) ||
        (preview.vendorName || '').toLowerCase().includes(q)
    );
  }, [listingPreviews, searchQuery]);

  const handleJoinGuidance = () => {
    const platform = marketplace?.platform;
    if (platform === 'telegram') {
      window.open('https://telegram.org/', '_blank', 'noopener,noreferrer');
      return;
    }
    if (platform === 'discord') {
      window.open('https://discord.com/', '_blank', 'noopener,noreferrer');
      return;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8">
          <Container size="xl">
            <Card className="h-56 animate-pulse bg-muted/50" />
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="h-48 animate-pulse bg-muted/50" />
              <Card className="h-48 animate-pulse bg-muted/50" />
              <Card className="h-48 animate-pulse bg-muted/50" />
            </div>
          </Container>
        </main>
      </div>
    );
  }

  if (error || !marketplace) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MobilePageHeader title={t('marketplace.title')} />
        <main className="py-8">
          <Container size="xl">
            <Card className="p-8 text-center">
              <VStack gap="md" align="center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="mb-2 text-xl font-bold text-foreground">
                    {t('marketplace.detail.unavailableTitle')}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {error || t('marketplace.detail.unavailableDesc')}
                  </p>
                </div>
                <HStack gap="sm" className="flex-wrap justify-center">
                  <Button variant="outline" onClick={refresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('common.retry')}
                  </Button>
                  <Link href="/marketplace">
                    <Button>{t('marketplace.sell.backToMarketplace')}</Button>
                  </Link>
                </HStack>
              </VStack>
            </Card>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  const platformName = t(marketplacePlatformKey(marketplace.platform));
  const joinLabel = t(marketplaceJoinModeKey(marketplace.joinMode));
  const description = marketplace.publicDescription?.trim() || t('marketplace.defaultDescription');
  const updatedLabel = marketplace.updatedAt
    ? t('marketplace.updatedAgo', { time: formatRelativeTime(marketplace.updatedAt) })
    : null;
  const sellHref = `/marketplace/${marketplace.slug || marketplace.publicID}/sell`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={marketplace.name} />

      <main>
        <div className="relative h-36 bg-muted sm:h-44 md:h-52">
          {marketplace.bannerURL ? (
            <img src={marketplace.bannerURL} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-muted to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <Container size="xl">
          <div className="relative -mt-12 mb-6 sm:-mt-14 sm:mb-8">
            <Card className="p-4 sm:p-6">
              <HStack gap="lg" align="start" className="flex-wrap">
                <MarketplaceLogo
                  name={marketplace.name}
                  publicID={marketplace.publicID}
                  logoURL={marketplace.logoURL}
                  size="lg"
                  className="-mt-10 border-4 border-background shadow-lg sm:-mt-12"
                />
                <div className="min-w-0 flex-1">
                  <HStack justify="between" align="start" className="flex-wrap gap-4">
                    <div className="min-w-0">
                      <HStack gap="sm" align="center" className="mb-2 flex-wrap">
                        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                          {marketplace.name}
                        </h1>
                        {marketplace.isFeatured && <Badge>{t('marketplace.featured')}</Badge>}
                        <Badge variant="secondary">{platformName}</Badge>
                      </HStack>
                      <p className="mb-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
                        {description}
                      </p>
                      <HStack gap="xs" className="mb-4 flex-wrap">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {joinLabel}
                        </span>
                        {updatedLabel && (
                          <span className="text-xs text-muted-foreground">{updatedLabel}</span>
                        )}
                      </HStack>
                      <HStack gap="lg" className="flex-wrap">
                        <VStack gap="none">
                          <span className="text-2xl font-bold text-foreground">
                            {marketplace.sellerCount}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {t('marketplace.sellers')}
                          </span>
                        </VStack>
                        <VStack gap="none">
                          <span className="text-2xl font-bold text-foreground">
                            {marketplace.productCount}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {t('marketplace.products')}
                          </span>
                        </VStack>
                      </HStack>
                    </div>
                    <VStack gap="sm" className="w-full sm:w-auto">
                      <Button onClick={handleJoinGuidance} className="w-full sm:w-auto">
                        {t('marketplace.detail.joinViaGroup')}
                      </Button>
                      <Link href={sellHref}>
                        <Button variant="outline" className="w-full sm:w-auto">
                          {t('marketplace.detail.applySeller')}
                        </Button>
                      </Link>
                    </VStack>
                  </HStack>
                </div>
              </HStack>
            </Card>
          </div>

          <MarketplaceTrustStrip />

          <div className="mb-6 overflow-x-auto border-b border-border">
            <HStack gap="none" className="min-w-max">
              {(['products', 'sellers', 'about'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'products' && t('marketplace.detail.productsTab')}
                  {tab === 'sellers' && t('marketplace.detail.sellersTab')}
                  {tab === 'about' && t('marketplace.detail.aboutTab')}
                </button>
              ))}
            </HStack>
          </div>

          {activeTab === 'products' && (
            <div>
              <div className="mb-5">
                <Input
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder={t('marketplace.detail.searchProducts')}
                  className="h-11 text-sm"
                  leftIcon={<Search className="h-5 w-5 text-muted-foreground" />}
                />
              </div>

              {filteredPreviews.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {filteredPreviews.map(preview => (
                    <CommunityListingCard key={preview.key} preview={preview} />
                  ))}
                </div>
              ) : (
                <Card className="py-12 text-center">
                  <VStack gap="md" align="center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {t('marketplace.detail.noProducts')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('marketplace.detail.noProductsDesc')}
                      </p>
                    </div>
                  </VStack>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'sellers' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sellers.length > 0 ? (
                sellers.map(seller => (
                  <CommunitySellerCard
                    key={seller.sellerID}
                    seller={seller}
                    profile={sellerProfiles[seller.peerID]}
                  />
                ))
              ) : (
                <Card className="col-span-full py-12 text-center">
                  <VStack gap="md" align="center">
                    <Users className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t('marketplace.detail.noSellers')}
                    </p>
                  </VStack>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <h2 className="mb-4 text-xl font-bold text-foreground">
                  {t('marketplace.detail.aboutTitle')}
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('marketplace.detail.joinGuidanceDesc')}
                </p>
              </Card>
              <div className="space-y-4">
                <Card className="p-5">
                  <HStack gap="sm" align="center" className="mb-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      {t('marketplace.detail.trustSignals')}
                    </h3>
                  </HStack>
                  <VStack gap="sm" className="text-sm text-muted-foreground">
                    <span>
                      {t('marketplace.detail.platformSource')}: {platformName}
                    </span>
                    <span>
                      {t('marketplace.detail.joinMethod')}: {joinLabel}
                    </span>
                    <span>{t('marketplace.detail.publicActive')}</span>
                  </VStack>
                </Card>
                <Card className="p-5">
                  <HStack gap="sm" align="center" className="mb-3">
                    <Store className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      {t('marketplace.detail.rulesTitle')}
                    </h3>
                  </HStack>
                  <p className="text-sm text-muted-foreground">
                    {t('marketplace.detail.rulesBody')}
                  </p>
                </Card>
                <Card className="p-5">
                  <h3 className="mb-2 font-semibold text-foreground">
                    {t('policies.buyerProtectionPolicy')}
                  </h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {t('marketplace.detail.buyerProtectionDesc')}
                  </p>
                  <Link
                    href="/policies/buyer-protection"
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    {t('footer.buyerProtection')}
                    <ExternalLink className="ml-1 h-4 w-4" />
                  </Link>
                </Card>
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
