// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import {
  CommunityListingCard,
  CommunitySellerCard,
  CollectibleMarketplaceSignal,
  MarketplaceLogo,
  MarketplaceTrustStrip,
} from '@/components/CommunityMarketplace';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Badge } from '@/components/ui/badge';
import {
  derivePublicMarketplaceCurationRefs,
  usePublicMarketplaceDetail,
  useCommunityMarketplaceEnrichment,
  useCollectibleMarketplaceAttribution,
  useNativeMarketplaceAttribution,
  useI18n,
  isCollectibleMarketplaceVertical,
  isNativeMarketplaceSelfServeEligible,
  marketplaceBuyerAccessModeKey,
  marketplaceSellerReviewModeKey,
  marketplaceVerticalKey,
  MARKETPLACE_CATALOG_MODE_KEYS,
  MARKETPLACE_DISCOVERABILITY_KEYS,
  MARKETPLACE_SELLER_ENTRY_MODE_KEYS,
  COLLECTIBLE_MARKETPLACE_CATEGORY_FILTERS,
  COLLECTIBLE_MARKETPLACE_LISTINGS_SECTION_ID,
  appendCollectibleAttributionToHref,
  communityProductHref,
  filterCollectibleListingPreviews,
  resolveCollectibleMarketplaceDisplayCopy,
  type CollectibleMarketplaceCategoryFilter,
  type PublicMarketplaceListingRef,
  type PublicMarketplaceSeller,
} from '@mobazha/core';
import { ExternalLink, Package, RefreshCw, Search, ShieldCheck, Store, Users } from 'lucide-react';

type DetailTab = 'products' | 'sellers' | 'about';

function isRenderablePreview<T extends { failed: boolean }>(preview: T | undefined): preview is T {
  return preview !== undefined && !preview.failed;
}

const COLLECTIBLE_FILTER_I18N: Record<
  CollectibleMarketplaceCategoryFilter,
  | 'marketplace.detail.collectibles.filterAll'
  | 'marketplace.detail.collectibles.filterSports'
  | 'marketplace.detail.collectibles.filterPokemon'
  | 'marketplace.detail.collectibles.filterMtg'
  | 'marketplace.detail.collectibles.filterOtherTcg'
> = {
  all: 'marketplace.detail.collectibles.filterAll',
  sports: 'marketplace.detail.collectibles.filterSports',
  pokemon: 'marketplace.detail.collectibles.filterPokemon',
  mtg: 'marketplace.detail.collectibles.filterMtg',
  tcg: 'marketplace.detail.collectibles.filterOtherTcg',
};

export interface MarketplaceDetailPageContentProps {
  identifier: string;
}

