'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header, Footer, ProductSection } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input-compat';
import { MarketplaceTrustFooter } from '@/components/CommunityMarketplace';
import {
  derivePublicMarketplaceCurationRefs,
  formatUserName,
  getImageUrl,
  productCardPriceFieldsFromListItem,
  productDataService,
  resolveProductCardSellerDisplay,
  taxonomyForVertical,
  useCommunityMarketplaceEnrichment,
  useCuration,
  useI18n,
  usePublicMarketplaceDetail,
  useNativeMarketplaceAttribution,
  type PublicMarketplaceListingRef,
  type PublicMarketplaceSeller,
  type ProductListItem,
} from '@mobazha/core';
import type { SearchedUser } from '@mobazha/core/services/api/products';
import {
  fetchFeaturedListings,
  fetchLatestListings,
  searchListings,
  searchProfiles,
} from '@mobazha/core/services/api/products';
import { Search, ShieldCheck, Store } from 'lucide-react';

interface DisplayProduct {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  price: number | string;
  currency?: string;
  divisibility?: number;
  vendorName: string;
  vendorAvatar?: string;
  vendorPeerID?: string;
  rating: number;
  reviewCount: number;
}

interface CuratedStoreCard {
  peerID: string;
  name: string;
  avatarUrl?: string;
}

function isRenderablePreview<T extends { failed: boolean }>(preview: T | undefined): preview is T {
  return preview !== undefined && !preview.failed;
}

function filterByCatalogMode<T extends { vendorPeerID?: string }>(
  items: T[],
  catalogMode: 'open' | 'curated',
  allowedPeers: string[]
): T[] {
  if (catalogMode !== 'curated') return items;
  if (allowedPeers.length === 0) return [];
  const allowed = new Set(allowedPeers);
  return items.filter(item => item.vendorPeerID && allowed.has(item.vendorPeerID));
}

function convertToDisplayProduct(item: ProductListItem): DisplayProduct {
  const priceFields = productCardPriceFieldsFromListItem(item);
  const seller = resolveProductCardSellerDisplay({
    peerID: item.vendorPeerID,
    name: item.vendorName,
    avatarUrl: getImageUrl(item.vendorAvatarHashes?.small),
  });
  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    imageUrl:
      getImageUrl(item.thumbnail?.medium) ||
      getImageUrl(item.thumbnail?.small) ||
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop',
    price: priceFields.price,
    currency: priceFields.currencyCode,
    divisibility: priceFields.divisibility,
    vendorName: seller.name,
    vendorAvatar: seller.avatarUrl,
    vendorPeerID: item.vendorPeerID,
    rating: item.averageRating || 0,
    reviewCount: item.ratingCount || 0,
  };
}

function convertCuratedPreviewToDisplayProduct(
  preview: {
    slug: string;
    title: string;
    peerID: string;
    imageUrl?: string;
    price?: number;
    currency?: string;
    divisibility?: number;
    vendorName?: string;
  },
  sellerProfile?: { displayName?: string; avatarUrl?: string }
): DisplayProduct {
  const seller = resolveProductCardSellerDisplay({
    peerID: preview.peerID,
    name: preview.vendorName,
    profileName: sellerProfile?.displayName,
    profileAvatarUrl: sellerProfile?.avatarUrl,
  });

  return {
    id: `${preview.peerID}:${preview.slug}`,
    slug: preview.slug,
    title: preview.title,
    imageUrl:
      preview.imageUrl ||
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop',
    price: preview.price ?? '',
    currency: preview.currency,
    divisibility: preview.divisibility,
    vendorName: seller.name,
    vendorAvatar: seller.avatarUrl,
    vendorPeerID: preview.peerID,
    rating: 0,
    reviewCount: 0,
  };
}

function MarketplaceShellState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Container size="sm" className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          {actionLabel && onAction ? (
            <Button onClick={onAction} className="mt-2">
              {actionLabel}
            </Button>
          ) : null}
        </Container>
      </main>
      <Footer />
    </div>
  );
}

