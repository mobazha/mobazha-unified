'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Header, Hero, ProductSection, Footer } from '@/components';
import { Container } from '@/components/layouts';
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
    freeShipping: !!item.freeShipping?.length,
    isDigital: item.contractType === 'SERVICE' || item.contractType === 'DIGITAL_GOOD',
    moderators: item.moderators,
  };
}

export default function HomePage() {
  const standalone = isStandalone();

  if (standalone) {
    return <StandaloneHomePage />;
  }

  return <SaaSHomePage />;
}

// ===================== SaaS Home Page =====================

const CATEGORY_LINKS = [
  { key: 'electronics', icon: '💻', href: '/search?category=electronics' },
  { key: 'clothing', icon: '👕', href: '/search?category=clothing' },
  { key: 'art', icon: '🎨', href: '/search?category=art' },
  { key: 'collectibles', icon: '💎', href: '/search?category=collectibles' },
  { key: 'home', icon: '🏠', href: '/search?category=home' },
  { key: 'sports', icon: '⚽', href: '/search?category=sports' },
];

function CategoryQuickLinks() {
  const { t } = useI18n();
  return (
    <section className="py-4 sm:py-6">
      <Container size="xl">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORY_LINKS.map(cat => (
            <Link
              key={cat.key}
              href={cat.href}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors text-sm font-medium text-foreground"
            >
              <span>{cat.icon}</span>
              <span>
                {t(`categories.${cat.key}`, {
                  defaultValue: cat.key.charAt(0).toUpperCase() + cat.key.slice(1),
                })}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function SaaSHomePage() {
  const { t } = useI18n();

  const [featuredStores, setFeaturedStores] = useState<SearchedUser[]>([]);
  const [latestProducts, setLatestProducts] = useState<DisplayProduct[]>([]);
  const [popularProducts, setPopularProducts] = useState<DisplayProduct[]>([]);
  const [platformStats, setPlatformStats] = useState({ storeCount: 0, listingCount: 0 });
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    let cancelled = false;

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

    productDataService
      .getPopularProducts()
      .then(products => {
        if (!cancelled) {
          setPopularProducts(products.map(convertToDisplayProduct));
          setIsLoadingPopular(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoadingPopular(false);
      });

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

        {/* Browse: Category Quick Links */}
        <CategoryQuickLinks />

        <ValuePropsSection />

        {/* What: Featured Stores */}
        <FeaturedStoresSection stores={featuredStores} isLoading={isLoadingStores} />

        {/* Popular Products */}
        {(isLoadingPopular || popularProducts.length > 0) && (
          <ProductSection
            title={t('saasHome.popularProducts.title', { defaultValue: 'Popular Products' })}
            subtitle={t('saasHome.popularProducts.subtitle', {
              defaultValue: 'Trending on the network',
            })}
            products={popularProducts}
            isLoading={isLoadingPopular}
            showViewAll
            viewAllHref="/marketplace?sort=popular"
          />
        )}

        {/* Latest Products */}
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
    let cancelled = false;

    async function fetchProducts() {
      try {
        const localListings = (await getListingsWithDedup('local-store', () =>
          productDataService.getMyListings()
        )) as ProductListItem[];

        if (!cancelled) {
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
