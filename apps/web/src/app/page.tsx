'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Header, Hero, ProductSection, Footer } from '@/components';
import { MobileHeader } from '@/components/MobileHeader';
import { StoreHero } from '@/components/StoreHero';
import { StoreSections } from '@/components/store-sections';
import { BrandedHeroHeader } from '@/components/store-sections/BrandedHeroHeader';
import {
  FeaturedStoresSection,
  ValuePropsSection,
  PlatformStatsSection,
} from '@/components/SaaSHome';
import {
  useI18n,
  useUserStore,
  useStorefrontConfigPublic,
  productDataService,
  getImageUrl,
  isStandalone,
} from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import type { SearchedUser } from '@mobazha/core/services/api/products';
import { getListingsWithDedup } from '@/utils/requestDedup';

const HOMEPAGE_EXCLUDE_TYPES = new Set(['hero', 'testimonials', 'store-tabs']);
const noopFn = () => {};

interface DisplayProduct {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  price: number;
  currency?: string;
  divisibility?: number;
  originalPrice?: number;
  vendorName: string;
  vendorAvatar?: string;
  vendorPeerID?: string;
  rating: number;
  reviewCount: number;
  freeShipping?: boolean;
  isDigital?: boolean;
  moderators?: string[];
}

function convertToDisplayProduct(item: ProductListItem): DisplayProduct {
  const vendorName =
    item.vendorName ||
    (item.vendorPeerID
      ? `${item.vendorPeerID.substring(0, 6)}…${item.vendorPeerID.slice(-4)}`
      : '');
  const vendorAvatar = getImageUrl(item.vendorAvatarHashes?.small);

  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    imageUrl:
      getImageUrl(item.thumbnail?.medium) ||
      getImageUrl(item.thumbnail?.small) ||
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop',
    price: item.price?.amount || 0,
    currency: item.price?.currency?.code || 'USD',
    divisibility: item.price?.currency?.divisibility,
    vendorName,
    vendorAvatar,
    vendorPeerID: item.vendorPeerID,
    rating: item.averageRating || 0,
    reviewCount: item.ratingCount || 0,
    freeShipping: item.freeShipping?.length ? true : false,
    isDigital: item.contractType === 'SERVICE' || item.contractType === 'DIGITAL_GOOD',
    moderators: item.moderators,
  };
}

export default function HomePage() {
  const { t } = useI18n();
  const standalone = isStandalone();

  if (standalone) {
    return <StandaloneHomePage />;
  }

  return <SaaSHomePage />;
}

// ===================== SaaS Home Page =====================

function SaaSHomePage() {
  const { t } = useI18n();

  const [featuredStores, setFeaturedStores] = useState<SearchedUser[]>([]);
  const [latestProducts, setLatestProducts] = useState<DisplayProduct[]>([]);
  const [platformStats, setPlatformStats] = useState({ storeCount: 0, listingCount: 0 });
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    let cancelled = false;

    async function fetchSaaSData() {
      loadedRef.current = true;

      // Fetch stores
      productDataService
        .getFeaturedStores(6)
        .then(stores => {
          if (!cancelled) {
            setFeaturedStores(stores);
            setIsLoadingStores(false);
          }
        })
        .catch(() => {
          if (!cancelled) setIsLoadingStores(false);
        });

      // Fetch latest products
      productDataService
        .getLatestProducts(12)
        .then(products => {
          if (!cancelled) {
            setLatestProducts(products.map(convertToDisplayProduct));
            setIsLoadingProducts(false);
          }
        })
        .catch(() => {
          if (!cancelled) setIsLoadingProducts(false);
        });

      // Fetch platform stats
      productDataService
        .getPlatformStats()
        .then(stats => {
          if (!cancelled) {
            setPlatformStats(stats);
            setIsLoadingStats(false);
          }
        })
        .catch(() => {
          if (!cancelled) setIsLoadingStats(false);
        });
    }

    fetchSaaSData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      <Header />

      <main>
        {/* Why: Hero + Value Props */}
        <Hero />
        <ValuePropsSection />

        {/* What: Featured Stores */}
        <FeaturedStoresSection stores={featuredStores} isLoading={isLoadingStores} />

        {/* Proof: Network Activity */}
        {(isLoadingProducts || latestProducts.length > 0) && (
          <div id="products">
            <ProductSection
              title={t('saasHome.networkActivity.title')}
              subtitle={t('saasHome.networkActivity.subtitle')}
              products={latestProducts}
              isLoading={isLoadingProducts}
              showViewAll
              viewAllHref="/marketplace?sort=newest"
            />
          </div>
        )}

        {/* Proof: Platform Stats */}
        <PlatformStatsSection
          storeCount={platformStats.storeCount}
          listingCount={platformStats.listingCount}
          isLoading={isLoadingStats}
        />
      </main>

      <Footer />
    </div>
  );
}

