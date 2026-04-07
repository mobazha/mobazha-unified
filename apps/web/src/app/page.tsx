'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  AudienceSection,
} from '@/components/SaaSHome';
import {
  useI18n,
  useUserStore,
  useStorefrontConfigPublic,
  productDataService,
  getImageUrl,
  useStorefrontMode,
  useStorefrontPeerID,
  useStorefrontProfile,
  parsePriceFields,
  isStandalone,
} from '@mobazha/core';
import { getSetupStatus } from '@mobazha/core/services/api/system';
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

  const { amount, currencyCode, divisibility } = parsePriceFields(item.price);

  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    imageUrl:
      getImageUrl(item.thumbnail?.medium) ||
      getImageUrl(item.thumbnail?.small) ||
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop',
    price: amount,
    currency: currencyCode,
    divisibility,
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
  const storefrontMode = useStorefrontMode();
  const storefrontPeerID = useStorefrontPeerID();

  if (storefrontMode) {
    return <StandaloneHomePage overridePeerID={storefrontPeerID} />;
  }

  return <SaaSHomePage />;
}

// ===================== SaaS Home Page =====================

const BROWSE_LINKS = [
  {
    labelKey: 'saasHome.browse.stores',
    defaultLabel: 'Browse Stores',
    icon: '🏪',
    href: '/search?q=*&tab=users',
  },
  {
    labelKey: 'saasHome.browse.trending',
    defaultLabel: 'Trending',
    icon: '🔥',
    href: '/search?q=*&sortBy=online-desc',
  },
  {
    labelKey: 'saasHome.browse.justListed',
    defaultLabel: 'Just Listed',
    icon: '🆕',
    href: '/search?q=*&sortBy=newest',
  },
  {
    labelKey: 'saasHome.browse.digital',
    defaultLabel: 'Digital Goods',
    icon: '💻',
    href: '/search?q=*&type=DIGITAL_GOOD',
  },
  {
    labelKey: 'saasHome.browse.services',
    defaultLabel: 'Services',
    icon: '🛠️',
    href: '/search?q=*&type=SERVICE',
  },
];

function BrowseQuickLinks() {
  const { t } = useI18n();
  return (
    <section className="py-4 sm:py-6">
      <Container size="xl">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {BROWSE_LINKS.map(item => (
            <Link
              key={item.labelKey}
              href={item.href}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors text-sm font-medium text-foreground"
            >
              <span>{item.icon}</span>
              <span>{t(item.labelKey, { defaultValue: item.defaultLabel })}</span>
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

        {/* Browse: Scene-based Quick Links */}
        <BrowseQuickLinks />

        <ValuePropsSection />

        {/* Who: Audience Scenarios (mobile only) */}
        <div className="md:hidden">
          <AudienceSection />
        </div>

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

function StandaloneHomePage({ overridePeerID }: { overridePeerID?: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [trendingProducts, setTrendingProducts] = useState<DisplayProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setupChecked, setSetupChecked] = useState(!isStandalone());

  const { profile: userProfile, isAuthenticated } = useUserStore();
  const storefrontProfile = useStorefrontProfile();

  const effectivePeerID = overridePeerID || userProfile?.peerID || null;

  useEffect(() => {
    if (!isStandalone()) return;
    let cancelled = false;
    getSetupStatus()
      .then(status => {
        if (!cancelled && !status.setupComplete) {
          router.replace('/admin');
          return;
        }
        if (!cancelled) setSetupChecked(true);
      })
      .catch(() => {
        if (!cancelled) setSetupChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);
  const isOwnStore =
    !overridePeerID || (!!userProfile?.peerID && userProfile.peerID === overridePeerID);
  const displayProfile = overridePeerID ? storefrontProfile : userProfile;

  const { config: storefrontConfig } = useStorefrontConfigPublic(effectivePeerID);
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

  // Fetch products: public API for SaaS storefronts, authenticated for own standalone
  useEffect(() => {
    if (!effectivePeerID) return;
    let cancelled = false;

    async function fetchProducts() {
      try {
        const fetcher = overridePeerID
          ? () => productDataService.getStoreListings(overridePeerID)
          : () => productDataService.getMyListings();

        const localListings = (await getListingsWithDedup(
          `store-${effectivePeerID}`,
          fetcher
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
  }, [effectivePeerID, overridePeerID]);

  if (!setupChecked) return null;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      <Header />

      <main>
        {hasSections && hasHeroSection && displayProfile ? (
          <>
            <BrandedHeroHeader
              store={displayProfile}
              peerId={effectivePeerID!}
              stats={
                displayProfile.stats ?? {
                  followerCount: 0,
                  followingCount: 0,
                  listingCount: trendingProducts.length,
                  ratingCount: 0,
                  averageRating: 0,
                }
              }
              isOwnStore={isOwnStore}
              isAuthenticated={isAuthenticated}
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
                peerId={effectivePeerID!}
                profile={displayProfile ?? undefined}
                ownerConfig={sectionsForHomepage}
              />
            ) : null}
          </>
        ) : hasSections ? (
          <StoreSections
            peerId={effectivePeerID!}
            profile={displayProfile ?? undefined}
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
            viewAllHref={effectivePeerID ? `/store/${effectivePeerID}` : '/'}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
