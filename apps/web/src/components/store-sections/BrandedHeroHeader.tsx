'use client';

import { useI18n, getImageUrl, stripHtmlTags } from '@mobazha/core';
import type { UserProfile, StoreConfig } from '@mobazha/core';
import Link from 'next/link';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/Share';
import { Ban, Paintbrush, Plus, Upload } from 'lucide-react';

interface StoreStats {
  followerCount: number;
  followingCount: number;
  listingCount: number;
  ratingCount: number;
  averageRating: number;
}

interface BrandedHeroHeaderProps {
  store: UserProfile;
  peerId: string;
  stats: StoreStats;
  isOwnStore: boolean;
  isAuthenticated: boolean;
  storefrontConfig?: StoreConfig | null;

  isFollowing: boolean;
  followLoading: boolean;
  onFollowToggle: () => void;

  isBlocked: boolean;
  blockLoading: boolean;
  onBlockToggle: () => void;

  onMessage: () => void;
  onTabChange: (tab: string) => void;
}

export function BrandedHeroHeader({
  store,
  peerId,
  stats,
  isOwnStore,
  isAuthenticated,
  storefrontConfig,
  isFollowing,
  followLoading,
  onFollowToggle,
  isBlocked,
  blockLoading,
  onBlockToggle,
  onMessage,
  onTabChange,
}: BrandedHeroHeaderProps) {
  const { t } = useI18n();

  const heroSection = storefrontConfig?.sections?.find(s => s.type === 'hero');
  const heroProps = heroSection?.props as Record<string, unknown> | undefined;

  const storeHint = isOwnStore ? undefined : peerId;
  const bgUrl =
    (heroProps?.backgroundImage as string) || getImageUrl(store.headerHashes?.large, storeHint);
  const heroTitle = store.name || peerId.slice(0, 8);
  const heroConfigTitle = heroProps?.title as string | undefined;
  const heroConfigSubtitle = heroProps?.subtitle as string | undefined;
  const descriptionText = store.shortDescription
    ? stripHtmlTags(store.shortDescription)
    : undefined;
  const heroSubtitle =
    [heroConfigTitle, heroConfigSubtitle || descriptionText].filter(Boolean).join(' · ') ||
    undefined;
  const ctaText = heroProps?.ctaText as string | undefined;
  const ctaLink = heroProps?.ctaLink as string | undefined;
  const overlayOpacity = (heroProps?.overlayOpacity as number) ?? 0.5;

  const avatarUrl = getImageUrl(store.avatarHashes?.medium, storeHint);

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {bgUrl ? (
          <img src={bgUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/80 to-primary/60" />
        )}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-end min-h-[320px] sm:min-h-[400px] pb-6 sm:pb-8">
          <div className="flex items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <Avatar
              src={avatarUrl}
              name={store.name || peerId.slice(0, 8)}
              size="xl"
              className="ring-4 ring-white/30 w-20 h-20 sm:w-24 sm:h-24 shadow-lg flex-shrink-0"
            />

            {/* Info */}
            <div className="flex-1 min-w-0 text-white">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold drop-shadow-md">
                {heroTitle}
              </h1>
              {heroSubtitle && (
                <p className="mt-1 text-sm sm:text-base opacity-90 line-clamp-2 drop-shadow">
                  {heroSubtitle}
                </p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 sm:gap-5 mt-2 text-sm">
                <button
                  onClick={() => onTabChange('reviews')}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <span className="text-yellow-400">★</span>
                  <span className="font-medium">{stats.averageRating.toFixed(1)}</span>
                  <span className="opacity-70">({stats.ratingCount})</span>
                </button>
                <button
                  onClick={() => onTabChange('followers')}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <span className="font-medium">{stats.followerCount}</span>
                  <span className="opacity-70">{t('profile.followers')}</span>
                </button>
                <button
                  onClick={() => onTabChange('following')}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <span className="font-medium">{stats.followingCount}</span>
                  <span className="opacity-70">{t('profile.following')}</span>
                </button>
                {store.location && (
                  <span className="hidden sm:flex items-center gap-1 opacity-70">
                    <span>📍</span>
                    {store.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions + CTA */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {isOwnStore ? (
              <>
                <Link href="/admin/storefront">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-h-[36px] gap-1.5 bg-white/20 backdrop-blur hover:bg-white/30 text-white border-white/20"
                  >
                    <Paintbrush className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t('admin.storeBranding.editAppearance')}
                    </span>
                  </Button>
                </Link>
                <Link href="/listing/new">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-h-[36px] gap-1.5 bg-white/20 backdrop-blur hover:bg-white/30 text-white border-white/20"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('userPage.createListing')}</span>
                  </Button>
                </Link>
                <Link href="/listing/import">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-h-[36px] gap-1.5 bg-white/20 backdrop-blur hover:bg-white/30 text-white border-white/20"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('userPage.importListings')}</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  variant={isFollowing ? 'secondary' : 'default'}
                  size="sm"
                  onClick={onFollowToggle}
                  disabled={followLoading || !isAuthenticated}
                  className="min-h-[36px]"
                >
                  {followLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  ) : isFollowing ? (
                    t('profile.unfollow')
                  ) : (
                    t('profile.follow')
                  )}
                </Button>
                <Button variant="secondary" size="sm" onClick={onMessage} className="min-h-[36px]">
                  {t('profile.message')}
                </Button>
                <Button
                  variant={isBlocked ? 'destructive' : 'secondary'}
                  size="sm"
                  onClick={onBlockToggle}
                  disabled={blockLoading || !isAuthenticated}
                  className="min-h-[36px] min-w-[36px]"
                  title={isBlocked ? t('profile.unblock') : t('profile.block')}
                >
                  {blockLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}

            {ctaText && !isOwnStore && (
              <a
                href={ctaLink || '#products'}
                className="inline-flex items-center justify-center px-5 py-2 rounded-md text-sm font-semibold transition-colors min-h-[36px]"
                style={{
                  backgroundColor: 'var(--store-primary, #ffffff)',
                  color: 'var(--store-on-primary, #111827)',
                }}
              >
                {ctaText}
              </a>
            )}

            <div className="ml-auto">
              <ShareButton
                url={typeof window !== 'undefined' ? window.location.href : `/store/${peerId}`}
                title={store.name || peerId.slice(0, 8)}
                description={
                  store.shortDescription ? stripHtmlTags(store.shortDescription) : undefined
                }
                embedType="store"
                embedIdentifier={peerId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