// ===================== Standalone Home Page =====================

function StandaloneHomePage() {
  const { t } = useI18n();
  const [trendingProducts, setTrendingProducts] = useState<DisplayProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadedRef = useRef(false);
  const { profile } = useUserStore();
  const standalonePeerId = profile?.peerID ?? null;
  const { config: storefrontConfig } = useStorefrontConfigPublic(standalonePeerId);
  const hasSections = !!storefrontConfig?.sections?.length;
  const hasHeroSection = !!storefrontConfig?.sections?.some(
    s => s.type === 'hero' && s.visible !== false
  );

  const sectionsForHomepage = useMemo(() => {
    if (!storefrontConfig) return storefrontConfig;
    return {
      ...storefrontConfig,
      sections: storefrontConfig.sections.filter(s => !HOMEPAGE_EXCLUDE_TYPES.has(s.type)),
    };
  }, [storefrontConfig]);

  useEffect(() => {
    if (loadedRef.current) return;
    let cancelled = false;

    async function fetchProducts() {
      setIsLoading(true);
      try {
        const localListings = (await getListingsWithDedup('local-store', () =>
          productDataService.getMyListings()
        )) as ProductListItem[];

        if (!cancelled) {
          loadedRef.current = true;
          setTrendingProducts(localListings.map(convertToDisplayProduct));
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      <Header />

      <main>
        {hasSections && hasHeroSection && profile ? (
          <>
            <BrandedHeroHeader
              store={profile}
              peerId={standalonePeerId!}
              stats={
                profile.stats ?? {
                  followerCount: 0,
                  followingCount: 0,
                  listingCount: trendingProducts.length,
                  ratingCount: 0,
                  averageRating: 0,
                }
              }
              isOwnStore
              isAuthenticated
              storefrontConfig={storefrontConfig}
              isFollowing={false}
              followLoading={false}
              onFollowToggle={noopFn}
              isBlocked={false}
              blockLoading={false}
              onBlockToggle={noopFn}
              onMessage={noopFn}
              onTabChange={noopFn}
            />
            {sectionsForHomepage?.sections?.length ? (
              <StoreSections
                peerId={standalonePeerId!}
                profile={profile ?? undefined}
                ownerConfig={sectionsForHomepage}
              />
            ) : null}
          </>
        ) : hasSections ? (
          <StoreSections
            peerId={standalonePeerId!}
            profile={profile ?? undefined}
            ownerConfig={storefrontConfig}
          />
        ) : (
          <StoreHero />
        )}

        <div id="products">
          <ProductSection
            title={t('standalone.allProducts', { defaultValue: 'All Products' })}
            subtitle={t('standalone.browseOurCollection', {
              defaultValue: 'Browse our collection',
            })}
            products={trendingProducts.slice(0, 8)}
            isLoading={isLoading}
            showViewAll
            viewAllHref={standalonePeerId ? `/store/${standalonePeerId}` : '/'}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