export function MarketplaceHomePage() {
  const { t } = useI18n();
  const { config, loading, error, retry } = useCuration();
  const marketplaceID = config?.attribution?.marketplaceId || config?.id;
  const {
    detail: publicDetail,
    loading: publicDetailLoading,
    error: publicDetailError,
    refresh: refreshPublicDetail,
  } = usePublicMarketplaceDetail(config?.id);
  const { trackImpression, trackListingClick } = useNativeMarketplaceAttribution(marketplaceID);
  const [latestProducts, setLatestProducts] = useState<DisplayProduct[]>([]);
  const [popularProducts, setPopularProducts] = useState<DisplayProduct[]>([]);
  const [featuredStores, setFeaturedStores] = useState<SearchedUser[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const publicCurationRefs = useMemo(
    () => derivePublicMarketplaceCurationRefs(publicDetail),
    [publicDetail]
  );

  const curationListingRefs = useMemo<PublicMarketplaceListingRef[]>(() => {
    const seen = new Set<string>();
    const refs: PublicMarketplaceListingRef[] = [];
    const push = (ref: PublicMarketplaceListingRef) => {
      const key = `${ref.peerID}:${ref.slug}`;
      if (seen.has(key)) return;
      seen.add(key);
      refs.push(ref);
    };
    publicCurationRefs.bannerListingRefs.forEach(push);
    publicCurationRefs.curatedListingRefs.forEach(push);
    publicCurationRefs.fallbackListingRefs.forEach(push);
    return refs;
  }, [publicCurationRefs]);

  const curationSellerPeerIDs = useMemo(
    () =>
      Array.from(
        new Set([
          ...publicCurationRefs.curatedSellerPeerIDs,
          ...publicCurationRefs.fallbackSellerPeerIDs,
          ...curationListingRefs.map(ref => ref.peerID),
        ])
      ),
    [
      publicCurationRefs.curatedSellerPeerIDs,
      publicCurationRefs.fallbackSellerPeerIDs,
      curationListingRefs,
    ]
  );

  const {
    listingPreviews: curationPreviews,
    sellerProfiles: curationSellerProfiles,
    listingsLoading: curationListingsLoading,
    profilesLoading: curationProfilesLoading,
  } = useCommunityMarketplaceEnrichment(curationListingRefs, curationSellerPeerIDs);

  const curationPreviewLookup = useMemo(() => {
    const lookup = new Map<string, (typeof curationPreviews)[number]>();
    for (const preview of curationPreviews) {
      lookup.set(`${preview.peerID}:${preview.slug}`, preview);
    }
    return lookup;
  }, [curationPreviews]);

  const resolveCurationPreview = useCallback(
    (ref: PublicMarketplaceListingRef) => curationPreviewLookup.get(`${ref.peerID}:${ref.slug}`),
    [curationPreviewLookup]
  );

  const bannerProducts = useMemo(
    () =>
      publicCurationRefs.bannerListingRefs
        .map(resolveCurationPreview)
        .filter(isRenderablePreview)
        .map(preview =>
          convertCuratedPreviewToDisplayProduct(preview, curationSellerProfiles[preview.peerID])
        ),
    [publicCurationRefs.bannerListingRefs, resolveCurationPreview, curationSellerProfiles]
  );

  const curatedListingProducts = useMemo(
    () =>
      publicCurationRefs.curatedListingRefs
        .map(resolveCurationPreview)
        .filter(isRenderablePreview)
        .map(preview =>
          convertCuratedPreviewToDisplayProduct(preview, curationSellerProfiles[preview.peerID])
        ),
    [publicCurationRefs.curatedListingRefs, resolveCurationPreview, curationSellerProfiles]
  );

  const featuredListingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const product of bannerProducts) {
      keys.add(`${product.vendorPeerID}:${product.slug}`);
    }
    for (const product of curatedListingProducts) {
      keys.add(`${product.vendorPeerID}:${product.slug}`);
    }
    return keys;
  }, [bannerProducts, curatedListingProducts]);

  const additionalListingProducts = useMemo(
    () =>
      publicCurationRefs.fallbackListingRefs
        .map(resolveCurationPreview)
        .filter(isRenderablePreview)
        .filter(preview => !featuredListingKeys.has(`${preview.peerID}:${preview.slug}`))
        .map(preview =>
          convertCuratedPreviewToDisplayProduct(preview, curationSellerProfiles[preview.peerID])
        ),
    [
      publicCurationRefs.fallbackListingRefs,
      resolveCurationPreview,
      featuredListingKeys,
      curationSellerProfiles,
    ]
  );

  const isCuratedCatalog = config?.catalogMode === 'curated';
  const useAuthorizedCurationFeeds = Boolean(isCuratedCatalog);
  const suppressGlobalDiscoveryAffordances = Boolean(isCuratedCatalog);
  const curatedFeedsLoading = Boolean(
    isCuratedCatalog && (publicDetailLoading || curationListingsLoading || curationProfilesLoading)
  );

  const publicSellersByPeerID = useMemo(() => {
    const lookup = new Map<string, PublicMarketplaceSeller>();
    for (const seller of publicDetail?.sellers ?? []) {
      lookup.set(seller.peerID, seller);
    }
    return lookup;
  }, [publicDetail?.sellers]);

  const previewVendorNameByPeerID = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const preview of curationPreviews) {
      if (!isRenderablePreview(preview)) continue;
      const candidate = preview.vendorName?.trim();
      if (!candidate || lookup.has(preview.peerID)) continue;
      lookup.set(preview.peerID, candidate);
    }
    return lookup;
  }, [curationPreviews]);

  const curatedStoreCards = useMemo<CuratedStoreCard[]>(() => {
    return publicCurationRefs.curatedSellerPeerIDs.flatMap(peerID => {
      const profile = curationSellerProfiles[peerID];
      const profileName = profile?.displayName?.trim();
      const publicSeller = publicSellersByPeerID.get(peerID);
      const productGroupName = publicSeller?.productGroups
        ?.map(group => group.name?.trim())
        .find(Boolean);
      const previewVendorName = previewVendorNameByPeerID.get(peerID);
      const readableName = profileName || productGroupName || previewVendorName;

      if (!readableName) return [];

      return [
        {
          peerID,
          name: readableName,
          avatarUrl: profile?.avatarUrl,
        },
      ];
    });
  }, [
    publicCurationRefs.curatedSellerPeerIDs,
    curationSellerProfiles,
    publicSellersByPeerID,
    previewVendorNameByPeerID,
  ]);

  const activeCuratedStores = useMemo(
    () => (curatedStoreCards.length > 0 ? curatedStoreCards : []),
    [curatedStoreCards]
  );

  const taxonomy = useMemo(() => {
    if (!config) return [];
    return taxonomyForVertical(config.vertical, config.taxonomy);
  }, [config]);

  useEffect(() => {
    if (!config) return;
    const activeConfig = config;
    let cancelled = false;

    async function loadFeeds() {
      setIsLoadingProducts(true);
      setIsLoadingPopular(true);
      setIsLoadingStores(true);

      try {
        const allowedPeers = activeConfig.allowedPeers ?? [];
        const catalogQuery = activeConfig.catalogQuery?.trim() || '*';
        const isCurated = activeConfig.catalogMode === 'curated';

        if (isCurated) {
          setLatestProducts([]);
          setPopularProducts([]);
          setFeaturedStores([]);
          return;
        }

        if (catalogQuery !== '*') {
          const [latestResult, popularResult, storesResult] = await Promise.all([
            searchListings({
              query: catalogQuery,
              pageSize: 12,
              sortBy: 'added-desc',
              browse: 'all',
            }),
            searchListings({
              query: catalogQuery,
              pageSize: 8,
              sortBy: 'online-desc',
              browse: 'all',
            }),
            searchProfiles({
              query: catalogQuery,
              pageSize: 6,
              vendor: true,
            }),
          ]);

          if (cancelled) return;

          setLatestProducts(latestResult.products.map(convertToDisplayProduct));
          setPopularProducts(popularResult.products.map(convertToDisplayProduct));
          setFeaturedStores(storesResult.users);
          return;
        }

        const [latest, popular, stores] = await Promise.all([
          fetchLatestListings(12),
          fetchFeaturedListings(8),
          productDataService.getFeaturedStores(6),
        ]);

        if (cancelled) return;

        const latestFiltered = filterByCatalogMode(latest, activeConfig.catalogMode, allowedPeers);
        const popularFiltered = filterByCatalogMode(
          popular,
          activeConfig.catalogMode,
          allowedPeers
        );
        const storesFiltered =
          activeConfig.catalogMode === 'curated'
            ? stores.filter(store => store.peerID && allowedPeers.includes(store.peerID))
            : stores;

        setLatestProducts(latestFiltered.map(convertToDisplayProduct));
        setPopularProducts(popularFiltered.map(convertToDisplayProduct));
        setFeaturedStores(storesFiltered);
      } catch (loadError) {
        console.error('Failed to load marketplace feeds:', loadError);
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false);
          setIsLoadingPopular(false);
          setIsLoadingStores(false);
        }
      }
    }

    void loadFeeds();
    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    if (!marketplaceID || !config) return;
    trackImpression();
  }, [config, marketplaceID, trackImpression]);

  const handleProductCardClick = useCallback(
    (product: { slug: string; vendorPeerID?: string }) => {
      if (!marketplaceID) return;
      trackListingClick({
        listingSlug: product.slug,
        peerID: product.vendorPeerID,
      });
    },
    [marketplaceID, trackListingClick]
  );

  if (loading) {
    return (
      <MarketplaceShellState
        title={t('marketplaceStarter.loadingTitle', { defaultValue: 'Loading marketplace' })}
        description={t('marketplaceStarter.loadingDescription', {
          defaultValue: 'Preparing curated discovery…',
        })}
      />
    );
  }

  if (error || !config) {
    return (
      <MarketplaceShellState
        title={t('marketplaceStarter.errorTitle', { defaultValue: 'Marketplace unavailable' })}
        description={t('marketplaceStarter.errorDescription', {
          defaultValue: 'We could not load this marketplace right now. Please try again.',
        })}
        actionLabel={t('common.retry', { defaultValue: 'Retry' })}
        onAction={retry}
      />
    );
  }

  if (config.catalogMode === 'curated' && publicDetailError) {
    return (
      <MarketplaceShellState
        title={t('marketplaceStarter.errorTitle', { defaultValue: 'Marketplace unavailable' })}
        description={t('marketplaceStarter.errorDescription', {
          defaultValue: 'We could not load this marketplace right now. Please try again.',
        })}
        actionLabel={t('common.retry', { defaultValue: 'Retry' })}
        onAction={refreshPublicDetail}
      />
    );
  }

  const brandName =
    config.brand.name || t('marketplaceStarter.defaultName', { defaultValue: 'Marketplace' });
  const searchHref = `/search?q=${encodeURIComponent(searchQuery.trim() || config.catalogQuery || '*')}`;
  const showDiscoverySearch = !suppressGlobalDiscoveryAffordances;
  const showDiscoveryTaxonomy = !suppressGlobalDiscoveryAffordances && taxonomy.length > 0;
  const discoveryPopularProducts = useAuthorizedCurationFeeds ? [] : popularProducts;
  const discoveryLatestProducts = useAuthorizedCurationFeeds
    ? additionalListingProducts
    : latestProducts;
  const discoveryPopularLoading = useAuthorizedCurationFeeds ? false : isLoadingPopular;
  const discoveryLatestLoading = useAuthorizedCurationFeeds
    ? curatedFeedsLoading
    : isLoadingProducts;
  const showPopularSection =
    !useAuthorizedCurationFeeds && (isLoadingPopular || discoveryPopularProducts.length > 0);
  const showLatestSection = discoveryLatestLoading || discoveryLatestProducts.length > 0;

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <Container size="xl" className="py-8 sm:py-12">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-4">
                {config.brand.logo ? (
                  <img
                    src={config.brand.logo}
                    alt={brandName}
                    className="h-12 w-auto object-contain"
                  />
                ) : null}
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">{brandName}</h1>
                {config.brand.tagline ? (
                  <p className="text-lg text-muted-foreground max-w-2xl">{config.brand.tagline}</p>
                ) : null}
                {showDiscoverySearch ? (
                  <form
                    className="flex gap-2 max-w-xl"
                    onSubmit={event => {
                      event.preventDefault();
                      window.location.href = searchHref;
                    }}
                  >
                    <Input
                      value={searchQuery}
                      onChange={event => setSearchQuery(event.target.value)}
                      placeholder={t('marketplaceStarter.searchPlaceholder', {
                        defaultValue: 'Search this marketplace',
                      })}
                      className="flex-1"
                    />
                    <Button type="submit" className="shrink-0">
                      <Search className="h-4 w-4 mr-2" />
                      {t('common.search', { defaultValue: 'Search' })}
                    </Button>
                  </form>
                ) : null}
              </div>
              {config.brand.banner ? (
                <img
                  src={config.brand.banner}
                  alt=""
                  className="w-full max-h-56 object-cover rounded-[var(--store-radius,0.75rem)] border border-border"
                />
              ) : null}
            </div>
          </Container>
        </section>

        {showDiscoveryTaxonomy ? (
          <section className="py-4 border-b border-border">
            <Container size="xl">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {taxonomy.map(category => (
                  <Link
                    key={category.id}
                    href={`/search?q=${encodeURIComponent(config.catalogQuery || '*')}&category=${encodeURIComponent(category.id)}`}
                    className="flex-shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        ) : null}

        {bannerProducts.length > 0 && (
          <ProductSection
            title={t('marketplaceStarter.bannerTitle', { defaultValue: 'Featured banners' })}
            subtitle={t('marketplaceStarter.bannerSubtitle', {
              defaultValue: 'Operator spotlight listings',
            })}
            products={bannerProducts}
            isLoading={useAuthorizedCurationFeeds && curatedFeedsLoading}
            showViewAll={false}
            onProductClick={handleProductCardClick}
          />
        )}

        {curatedListingProducts.length > 0 && (
          <ProductSection
            title={t('marketplaceStarter.curatedTitle', { defaultValue: 'Curated picks' })}
            subtitle={t('marketplaceStarter.curatedSubtitle', {
              defaultValue: 'Operator-selected highlights',
            })}
            products={curatedListingProducts}
            isLoading={useAuthorizedCurationFeeds && curatedFeedsLoading}
            showViewAll={false}
            onProductClick={handleProductCardClick}
          />
        )}

        {showPopularSection ? (
          <ProductSection
            title={t('marketplaceStarter.popularTitle', { defaultValue: 'Popular picks' })}
            subtitle={t('marketplaceStarter.popularSubtitle', {
              defaultValue: 'Trending in this marketplace',
            })}
            products={discoveryPopularProducts}
            isLoading={discoveryPopularLoading}
            showViewAll
            viewAllHref={searchHref}
            onProductClick={handleProductCardClick}
          />
        ) : null}

        {showLatestSection ? (
          <ProductSection
            title={t('marketplaceStarter.latestTitle', { defaultValue: 'Latest listings' })}
            subtitle={t('marketplaceStarter.latestSubtitle', {
              defaultValue: 'Fresh from approved sellers',
            })}
            products={discoveryLatestProducts}
            isLoading={discoveryLatestLoading}
            showViewAll={!suppressGlobalDiscoveryAffordances}
            viewAllHref={`/search?q=${encodeURIComponent(config.catalogQuery || '*')}&sortBy=newest`}
            showStoreAttribution
            onProductClick={handleProductCardClick}
          />
        ) : null}

        {(useAuthorizedCurationFeeds
          ? curatedFeedsLoading || activeCuratedStores.length > 0
          : isLoadingStores || activeCuratedStores.length > 0 || featuredStores.length > 0) && (
          <section className="py-8 sm:py-10">
            <Container size="xl">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground">
                  {t('marketplaceStarter.storesTitle', { defaultValue: 'Featured stores' })}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {t('marketplaceStarter.storesSubtitle', {
                    defaultValue: 'Shop directly from curated sellers',
                  })}
                </p>
              </div>
              {(useAuthorizedCurationFeeds ? curatedFeedsLoading : isLoadingStores) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-28 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCuratedStores.length > 0
                    ? activeCuratedStores.map(store => (
                        <Link
                          key={store.peerID}
                          href={`/store/${store.peerID}`}
                          className="rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted overflow-hidden">
                              {store.avatarUrl ? (
                                <img
                                  src={store.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Store className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{store.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('marketplaceStarter.visitStore', {
                                  defaultValue: 'Visit store',
                                })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))
                    : featuredStores.map(store => (
                        <Link
                          key={store.peerID}
                          href={`/store/${store.peerID}`}
                          className="rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted overflow-hidden">
                              {store.avatar ? (
                                <img
                                  src={getImageUrl(store.avatar)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Store className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {formatUserName(
                                  { name: store.name, handle: store.handle, peerID: store.peerID },
                                  { fallback: 'Seller' }
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t('marketplaceStarter.visitStore', {
                                  defaultValue: 'Visit store',
                                })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                </div>
              )}
            </Container>
          </section>
        )}

        <section className="py-8 border-t border-border bg-muted/30">
          <Container size="xl">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <p>
                {t('marketplaceStarter.trustCopy', {
                  defaultValue:
                    'Every order stays with the seller you choose. Buyer protection and secure payments apply store by store.',
                })}
              </p>
            </div>
            <MarketplaceTrustFooter />
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
