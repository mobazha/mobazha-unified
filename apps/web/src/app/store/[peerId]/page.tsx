'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  profileApi,
  productDataService,
  socialApi,
  imagesApi,
  useI18n,
  useUserStore,
  useChatStore,
  getImageUrl,
  useVerifiedModerators,
} from '@mobazha/core';
import type { UserProfile, ProductListItem, Image } from '@mobazha/core';
import { Settings, Camera, Package } from 'lucide-react';
import { useProductModal } from '@/hooks';
import { getProfileWithDedup, getListingsWithDedup } from '@/utils/requestDedup';

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
  const router = useRouter();
  const { t } = useI18n();
  const { openProduct, isMobile } = useProductModal();
  const { hasVerifiedMod } = useVerifiedModerators();
  const peerId = params.peerId as string;
  const {
    isAuthenticated,
    profile: currentUserProfile,
    updateProfile,
    fetchProfile: refreshCurrentUserProfile,
  } = useUserStore();
  const openChatDrawer = useChatStore(state => state.openDrawer);

  // 判断是否是自己的店铺
  const isOwnStore = isAuthenticated && currentUserProfile?.peerID === peerId;

  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true); // 初始为 true，显示加载骨架

  // 编辑相关状态
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [pendingAvatarHashes, setPendingAvatarHashes] = useState<Image | null>(null);
  const [pendingHeaderHashes, setPendingHeaderHashes] = useState<Image | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    shortDescription: '',
    location: '',
    about: '',
    email: '',
    phoneNumber: '',
    website: '',
  });

  // 用于跟踪已加载的数据
  const storeLoadedRef = useRef<string | null>(null);
  const productsLoadedRef = useRef<string | null>(null);

  // 获取店铺数据
  useEffect(() => {
    // 如果已经加载过相同的数据，直接返回
    const loadKey = `${peerId}-${isOwnStore}`;
    if (storeLoadedRef.current === loadKey) return;

    let isCancelled = false;

    const fetchStoreData = async () => {
      if (!peerId) return;

      setIsLoading(true);
      try {
        // 如果是自己的店铺，使用当前用户的 profile
        if (isOwnStore && currentUserProfile) {
          if (!isCancelled) {
            setStore(currentUserProfile);
            storeLoadedRef.current = loadKey;
          }
        } else {
          const profileData = await getProfileWithDedup(peerId, () =>
            profileApi.getProfile(peerId)
          );
          if (!isCancelled) {
            // 无论 profileData 是否为空，都标记为已尝试加载，防止重复请求
            storeLoadedRef.current = loadKey;
            if (profileData) {
              setStore(profileData);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch store profile:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchStoreData();

    return () => {
      isCancelled = true;
    };
  }, [peerId, isOwnStore, currentUserProfile]);

  // 当 store 数据变化时，更新编辑表单
  useEffect(() => {
    if (store && isOwnStore) {
      setEditForm({
        name: store.name || '',
        shortDescription: store.shortDescription || '',
        location: store.location || '',
        about: store.about || '',
        email: store.contactInfo?.email || '',
        phoneNumber: store.contactInfo?.phoneNumber || '',
        website: store.contactInfo?.website || '',
      });
    }
  }, [store, isOwnStore]);

  // 获取店铺商品
  useEffect(() => {
    // 如果已经加载过相同的数据，直接返回
    const loadKey = `products-${peerId}-${isOwnStore}`;
    if (productsLoadedRef.current === loadKey) return;

    let isCancelled = false;

    const fetchStoreProducts = async () => {
      if (!peerId) return;

      setProductsLoading(true);
      try {
        // 如果是自己的店铺，使用 getMyListings，否则获取店铺商品
        const productsData = await getListingsWithDedup(loadKey, () =>
          isOwnStore
            ? productDataService.getMyListings()
            : productDataService.getStoreListings(peerId)
        );

        if (!isCancelled) {
          setProducts(productsData as ProductListItem[]);
          productsLoadedRef.current = loadKey;
        }
      } catch (err) {
        console.error('Failed to fetch store products:', err);
      } finally {
        if (!isCancelled) {
          setProductsLoading(false);
        }
      }
    };

    fetchStoreProducts();

    return () => {
      isCancelled = true;
    };
  }, [peerId, isOwnStore]);

  // 检查是否已关注该店铺（仅当不是自己的店铺时）
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!peerId || !isAuthenticated || isOwnStore) return;

      try {
        const following = await socialApi.isFollowing(peerId);
        setIsFollowing(following);
      } catch (err) {
        console.error('Failed to check follow status:', err);
      }
    };

    checkFollowStatus();
  }, [peerId, isAuthenticated, isOwnStore]);

  // 关注/取消关注处理
  const handleFollowToggle = async () => {
    if (!isAuthenticated || followLoading || isOwnStore) return;

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

  // 编辑表单变更处理
  const handleEditChange = useCallback((field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // 头像上传处理
  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const imageHashes = await imagesApi.uploadAvatarImage(file);
      if (imageHashes) {
        setPendingAvatarHashes(imageHashes);
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setAvatarUploading(false);
    }
  }, []);

  // 封面上传处理
  const handleHeaderUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHeaderUploading(true);
    try {
      const imageHashes = await imagesApi.uploadHeaderImage(file);
      if (imageHashes) {
        setPendingHeaderHashes(imageHashes);
      }
    } catch (err) {
      console.error('Failed to upload header:', err);
    } finally {
      setHeaderUploading(false);
    }
  }, []);

  // 保存编辑
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const profileData: Record<string, unknown> = {
        name: editForm.name,
        shortDescription: editForm.shortDescription,
        location: editForm.location,
        about: editForm.about,
        contactInfo: {
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          website: editForm.website,
        },
      };

      if (pendingAvatarHashes) {
        profileData.avatarHashes = pendingAvatarHashes;
      }

      if (pendingHeaderHashes) {
        profileData.headerHashes = pendingHeaderHashes;
      }

      const success = await updateProfile(profileData);
      if (success) {
        setIsEditing(false);
        setPendingAvatarHashes(null);
        setPendingHeaderHashes(null);
        // 刷新当前用户的 profile 数据
        await refreshCurrentUserProfile();
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    editForm,
    updateProfile,
    pendingAvatarHashes,
    pendingHeaderHashes,
    refreshCurrentUserProfile,
  ]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    if (store) {
      setEditForm({
        name: store.name || '',
        shortDescription: store.shortDescription || '',
        location: store.location || '',
        about: store.about || '',
        email: store.contactInfo?.email || '',
        phoneNumber: store.contactInfo?.phoneNumber || '',
        website: store.contactInfo?.website || '',
      });
    }
    setPendingAvatarHashes(null);
    setPendingHeaderHashes(null);
    setIsEditing(false);
  }, [store]);

  // 发消息
  const handleMessage = () => {
    // Open chat drawer
    // TODO: 后续可以添加逻辑来自动选择或创建与该用户的聊天房间
    openChatDrawer();
  };

  // 获取店铺的统计数据 - 使用实际的 products.length 来保持一致性
  const stats = store?.stats || defaultStats;
  const actualListingCount = products.length;

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

  // 获取显示用的头像和封面图
  const displayAvatarHash = pendingAvatarHashes?.medium || store.avatarHashes?.medium;
  const displayHeaderHash = pendingHeaderHashes?.large || store.headerHashes?.large;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Store Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-32 sm:h-48 md:h-64 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden">
            {displayHeaderHash && (
              <img
                src={getImageUrl(displayHeaderHash) || ''}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

            {/* 封面编辑按钮 - 仅自己的店铺显示 */}
            {isOwnStore && (
              <label className="absolute bottom-4 right-4 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHeaderUpload}
                  className="hidden"
                  disabled={headerUploading}
                />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg text-sm transition-colors">
                  {headerUploading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {t('settings.loadHeader')}
                </div>
              </label>
            )}
          </div>

          {/* Store Info - 白色背景卡片 */}
          <Container size="xl" className="relative">
            <div className="bg-background -mt-12 sm:-mt-16 rounded-t-2xl pt-4 px-4 sm:px-6">
              {/* 头像和信息 */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0 -mt-10 sm:-mt-12">
                  <Avatar
                    src={getImageUrl(displayAvatarHash)}
                    name={store.name || peerId.slice(0, 8)}
                    size="xl"
                    className="ring-4 ring-background w-20 h-20 sm:w-24 sm:h-24 shadow-lg"
                  />
                  {/* 头像编辑按钮 */}
                  {isOwnStore && (
                    <label className="absolute -bottom-1 -right-1 cursor-pointer z-10">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={avatarUploading}
                      />
                      <div className="w-7 h-7 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-md transition-colors border-2 border-background">
                        {avatarUploading ? (
                          <span className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                        ) : (
                          <Camera className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </label>
                  )}
                </div>

                {/* 信息区域 */}
                <div className="flex-1 min-w-0 pt-1">
                  {/* 名称和操作按钮 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg sm:text-xl font-bold text-foreground">
                        {store.name || peerId.slice(0, 8)}
                      </h1>
                      {store.location && (
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>📍</span>
                          <span>{store.location}</span>
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {isOwnStore ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => router.push('/settings/page-profile')}
                            size="sm"
                            className="touch-feedback gap-1.5"
                          >
                            <Settings className="h-4 w-4" />
                            <span>{t('settingsModal.customize')}</span>
                          </Button>
                        </>
                      ) : (
                        <>
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="touch-feedback"
                            onClick={handleMessage}
                          >
                            {t('profile.message')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 简介 */}
                  {store.shortDescription && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2">
                      {store.shortDescription}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-5 sm:gap-6 mt-3 pt-3 border-t border-border text-sm">
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold text-foreground">{actualListingCount}</span>
                  <span className="text-muted-foreground">{t('profile.listings')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold text-foreground">{stats.followerCount}</span>
                  <span className="text-muted-foreground">{t('profile.followers')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-semibold text-foreground">
                    {stats.averageRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">({stats.ratingCount})</span>
                </div>
              </div>
            </div>
          </Container>
        </div>

        {/* Tabs */}
        <div className="sticky top-16 z-30 bg-background border-b border-border">
          <Container size="xl">
            <HStack gap="none" className="px-4 sm:px-6">
              {(['products', 'about', 'reviews'] as TabType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-5 py-3 text-sm font-medium transition-colors border-b-2 touch-feedback ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'products'
                    ? t('profile.listings')
                    : tab === 'about'
                      ? t('profile.about')
                      : t('profile.reviews')}
                </button>
              ))}
            </HStack>
          </Container>
        </div>

        {/* Tab Content */}
        <div className="py-2 sm:py-4">
          {activeTab === 'products' && (
            <Container size="xl" className="px-4 sm:px-6">
              {/* Products Grid */}
              {productsLoading ? (
                <Grid cols={4} colsMobile={2} gap="md">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </Grid>
              ) : products.length > 0 ? (
                <Grid cols={4} colsMobile={2} gap="md">
                  {products.map((product, index) => (
                    <Link
                      key={`${product.slug}-${index}`}
                      href={`/product/${product.slug}?peerID=${peerId}`}
                      onClick={e => {
                        // 桌面端使用弹框
                        if (!isMobile) {
                          e.preventDefault();
                          openProduct(product.slug, peerId);
                        }
                      }}
                    >
                      <ProductCard
                        title={product.title}
                        imageUrl={getImageUrl(product.thumbnail?.medium)}
                        price={Number(product.price?.amount || 0)}
                        currency={product.price?.currency?.code || 'USD'}
                        divisibility={product.price?.currency?.divisibility}
                        // 店主浏览自己店铺时不显示店名和头像
                        vendorName={isOwnStore ? undefined : store?.name}
                        vendorAvatar={
                          isOwnStore ? undefined : getImageUrl(store?.avatarHashes?.small)
                        }
                        vendorPeerID={peerId}
                        rating={product.averageRating}
                        reviewCount={product.ratingCount}
                        freeShipping={product.freeShipping && product.freeShipping.length > 0}
                        hasVerifiedModerator={hasVerifiedMod(product.moderators)}
                        isOwnListing={isOwnStore}
                        onReport={() => {
                          /* TODO: 打开举报对话框 */
                        }}
                        onBlock={() => {
                          /* TODO: 实现屏蔽卖家功能 */
                        }}
                      />
                    </Link>
                  ))}
                </Grid>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-2">
                    {t('search.noProductsFound')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                </div>
              )}
            </Container>
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
                  {t('profile.reviews')}
                </h2>
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t('product.noReviews')}
                </div>
              </Card>
            </Container>
          )}
        </div>
      </main>

      <Footer />

      {/* 编辑资料对话框 */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('profile.editProfile')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 基本信息 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.name')}</label>
              <Input
                value={editForm.name}
                onChange={e => handleEditChange('name', e.target.value)}
                placeholder={t('profile.name')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.bio')}</label>
              <Input
                value={editForm.shortDescription}
                onChange={e => handleEditChange('shortDescription', e.target.value)}
                placeholder={t('profile.bio')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.location')}</label>
              <Input
                value={editForm.location}
                onChange={e => handleEditChange('location', e.target.value)}
                placeholder={t('profile.location')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.about')}</label>
              <textarea
                value={editForm.about}
                onChange={e => handleEditChange('about', e.target.value)}
                placeholder={t('profile.about')}
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* 联系信息 */}
            <div className="pt-4 border-t border-border">
              <h4 className="font-medium text-foreground mb-3">
                {t('profile.contactInformation')}
              </h4>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.email')}
                  </label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={e => handleEditChange('email', e.target.value)}
                    placeholder={t('profile.email')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.phone')}
                  </label>
                  <Input
                    type="tel"
                    value={editForm.phoneNumber}
                    onChange={e => handleEditChange('phoneNumber', e.target.value)}
                    placeholder={t('profile.phone')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.website')}
                  </label>
                  <Input
                    type="url"
                    value={editForm.website}
                    onChange={e => handleEditChange('website', e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
              ) : null}
              {t('profile.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
