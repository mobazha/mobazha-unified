'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n, useUserStore, productDataService, imagesApi, getImageUrl } from '@mobazha/core';
import type { ProductListItem, Image } from '@mobazha/core';

// Types
interface ContactInfo {
  email?: string;
  phoneNumber?: string;
  website?: string;
}

interface Profile {
  peerID: string;
  name: string;
  shortDescription?: string;
  location?: string;
  about?: string;
  avatarHashes?: {
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  headerHashes?: {
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  contactInfo?: ContactInfo;
  stats: {
    listingCount: number;
    followerCount: number;
    followingCount: number;
    ratingCount: number;
    averageRating: number;
  };
}

// 默认统计数据（当 API 未返回时使用）
const defaultStats = {
  listingCount: 0,
  followerCount: 0,
  followingCount: 0,
  ratingCount: 0,
  averageRating: 0,
};

type TabType = 'store' | 'about' | 'reviews';

export default function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const {
    profile: userProfile,
    isAuthenticated,
    isLoading,
    fetchProfile,
    updateProfile,
  } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabType>('store');
  const [isEditing, setIsEditing] = useState(false);
  const [listings, setListings] = useState<ProductListItem[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  // 将 userProfile 转换为页面所需的 Profile 格式
  const profile: Profile | null = useMemo(() => {
    if (!userProfile) return null;
    return {
      peerID: userProfile.peerID,
      name: userProfile.name || userProfile.peerID.slice(0, 8),
      shortDescription: userProfile.shortDescription,
      location: userProfile.location,
      about: userProfile.about,
      avatarHashes: userProfile.avatarHashes,
      headerHashes: userProfile.headerHashes,
      contactInfo: userProfile.contactInfo,
      stats: userProfile.stats || defaultStats,
    };
  }, [userProfile]);

  // 用于追踪 profile 变化的 key
  const profileKey = userProfile?.peerID || '';

  // Edit form state - 使用函数初始化，在 profileKey 变化时重新计算
  const getInitialEditForm = useCallback(
    () => ({
      name: profile?.name || '',
      shortDescription: profile?.shortDescription || '',
      location: profile?.location || '',
      about: profile?.about || '',
      email: profile?.contactInfo?.email || '',
      phoneNumber: profile?.contactInfo?.phoneNumber || '',
      website: profile?.contactInfo?.website || '',
    }),
    [profile]
  );

  const [editForm, setEditForm] = useState(getInitialEditForm);
  const [lastProfileKey, setLastProfileKey] = useState(profileKey);

  // 当 profile 变化时更新 editForm（避免在 effect 中直接 setState）
  if (profileKey !== lastProfileKey) {
    setLastProfileKey(profileKey);
    setEditForm(getInitialEditForm());
  }

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 页面加载时刷新 profile 数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  // 获取我的商品列表
  useEffect(() => {
    const fetchListings = async () => {
      if (!isAuthenticated) return;
      setListingsLoading(true);
      try {
        const data = await productDataService.getMyListings();
        setListings(data);
      } catch (err) {
        console.error('Failed to fetch listings:', err);
      } finally {
        setListingsLoading(false);
      }
    };
    fetchListings();
  }, [isAuthenticated]);

  const handleEditChange = useCallback((field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [pendingAvatarHashes, setPendingAvatarHashes] = useState<Image | null>(null);
  const [pendingHeaderHashes, setPendingHeaderHashes] = useState<Image | null>(null);

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

      // 如果有新上传的头像，包含在更新中
      if (pendingAvatarHashes) {
        profileData.avatarHashes = pendingAvatarHashes;
      }

      // 如果有新上传的封面图，包含在更新中
      if (pendingHeaderHashes) {
        profileData.headerHashes = pendingHeaderHashes;
      }

      const success = await updateProfile(profileData);
      if (success) {
        setIsEditing(false);
        // 清除待上传的图片状态
        setPendingAvatarHashes(null);
        setPendingHeaderHashes(null);
      }
    } finally {
      setIsSaving(false);
    }
  }, [editForm, updateProfile, pendingAvatarHashes, pendingHeaderHashes]);

  const handleCancel = useCallback(() => {
    if (profile) {
      setEditForm({
        name: profile.name,
        shortDescription: profile.shortDescription || '',
        location: profile.location || '',
        about: profile.about || '',
        email: profile.contactInfo?.email || '',
        phoneNumber: profile.contactInfo?.phoneNumber || '',
        website: profile.contactInfo?.website || '',
      });
    }
    setIsEditing(false);
  }, [profile]);

  // 加载中状态
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 如果没有 profile 数据
  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{t('profile.noProfileData')}</p>
            <Button onClick={() => fetchProfile()}>{t('common.retry')}</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Header Banner */}
        <div className="relative h-32 sm:h-48 md:h-64 bg-gradient-to-r from-emerald-500 to-teal-600">
          {profile.headerHashes?.large && (
            <img
              src={getImageUrl(profile.headerHashes.large) || ''}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <Container size="xl" className="relative">
          {/* Profile Info Section */}
          <div className="relative -mt-12 sm:-mt-16 mb-4 sm:mb-8">
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col md:flex-row gap-3 sm:gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0 -mt-14 sm:-mt-20 md:-mt-24">
                    <div className="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl sm:rounded-2xl overflow-hidden border-3 sm:border-4 border-white dark:border-slate-800 shadow-lg bg-white">
                      {profile.avatarHashes?.medium ? (
                        <img
                          src={getImageUrl(profile.avatarHashes.medium) || ''}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                          <span className="text-2xl sm:text-4xl font-bold text-emerald-600">
                            {profile.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <HStack justify="between" align="start" className="mb-2 sm:mb-4">
                      <div>
                        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground">
                          {profile.name}
                        </h1>
                        {profile.location && (
                          <p className="text-muted-foreground flex items-center gap-1 mt-0.5 sm:mt-1 text-xs sm:text-base">
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {profile.location}
                          </p>
                        )}
                      </div>
                      <HStack gap="xs" className="flex-shrink-0 sm:gap-2">
                        <Link href="/settings">
                          <Button
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap h-8 sm:h-9 px-2 sm:px-3"
                          >
                            <svg
                              className="w-4 h-4 md:mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span className="hidden md:inline">{t('nav.settings')}</span>
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="whitespace-nowrap h-8 sm:h-9 px-2 sm:px-3"
                        >
                          <svg
                            className="w-4 h-4 md:mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          <span className="hidden md:inline">{t('profile.editProfile')}</span>
                        </Button>
                      </HStack>
                    </HStack>

                    {profile.shortDescription && (
                      <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
                        {profile.shortDescription}
                      </p>
                    )}

                    {/* Stats */}
                    <HStack gap="md" className="flex-wrap sm:gap-6">
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-foreground">
                          {profile.stats.listingCount}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {t('profile.listings')}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-foreground">
                          {profile.stats.followerCount}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {t('profile.followers')}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-foreground">
                          {profile.stats.followingCount}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {t('profile.following')}
                        </div>
                      </div>
                      <div className="text-center">
                        <HStack gap="xs" align="center" justify="center">
                          <span className="text-amber-500 text-sm sm:text-base">★</span>
                          <span className="text-lg sm:text-2xl font-bold text-foreground">
                            {profile.stats.averageRating}
                          </span>
                        </HStack>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {profile.stats.ratingCount} {t('profile.reviews')}
                        </div>
                      </div>
                    </HStack>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg sm:rounded-xl w-fit mb-4 sm:mb-6">
            {(['store', 'about', 'reviews'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium capitalize transition-all text-sm sm:text-base ${
                  activeTab === tab
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'store'
                  ? t('profile.myStore')
                  : tab === 'about'
                    ? t('profile.about')
                    : t('profile.reviews')}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="pb-8 sm:pb-12">
            {activeTab === 'store' && (
              <Grid cols={4} colsMobile={2} colsTablet={3} gap="sm" className="sm:gap-4">
                {listingsLoading
                  ? // 加载状态骨架屏
                    Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden h-full">
                        <div className="aspect-square bg-muted animate-pulse" />
                        <CardContent className="p-2 sm:p-4">
                          <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                          <div className="h-5 bg-muted animate-pulse rounded w-1/2" />
                        </CardContent>
                      </Card>
                    ))
                  : listings.map(listing => (
                      <Link key={listing.slug} href={`/product/${listing.slug}`}>
                        <Card className="overflow-hidden h-full hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer">
                          <div className="aspect-square bg-muted">
                            {listing.thumbnail?.medium ? (
                              <img
                                src={getImageUrl(listing.thumbnail.medium) || ''}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <svg
                                  className="w-12 h-12"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-2 sm:p-4">
                            <h3 className="font-medium text-sm sm:text-base text-foreground line-clamp-2 mb-1 sm:mb-2">
                              {listing.title}
                            </h3>
                            <p className="text-base sm:text-lg font-bold text-emerald-600">
                              {listing.price?.currencyCode === 'USD'
                                ? '$'
                                : listing.price?.currencyCode}
                              {Number(listing.price?.amount || 0).toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                {/* Add New Listing Card */}
                <Link href="/listing/new">
                  <Card className="h-full flex flex-col items-center justify-center min-h-[200px] sm:min-h-[280px] border-2 border-dashed border-border hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 active:scale-[0.98] transition-all cursor-pointer">
                    <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3 sm:mb-4">
                        <svg
                          className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <span className="font-medium text-sm sm:text-base text-muted-foreground text-center">
                        {t('profile.addNewListing')}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </Grid>
            )}

            {activeTab === 'about' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-bold text-foreground mb-4">
                        {t('profile.about')}
                      </h2>
                      <div className="prose prose-slate dark:prose-invert max-w-none">
                        {profile.about?.split('\n').map((paragraph, i) => (
                          <p key={i} className="text-muted-foreground mb-4">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-bold text-foreground mb-4">
                        {t('profile.contactInformation')}
                      </h2>
                      <VStack gap="md">
                        {profile.contactInfo?.email && (
                          <HStack gap="sm" align="center">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{t('profile.email')}</p>
                              <a
                                href={`mailto:${profile.contactInfo.email}`}
                                className="text-emerald-600 hover:underline"
                              >
                                {profile.contactInfo.email}
                              </a>
                            </div>
                          </HStack>
                        )}
                        {profile.contactInfo?.phoneNumber && (
                          <HStack gap="sm" align="center">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{t('profile.phone')}</p>
                              <a
                                href={`tel:${profile.contactInfo.phoneNumber}`}
                                className="text-emerald-600 hover:underline"
                              >
                                {profile.contactInfo.phoneNumber}
                              </a>
                            </div>
                          </HStack>
                        )}
                        {profile.contactInfo?.website && (
                          <HStack gap="sm" align="center">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {t('profile.website')}
                              </p>
                              <a
                                href={profile.contactInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:underline"
                              >
                                {profile.contactInfo.website}
                              </a>
                            </div>
                          </HStack>
                        )}
                      </VStack>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <Card>
                <CardContent className="p-6">
                  <HStack justify="between" align="center" className="mb-6">
                    <h2 className="text-xl font-bold text-foreground">{t('profile.reviews')}</h2>
                    <HStack gap="sm" align="center">
                      <span className="text-amber-500 text-2xl">★</span>
                      <span className="text-2xl font-bold text-foreground">
                        {profile.stats.averageRating}
                      </span>
                      <span className="text-muted-foreground">
                        ({profile.stats.ratingCount} {t('profile.reviews')})
                      </span>
                    </HStack>
                  </HStack>

                  {/* Mock Reviews */}
                  <VStack gap="md">
                    {[
                      {
                        user: 'Alice',
                        rating: 5,
                        comment: 'Excellent seller! Fast shipping and great communication.',
                        date: '2024-01-15',
                      },
                      {
                        user: 'Bob',
                        rating: 5,
                        comment: 'Product exactly as described. Would buy again!',
                        date: '2024-01-10',
                      },
                      {
                        user: 'Charlie',
                        rating: 4,
                        comment: 'Good quality item. Shipping took a bit longer than expected.',
                        date: '2024-01-05',
                      },
                    ].map((review, index) => (
                      <div key={index} className="pb-4 border-b border-border last:border-0">
                        <HStack gap="sm" align="center" className="mb-2">
                          <Avatar name={review.user} size="sm" />
                          <span className="font-medium text-foreground">{review.user}</span>
                          <HStack gap="xs" className="ml-auto">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'text-amber-500' : 'text-muted-foreground/30'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </HStack>
                        </HStack>
                        <p className="text-muted-foreground">{review.comment}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">{review.date}</p>
                      </div>
                    ))}
                  </VStack>
                </CardContent>
              </Card>
            )}
          </div>
        </Container>
      </main>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <HStack justify="between" align="center" className="mb-6">
                <h2 className="text-xl font-bold text-foreground">{t('profile.editProfile')}</h2>
                <button onClick={handleCancel} className="p-2 hover:bg-surface-hover rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </HStack>

              <VStack gap="md">
                {/* Profile Images */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {t('settings.avatar')}
                  </h3>
                  <div className="flex gap-4">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted mb-2">
                        {pendingAvatarHashes?.medium || profile?.avatarHashes?.medium ? (
                          <img
                            src={
                              getImageUrl(
                                pendingAvatarHashes?.medium || profile?.avatarHashes?.medium
                              ) || ''
                            }
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <svg
                              className="w-8 h-8"
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
                        )}
                        {avatarUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                          </div>
                        )}
                      </div>
                      <label className="cursor-pointer text-sm text-emerald-600 hover:underline">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={avatarUploading}
                        />
                        {t('settings.loadAvatar')}
                      </label>
                    </div>

                    {/* Header Upload */}
                    <div className="flex-1">
                      <div className="relative h-24 rounded-lg overflow-hidden bg-muted mb-2">
                        {pendingHeaderHashes?.large || profile?.headerHashes?.large ? (
                          <img
                            src={
                              getImageUrl(
                                pendingHeaderHashes?.large || profile?.headerHashes?.large
                              ) || ''
                            }
                            alt="Header"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <svg
                              className="w-8 h-8"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                        {headerUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                          </div>
                        )}
                      </div>
                      <label className="cursor-pointer text-sm text-emerald-600 hover:underline">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHeaderUpload}
                          className="hidden"
                          disabled={headerUploading}
                        />
                        {t('settings.loadHeader')}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Profile Information */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {t('profile.profileInformation')}
                  </h3>
                  <VStack gap="sm">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">
                        {t('profile.name')} *
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => handleEditChange('name', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder={t('profile.name')}
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">
                        {t('profile.bio')}
                      </label>
                      <input
                        type="text"
                        value={editForm.shortDescription}
                        onChange={e => handleEditChange('shortDescription', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder={t('profile.bio')}
                        maxLength={140}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">
                        {t('profile.location')}
                      </label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={e => handleEditChange('location', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder={t('profile.location')}
                      />
                    </div>
                  </VStack>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {t('profile.contactInformation')}
                  </h3>
                  <VStack gap="sm">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">
                        {t('profile.email')}
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => handleEditChange('email', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">
                        {t('profile.phone')}
                      </label>
                      <input
                        type="tel"
                        value={editForm.phoneNumber}
                        onChange={e => handleEditChange('phoneNumber', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">
                        {t('profile.website')}
                      </label>
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={e => handleEditChange('website', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </VStack>
                </div>

                {/* About */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {t('profile.about')}
                  </h3>
                  <textarea
                    value={editForm.about}
                    onChange={e => handleEditChange('about', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder={t('profile.about')}
                  />
                </div>
              </VStack>

              <HStack gap="sm" justify="end" className="mt-6 pt-6 border-t border-border">
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      {t('common.loading')}
                    </span>
                  ) : (
                    t('profile.saveChanges')
                  )}
                </Button>
              </HStack>
            </div>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
