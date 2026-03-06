'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Header, Hero, ProductSection, Footer } from '@/components';
import { MobileHeader } from '@/components/MobileHeader';
import { StoreHero } from '@/components/StoreHero';
import { StoreSections } from '@/components/store-sections';
import { BrandedHeroHeader } from '@/components/store-sections/BrandedHeroHeader';
import {
  useI18n,
  useUserStore,
  useStorefrontConfigPublic,
  productDataService,
  isMockMode,
  getImageUrl,
  isStandalone,
} from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { getListingsWithDedup } from '@/utils/requestDedup';

const HOMEPAGE_EXCLUDE_TYPES = new Set(['hero', 'testimonials', 'store-tabs']);
const noopFn = () => {};

// ProductSection 需要的展示格式
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
  /** 仲裁员 peerID 列表 */
  moderators?: string[];
}

// 转换 API 数据为 ProductSection 需要的格式
function convertToDisplayProduct(item: ProductListItem): DisplayProduct {
  // 优先使用 API 返回的卖家名称，否则使用 peerID 前 8 位
  const vendorName =
    item.vendorName ||
    (item.vendorPeerID
      ? `${item.vendorPeerID.substring(0, 6)}…${item.vendorPeerID.slice(-4)}`
      : '');
  // 使用 API 返回的卖家头像
  const vendorAvatar = getImageUrl(item.vendorAvatarHashes?.small);

  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    imageUrl:
      item.thumbnail?.medium ||
      item.thumbnail?.small ||
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
    // 传递 moderators 列表，由 ProductSection 使用 hasVerifiedMod 检查
    moderators: item.moderators,
  };
}

// 占位数据（仅在 Mock 模式下使用）
const placeholderProducts: DisplayProduct[] = [
  {
    id: '1',
    slug: 'premium-headphones',
    title: 'Premium Wireless Headphones with Noise Cancellation',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    price: 299.99,
    vendorName: 'TechGear Store',
    rating: 4.8,
    reviewCount: 256,
    freeShipping: true,
  },
  {
    id: '2',
    slug: 'digital-art-course',
    title: 'Complete Digital Art Masterclass - From Beginner to Pro',
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop',
    price: 49.99,
    vendorName: 'ArtAcademy',
    rating: 4.9,
    reviewCount: 1024,
    isDigital: true,
  },
  {
    id: '3',
    slug: 'vintage-camera',
    title: 'Vintage Film Camera - Fully Restored',
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop',
    price: 189.0,
    vendorName: 'RetroFinds',
    rating: 4.6,
    reviewCount: 89,
  },
  {
    id: '4',
    slug: 'smart-watch',
    title: 'Smart Watch Pro - Health & Fitness Tracker',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    price: 199.99,
    currency: 'USD',
    originalPrice: 249.99,
    vendorName: 'FitTech',
    rating: 4.7,
    reviewCount: 512,
    freeShipping: true,
  },
];

export default function HomePage() {
  const { t } = useI18n();
  const [trendingProducts, setTrendingProducts] = useState<DisplayProduct[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<DisplayProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'mock' | 'api'>('mock');

  // 防止重复加载
  const loadedRef = useRef(false);

  useEffect(() => {
    // 如果已经加载过，直接返回
    if (loadedRef.current) return;

    let isCancelled = false;

    const fetchProducts = async () => {
      setIsLoading(true);
      const mockMode = isMockMode();
      setDataSource(mockMode ? 'mock' : 'api');

      // eslint-disable-next-line no-console
      console.log(`📦 Fetching products (${mockMode ? 'Mock' : 'Real API'} mode)`);

      try {
        let trending: ProductListItem[];
        let featured: ProductListItem[];

        if (isStandalone()) {
          // 独立站模式：从本地节点获取商品，无搜索服务
          const localListings = (await getListingsWithDedup('local-store', () =>
            productDataService.getMyListings()
          )) as ProductListItem[];
          trending = localListings;
          featured = localListings.slice(0, 4);
        } else {
          // SaaS/Hosted 模式：从搜索服务获取
          const [t, f] = await Promise.all([
            getListingsWithDedup('trending', () => productDataService.getTrendingProducts()),
            getListingsWithDedup('featured', () => productDataService.getFeaturedProducts()),
          ]);
          trending = t as ProductListItem[];
          featured = f as ProductListItem[];
        }

        if (isCancelled) return;

        loadedRef.current = true;

        if (trending.length > 0) {
          setTrendingProducts(trending.map(convertToDisplayProduct));
        } else {
          setTrendingProducts(placeholderProducts);
        }

        if (featured.length > 0) {
          setFeaturedProducts(featured.map(convertToDisplayProduct));
        } else {
          setFeaturedProducts([]);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        if (!isCancelled) {
          setTrendingProducts(placeholderProducts);
          setFeaturedProducts([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isCancelled = true;
    };
  }, []);

  const categories = [
    { name: t('homeExtended.electronics'), icon: '💻', color: 'from-info to-primary' },
    { name: t('homeExtended.digitalGoods'), icon: '📱', color: 'from-primary to-secondary' },
    { name: t('homeExtended.services'), icon: '🛠️', color: 'from-warning to-destructive' },
    { name: t('homeExtended.digitalAssets'), icon: '💎', color: 'from-warning to-success' },
  ];

  const standalone = isStandalone();
  const { profile } = useUserStore();
  const standalonePeerId = standalone ? profile?.peerID : null;
  const { config: storefrontConfig } = useStorefrontConfigPublic(standalonePeerId ?? null);
  const hasSections = standalone && !!storefrontConfig?.sections?.length;
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

  return (
    <div className="min-h-screen bg-background">
      {/* 移动端显示简化搜索栏，桌面端显示完整 Header */}
      <MobileHeader />
      <Header />

      <main>
        {standalone ? (
          hasSections && hasHeroSection && profile ? (
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
          )
        ) : (
          <Hero />
        )}

        {/* 数据来源指示器（开发模式） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                dataSource === 'api' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
              }`}
            >
              {dataSource === 'api' ? '🔗 Real API' : '🎭 Mock Data'}
              {isLoading && ' (Loading...)'}
            </div>
          </div>
        )}

        <div id="products">
          {standalone ? (
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
          ) : (
            <ProductSection
              title={t('homeExtended.trendingNow')}
              subtitle={t('homeExtended.trendingSubtitle')}
              products={trendingProducts}
              isLoading={isLoading}
              showViewAll
              viewAllHref="/marketplace?sort=trending"
            />
          )}
        </div>

        {!standalone && (
          <div className="bg-card">
            <ProductSection
              title={t('homeExtended.featuredServices')}
              subtitle={t('homeExtended.featuredSubtitle')}
              products={featuredProducts}
              isLoading={isLoading}
              viewAllHref="/marketplace?category=featured"
            />
          </div>
        )}

        {/* Categories Section — SaaS only */}
        {!standalone && (
          <section className="py-6 sm:py-10 lg:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-4 sm:mb-8">
                {t('homeExtended.browseCategories')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {categories.map(category => (
                  <a
                    key={category.name}
                    href={`/marketplace?category=${category.name.toLowerCase()}`}
                    className={`relative overflow-hidden rounded-lg sm:rounded-xl p-4 sm:p-6 bg-gradient-to-br ${category.color} text-white touch-feedback hover:scale-105 transition-transform`}
                  >
                    <span className="text-2xl sm:text-4xl mb-1 sm:mb-2 block">{category.icon}</span>
                    <span className="font-semibold text-sm sm:text-base">{category.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
