'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header, Footer, ProductSection } from '@/components';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import {
  profileApi,
  productDataService,
  socialApi,
  useI18n,
  useUserStore,
  getImageUrl,
} from '@mobazha/core';
import type { UserProfile, ProductListItem } from '@mobazha/core';

// 默认统计数据
const defaultStats = {
  followerCount: 0,
  followingCount: 0,
  listingCount: 0,
  ratingCount: 0,
  averageRating: 0,
};

type TabType = 'products' | 'about' | 'reviews';

export default function StorePage() {
  const params = useParams();
  const { t } = useI18n();
  const peerId = params.peerId as string;
  const { isAuthenticated } = useUserStore();

  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // 获取店铺数据
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!peerId) return;

      setIsLoading(true);
      try {
        const profileData = await profileApi.getProfile(peerId);
        setStore(profileData);
      } catch (err) {
        console.error('Failed to fetch store profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreData();
  }, [peerId]);

  // 获取店铺商品
  useEffect(() => {
    const fetchStoreProducts = async () => {
      if (!peerId) return;

      setProductsLoading(true);
      try {
        const productsData = await productDataService.getStoreListings(peerId);
        setProducts(productsData);
      } catch (err) {
        console.error('Failed to fetch store products:', err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchStoreProducts();
  }, [peerId]);

  // 检查是否已关注该店铺
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!peerId || !isAuthenticated) return;

      try {
        const following = await socialApi.isFollowing(peerId);
        setIsFollowing(following);
      } catch (err) {
        console.error('Failed to check follow status:', err);
      }
    };

    checkFollowStatus();
  }, [peerId, isAuthenticated]);

  // 关注/取消关注处理
  const handleFollowToggle = async () => {
    if (!isAuthenticated || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await socialApi.unfollowUser(peerId);
        setIsFollowing(false);
      } else {
        await socialApi.followUser(peerId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  // 获取店铺的统计数据
  const stats = store?.stats || defaultStats;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Skeleton variant="rectangular" height={200} />
        <Container size="xl" className="py-8">
          <HStack gap="lg" align="start">
            <Skeleton variant="circular" width={120} height={120} />
            <VStack gap="sm" className="flex-1">
              <Skeleton variant="text" height={32} width="40%" />
              <Skeleton variant="text" height={20} width="60%" />
            </VStack>
          </HStack>
        </Container>
        <Footer />
      </div>
    );
  }

  // 如果没有找到店铺数据
  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container size="xl" className="py-20">
          <VStack gap="md" align="center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">{t('profile.noProfileData')}</h2>
            <p className="text-muted-foreground">{t('common.error')}</p>
          </VStack>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Store Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-32 sm:h-48 md:h-64 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden">
            {store.headerHashes?.large && (
              <img
                src={getImageUrl(store.headerHashes.large) || ''}
                alt=""
                className="w-full h-full object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>

          {/* Store Info */}
          <Container size="xl" className="relative">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 -mt-12 sm:-mt-20">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <Avatar
                  src={getImageUrl(store.avatarHashes?.medium)}
                  name={store.name || peerId.slice(0, 8)}
                  size="xl"
                  className="ring-4 ring-white dark:ring-slate-900 w-24 h-24 sm:w-32 sm:h-32"
                />
              </div>

              {/* Info */}
              <div className="flex-1 pt-1 sm:pt-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <HStack gap="sm" align="center">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                        {store.name || peerId.slice(0, 8)}
                      </h1>
                    </HStack>
                    {store.shortDescription && (
                      <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
                        {store.shortDescription}
                      </p>
                    )}
                    <HStack gap="sm" className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                      {store.location && <span>📍 {store.location}</span>}
                    </HStack>
                  </div>

                  {/* Actions */}
                  <HStack gap="xs" className="flex-shrink-0">
                    <Button
                      variant={isFollowing ? 'outline' : 'default'}
                      onClick={handleFollowToggle}
                      disabled={followLoading || !isAuthenticated}
                      size="sm"
                      className="touch-feedback"
                    >
                      {followLoading ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      ) : isFollowing ? (
                        t('profile.unfollow')
                      ) : (
                        t('profile.follow')
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="touch-feedback">
                      Message
                    </Button>
                  </HStack>
                </div>

                {/* Stats */}
                <HStack gap="md" className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-foreground">
                      {stats.listingCount}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {t('profile.listings')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-foreground">
                      {stats.followerCount}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {t('profile.followers')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-foreground">
                      ⭐ {stats.averageRating.toFixed(1)}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {stats.ratingCount} {t('profile.reviews')}
                    </div>
                  </div>
                </HStack>
              </div>
            </div>
          </Container>
        </div>

        {/* Tabs */}
        <div className="sticky top-16 z-40 bg-card border-b border-border mt-4 sm:mt-6">
          <Container size="xl">
            <HStack gap="none">
              {(['products', 'about', 'reviews'] as TabType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium capitalize transition-colors border-b-2 touch-feedback ${
                    activeTab === tab
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </HStack>
          </Container>
        </div>

        {/* Tab Content */}
        <div className="py-4 sm:py-8">
          {activeTab === 'products' && (
            <ProductSection
              title={t('profile.listings')}
              subtitle={`${products.length} ${t('profile.listings').toLowerCase()}`}
              products={products.map(p => ({
                id: p.slug,
                slug: p.slug,
                title: p.title,
                imageUrl: getImageUrl(p.thumbnail?.medium),
                price: Number(p.price?.amount || 0),
                currency: p.price?.currencyCode === 'USD' ? '$' : p.price?.currencyCode,
                vendorName: store?.name,
                rating: p.averageRating,
                reviewCount: p.ratingCount,
                freeShipping: p.freeShipping && p.freeShipping.length > 0,
              }))}
              isLoading={productsLoading}
              showViewAll={false}
              containerSize="lg"
              titleClassName="text-lg sm:text-xl"
            />
          )}

          {activeTab === 'about' && (
            <Container size="xl">
              <Grid cols={3} colsMobile={1} gap="md">
                <div className="lg:col-span-2">
                  <Card className="p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
                      {t('profile.about')}
                    </h2>
                    <div className="prose prose-sm sm:prose prose-slate dark:prose-invert max-w-none">
                      {store.about ? (
                        store.about.split('\n').map((paragraph, i) => (
                          <p key={i} className="text-sm sm:text-base text-muted-foreground mb-3">
                            {paragraph}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm sm:text-base text-muted-foreground">
                          {t('common.noData')}
                        </p>
                      )}
                    </div>
                  </Card>
                </div>

                <div>
                  <Card className="p-4 sm:p-6">
                    <h3 className="font-semibold text-foreground mb-3 text-base">
                      {t('profile.contactInformation')}
                    </h3>
                    <VStack gap="sm" align="stretch">
                      {store.contactInfo?.email && (
                        <div>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('profile.email')}
                          </span>
                          <p className="font-medium text-foreground text-sm">
                            {store.contactInfo.email}
                          </p>
                        </div>
                      )}
                      {store.contactInfo?.phoneNumber && (
                        <div>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('profile.phone')}
                          </span>
                          <p className="font-medium text-foreground text-sm">
                            {store.contactInfo.phoneNumber}
                          </p>
                        </div>
                      )}
                      {store.contactInfo?.website && (
                        <div>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('profile.website')}
                          </span>
                          <a
                            href={store.contactInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block font-medium text-emerald-600 hover:underline text-sm"
                          >
                            {store.contactInfo.website}
                          </a>
                        </div>
                      )}
                      {!store.contactInfo?.email &&
                        !store.contactInfo?.phoneNumber &&
                        !store.contactInfo?.website && (
                          <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                        )}
                    </VStack>
                  </Card>
                </div>
              </Grid>
            </Container>
          )}

          {activeTab === 'reviews' && (
            <Container size="xl">
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                  Customer Reviews
                </h2>
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Reviews coming soon...
                </div>
              </Card>
            </Container>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