export function MarketplaceDetailPageContent({ identifier }: MarketplaceDetailPageContentProps) {
  const { t, formatRelativeTime, locale } = useI18n();
  const { detail, loading, error, refresh } = usePublicMarketplaceDetail(identifier);
  const [activeTab, setActiveTab] = useState<DetailTab>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [collectibleCategory, setCollectibleCategory] =
    useState<CollectibleMarketplaceCategoryFilter>('all');

  const marketplace = detail?.marketplace;
  const curationRefs = useMemo(() => derivePublicMarketplaceCurationRefs(detail), [detail]);
  const sellers = useMemo(() => detail?.sellers ?? [], [detail?.sellers]);

  const listingRefs = useMemo<PublicMarketplaceListingRef[]>(() => {
    const seen = new Set<string>();
    const ordered: PublicMarketplaceListingRef[] = [];
    const push = (ref: PublicMarketplaceListingRef) => {
      const key = `${ref.peerID}:${ref.slug}`;
      if (seen.has(key)) return;
      seen.add(key);
      ordered.push(ref);
    };
    curationRefs.bannerListingRefs.forEach(push);
    curationRefs.curatedListingRefs.forEach(push);
    curationRefs.fallbackListingRefs.forEach(push);
    return ordered;
  }, [curationRefs]);

  const sellerPeerIDs = useMemo(() => {
    const peerIDs = new Set<string>([
      ...curationRefs.curatedSellerPeerIDs,
      ...curationRefs.fallbackSellerPeerIDs,
    ]);
    for (const ref of listingRefs) {
      if (ref.peerID?.trim()) {
        peerIDs.add(ref.peerID.trim());
      }
    }
    return Array.from(peerIDs);
  }, [curationRefs.curatedSellerPeerIDs, curationRefs.fallbackSellerPeerIDs, listingRefs]);

  const { listingPreviews, sellerProfiles } = useCommunityMarketplaceEnrichment(
    listingRefs,
    sellerPeerIDs
  );

  const listingPreviewLookup = useMemo(() => {
    const lookup = new Map<string, (typeof listingPreviews)[number]>();
    for (const preview of listingPreviews) {
      lookup.set(`${preview.peerID}:${preview.slug}`, preview);
    }
    return lookup;
  }, [listingPreviews]);

  const resolvePreview = useCallback(
    (ref: PublicMarketplaceListingRef) => listingPreviewLookup.get(`${ref.peerID}:${ref.slug}`),
    [listingPreviewLookup]
  );

  const bannerPreviews = useMemo(
    () => curationRefs.bannerListingRefs.map(resolvePreview).filter(isRenderablePreview),
    [curationRefs.bannerListingRefs, resolvePreview]
  );

  const curatedListingPreviews = useMemo(
    () => curationRefs.curatedListingRefs.map(resolvePreview).filter(isRenderablePreview),
    [curationRefs.curatedListingRefs, resolvePreview]
  );

  const fallbackListingPreviews = useMemo(
    () => curationRefs.fallbackListingRefs.map(resolvePreview).filter(isRenderablePreview),
    [curationRefs.fallbackListingRefs, resolvePreview]
  );

  const sellersByPeerID = useMemo(() => {
    const lookup = new Map<string, PublicMarketplaceSeller>();
    for (const seller of sellers) {
      lookup.set(seller.peerID, seller);
    }
    return lookup;
  }, [sellers]);

  const curatedSellers = useMemo<PublicMarketplaceSeller[]>(
    () => curationRefs.curatedSellerPeerIDs.flatMap(peerID => sellersByPeerID.get(peerID) ?? []),
    [curationRefs.curatedSellerPeerIDs, sellersByPeerID]
  );

  const curatedSellerPeerIDSet = useMemo(
    () => new Set(curatedSellers.map(seller => seller.peerID)),
    [curatedSellers]
  );

  const remainingSellers = useMemo(
    () => sellers.filter(seller => !curatedSellerPeerIDSet.has(seller.peerID)),
    [sellers, curatedSellerPeerIDSet]
  );

  const isCollectibleMarketplace = isCollectibleMarketplaceVertical(marketplace?.vertical);
  const collectibleAttribution = useCollectibleMarketplaceAttribution(
    isCollectibleMarketplace,
    identifier
  );
  const { trackImpression, trackListingClick } = useNativeMarketplaceAttribution(marketplace?.id);

  useEffect(() => {
    if (loading || error || !marketplace) return;
    trackImpression();
  }, [loading, error, marketplace, trackImpression]);

  const handleListingPreviewClick = useCallback(
    (preview: { slug: string; peerID?: string; loading?: boolean }) => {
      if (preview.loading) return;
      trackListingClick({
        listingSlug: preview.slug,
        peerID: preview.peerID,
      });
    },
    [trackListingClick]
  );

  const filteredPreviews = useMemo(() => {
    let result = fallbackListingPreviews;

    if (isCollectibleMarketplace && collectibleCategory !== 'all') {
      result = filterCollectibleListingPreviews(result, collectibleCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      preview =>
        preview.title.toLowerCase().includes(q) ||
        preview.slug.toLowerCase().includes(q) ||
        (preview.vendorName || '').toLowerCase().includes(q)
    );
  }, [fallbackListingPreviews, searchQuery, isCollectibleMarketplace, collectibleCategory]);

  const hasCollectibleCategoryFilter = isCollectibleMarketplace && collectibleCategory !== 'all';
  const showCollectibleCategoryEmpty =
    hasCollectibleCategoryFilter && filteredPreviews.length === 0;

  const publicSiteUrl = marketplace?.publicURL?.trim() ?? '';
  const selfServeEligible = marketplace ? isNativeMarketplaceSelfServeEligible(marketplace) : false;
  const sellHref = marketplace
    ? `/marketplace/${marketplace.slug || marketplace.id}/sell`
    : '/marketplace';
  const sellerAdmissionBlockedMessage =
    marketplace?.sellerEntryMode === 'operator_invited'
      ? t('marketplace.detail.sellerAdmissionOperatorInvited')
      : t('marketplace.detail.sellerAdmissionSelfServeDisabled');

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
                    {error || t('marketplace.detail.unavailableDescNative')}
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

  const verticalLabel = t(marketplaceVerticalKey(marketplace.vertical));
  const buyerAccessLabel = t(marketplaceBuyerAccessModeKey(marketplace.buyerAccessMode));
  const sellerReviewLabel = t(marketplaceSellerReviewModeKey(marketplace.sellerReviewMode));
  const catalogLabel = t(MARKETPLACE_CATALOG_MODE_KEYS[marketplace.catalogMode]);
  const discoverabilityLabel = t(MARKETPLACE_DISCOVERABILITY_KEYS[marketplace.discoverability]);
  const sellerEntryLabel = t(MARKETPLACE_SELLER_ENTRY_MODE_KEYS[marketplace.sellerEntryMode]);
  const displayCopy = isCollectibleMarketplace
    ? resolveCollectibleMarketplaceDisplayCopy(marketplace, locale, t)
    : null;
  const description =
    displayCopy?.description ||
    marketplace.description?.trim() ||
    (isCollectibleMarketplace
      ? t('marketplace.detail.collectibles.defaultDescription')
      : t('marketplace.defaultDescription'));
  const marketplaceTitle = displayCopy?.name || marketplace.name;
  const updatedLabel = marketplace.updatedAt
    ? t('marketplace.updatedAgo', { time: formatRelativeTime(marketplace.updatedAt) })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={marketplaceTitle} />

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
            <Card className="overflow-hidden p-4 sm:p-6">
              <HStack gap="lg" align="start" className="flex-wrap">
                <MarketplaceLogo
                  name={marketplace.name}
                  identifier={marketplace.id}
                  logoURL={marketplace.logoURL}
                  size="lg"
                  className="-mt-10 border-4 border-background shadow-lg sm:-mt-12"
                />
                <div className="min-w-0 w-full flex-1 sm:w-auto">
                  <HStack justify="between" align="start" className="flex-wrap gap-4">
                    <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                      <HStack gap="sm" align="center" className="mb-2 w-full flex-wrap">
                        <h1 className="min-w-0 max-w-full break-words text-2xl font-bold text-foreground sm:text-3xl">
                          {marketplaceTitle}
                        </h1>
                        {isCollectibleMarketplace && (
                          <Badge variant="secondary">
                            {t('marketplace.detail.collectibles.badge')}
                          </Badge>
                        )}
                        <Badge variant="secondary">{verticalLabel}</Badge>
                      </HStack>
                      <p className="mb-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
                        {description}
                      </p>
                      <HStack gap="xs" className="mb-4 flex-wrap">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {catalogLabel}
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
                      {selfServeEligible ? (
                        <Button
                          asChild
                          className="w-full sm:w-auto"
                          data-testid="marketplace-apply-to-sell"
                        >
                          <Link href={sellHref}>{t('marketplace.detail.applyToSell')}</Link>
                        </Button>
                      ) : (
                        <div className="max-w-xs rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                          {sellerAdmissionBlockedMessage}
                        </div>
                      )}
                      {publicSiteUrl ? (
                        <Button asChild variant="outline" className="w-full sm:w-auto">
                          <a href={publicSiteUrl} target="_blank" rel="noopener noreferrer">
                            {t('marketplace.detail.visitPublicSite')}
                            <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
                          </a>
                        </Button>
                      ) : null}
                    </VStack>
                  </HStack>
                </div>
              </HStack>
            </Card>
          </div>

          {isCollectibleMarketplace ? (
            <CollectibleMarketplaceSignal
              listingsSectionId={COLLECTIBLE_MARKETPLACE_LISTINGS_SECTION_ID}
              sellerAdmissionLabel={sellerReviewLabel}
            />
          ) : (
            <MarketplaceTrustStrip />
          )}

          <div className="mb-6 w-full max-w-full overflow-x-auto border-b border-border">
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
            <div
              id={COLLECTIBLE_MARKETPLACE_LISTINGS_SECTION_ID}
              tabIndex={-1}
              className="scroll-mt-24 outline-none"
            >
              {bannerPreviews.length > 0 ? (
                <div className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold text-foreground">
                    {t('marketplace.detail.featuredBannersTitle', { defaultValue: 'Featured' })}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {bannerPreviews.map(preview => {
                      const baseHref = communityProductHref(preview.slug, preview.peerID);
                      const productHref = isCollectibleMarketplace
                        ? appendCollectibleAttributionToHref(baseHref, collectibleAttribution)
                        : undefined;
                      return (
                        <CommunityListingCard
                          key={`banner-${preview.key}`}
                          preview={preview}
                          sellerProfile={sellerProfiles[preview.peerID]}
                          productHref={productHref}
                          onClick={() => handleListingPreviewClick(preview)}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {curatedListingPreviews.length > 0 ? (
                <div className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold text-foreground">
                    {t('marketplace.detail.featuredListingsTitle')}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {curatedListingPreviews.map(preview => {
                      const baseHref = communityProductHref(preview.slug, preview.peerID);
                      const productHref = isCollectibleMarketplace
                        ? appendCollectibleAttributionToHref(baseHref, collectibleAttribution)
                        : undefined;
                      return (
                        <CommunityListingCard
                          key={`curated-${preview.key}`}
                          preview={preview}
                          sellerProfile={sellerProfiles[preview.peerID]}
                          productHref={productHref}
                          onClick={() => handleListingPreviewClick(preview)}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mb-5">
                <Input
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder={t('marketplace.detail.searchProducts')}
                  className="h-11 text-sm"
                  leftIcon={<Search className="h-5 w-5 text-muted-foreground" />}
                />
              </div>

              {isCollectibleMarketplace && (
                <div
                  className="mb-5 flex flex-wrap gap-2"
                  data-testid="collectible-category-filters"
                >
                  {COLLECTIBLE_MARKETPLACE_CATEGORY_FILTERS.map(filterId => {
                    const active = collectibleCategory === filterId;
                    return (
                      <button
                        key={filterId}
                        type="button"
                        data-testid={`collectible-category-${filterId}`}
                        onClick={() => setCollectibleCategory(filterId)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t(COLLECTIBLE_FILTER_I18N[filterId])}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredPreviews.length > 0 ? (
                <div>
                  {curatedListingPreviews.length > 0 ? (
                    <h2 className="mb-3 text-lg font-semibold text-foreground">
                      {t('marketplace.detail.allListingsTitle')}
                    </h2>
                  ) : null}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {filteredPreviews.map(preview => {
                      const baseHref = communityProductHref(preview.slug, preview.peerID);
                      const productHref = isCollectibleMarketplace
                        ? appendCollectibleAttributionToHref(baseHref, collectibleAttribution)
                        : undefined;

                      return (
                        <CommunityListingCard
                          key={preview.key}
                          preview={preview}
                          sellerProfile={sellerProfiles[preview.peerID]}
                          productHref={productHref}
                          onClick={() => handleListingPreviewClick(preview)}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card className="py-12 text-center">
                  <VStack gap="md" align="center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {showCollectibleCategoryEmpty
                          ? t('marketplace.detail.collectibles.noCategoryProducts')
                          : t('marketplace.detail.noProducts')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {showCollectibleCategoryEmpty
                          ? t('marketplace.detail.collectibles.noCategoryProductsDesc')
                          : t('marketplace.detail.noProductsDesc')}
                      </p>
                    </div>
                  </VStack>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'sellers' && (
            <div>
              {curatedSellers.length > 0 ? (
                <div className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold text-foreground">
                    {t('marketplace.detail.featuredSellersTitle')}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {curatedSellers.map(seller => (
                      <CommunitySellerCard
                        key={`featured-${seller.peerID}`}
                        seller={seller}
                        profile={sellerProfiles[seller.peerID]}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {curatedSellers.length > 0 ? (
                remainingSellers.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-foreground">
                      {t('marketplace.detail.allSellersTitle')}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {remainingSellers.map(seller => (
                        <CommunitySellerCard
                          key={seller.peerID}
                          seller={seller}
                          profile={sellerProfiles[seller.peerID]}
                        />
                      ))}
                    </div>
                  </div>
                ) : null
              ) : sellers.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sellers.map(seller => (
                    <CommunitySellerCard
                      key={seller.peerID}
                      seller={seller}
                      profile={sellerProfiles[seller.peerID]}
                    />
                  ))}
                </div>
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
              </Card>
              <div className="space-y-4">
                <Card className="p-5">
                  <HStack gap="sm" align="center" className="mb-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      {t('marketplace.detail.accessTitle')}
                    </h3>
                  </HStack>
                  <VStack gap="sm" className="text-sm text-muted-foreground">
                    <span>
                      {t('marketplace.detail.buyerAccessPolicy')}: {buyerAccessLabel}
                    </span>
                    <span>
                      {t('marketplace.detail.sellerEntryMode')}: {sellerEntryLabel}
                    </span>
                    <span>
                      {t('marketplace.detail.sellerReviewMode')}: {sellerReviewLabel}
                    </span>
                    <span>
                      {t('marketplace.detail.catalogMode')}: {catalogLabel}
                    </span>
                    <span>
                      {t('marketplace.detail.discoverability')}: {discoverabilityLabel}
                    </span>
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
                    {t('marketplace.detail.rulesBodyNative')}
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
