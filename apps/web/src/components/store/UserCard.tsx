'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { profileApi, socialApi, getImageUrl, useI18n, useUserStore } from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';
import { MapPin, UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface UserCardProps {
  /** 用户 peerID */
  peerID: string;
  /** 是否显示关注按钮 */
  showFollowButton?: boolean;
  /** 点击卡片时的回调 */
  onClick?: () => void;
}

/**
 * 用户卡片组件
 * 显示用户的头像、封面、名称、handle、位置、评分等信息
 */
export function UserCard({ peerID, showFollowButton = true, onClick }: UserCardProps) {
  const { t } = useI18n();
  const { isAuthenticated, profile: currentUserProfile } = useUserStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // 是否是自己
  const isOwnProfile = isAuthenticated && currentUserProfile?.peerID === peerID;

  // 获取用户资料
  useEffect(() => {
    let isCancelled = false;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = await profileApi.getProfile(peerID);
        if (!isCancelled && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isCancelled = true;
    };
  }, [peerID]);

  // 检查关注状态
  useEffect(() => {
    if (!isAuthenticated || isOwnProfile) return;

    const checkFollowStatus = async () => {
      try {
        const following = await socialApi.isFollowing(peerID);
        setIsFollowing(following);
      } catch (err) {
        console.error('Failed to check follow status:', err);
      }
    };

    checkFollowStatus();
  }, [peerID, isAuthenticated, isOwnProfile]);

  // 关注/取消关注
  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || followLoading || isOwnProfile) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await socialApi.unfollowUser(peerID);
        setIsFollowing(false);
      } else {
        await socialApi.followUser(peerID);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <Skeleton variant="rectangular" height={80} className="w-full" />
        <div className="relative px-3 pb-3">
          <div className="-mt-8 mb-2">
            <Skeleton
              variant="circular"
              width={64}
              height={64}
              className="border-4 border-background"
            />
          </div>
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="50%" height={16} className="mt-1" />
          <Skeleton variant="text" width="80%" height={14} className="mt-2" />
          <Skeleton variant="text" width="60%" height={14} className="mt-2" />
        </div>
      </Card>
    );
  }

  // 未找到用户
  if (!profile) {
    return (
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
        <div className="relative px-3 pb-3">
          <div className="-mt-8 mb-2">
            <Avatar name={peerID.slice(0, 8)} size="lg" className="ring-4 ring-background" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('profile.userNotFound') || 'User not found'}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-1">{peerID.slice(0, 16)}...</p>
        </div>
      </Card>
    );
  }

  // 获取头像和封面
  const avatarUrl = getImageUrl(profile.avatarHashes?.small || profile.avatarHashes?.medium);
  const headerUrl = getImageUrl(profile.headerHashes?.small || profile.headerHashes?.tiny);

  // 统计数据
  const stats = profile.stats || { averageRating: 0, ratingCount: 0 };

  const cardContent = (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      {/* 封面图片 */}
      <div className="h-20 bg-gradient-to-br from-emerald-400 to-teal-500 relative overflow-hidden">
        {headerUrl && (
          <img
            src={headerUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* 关注按钮 */}
        {showFollowButton && !isOwnProfile && isAuthenticated && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant={isFollowing ? 'secondary' : 'default'}
              size="sm"
              onClick={handleFollowToggle}
              disabled={followLoading}
              className="h-7 px-2 text-xs"
            >
              {followLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {!followLoading && isFollowing && <UserMinus className="h-3 w-3" />}
              {!followLoading && !isFollowing && <UserPlus className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </div>

      {/* 用户信息 */}
      <div className="relative px-3 pb-3">
        {/* 头像 */}
        <div className="-mt-8 mb-2">
          <Avatar
            src={avatarUrl}
            name={profile.name || peerID.slice(0, 8)}
            size="lg"
            className="ring-4 ring-background"
          />
        </div>

        {/* 名称和 handle */}
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate text-sm">
            {profile.name || peerID.slice(0, 12)}
          </h3>
          {profile.handle && (
            <p className="text-xs text-muted-foreground truncate">@{profile.handle}</p>
          )}
        </div>

        {/* 简介 */}
        {profile.shortDescription && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {profile.shortDescription}
          </p>
        )}

        {/* 底部：位置和评分 */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          {/* 位置 */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 flex-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {profile.location || t('profile.noLocation') || 'No location'}
            </span>
          </div>

          {/* 评分 */}
          <div className="flex items-center gap-1 text-xs flex-shrink-0 ml-2">
            <span className="text-yellow-500">★</span>
            <span className="font-medium text-foreground">
              {stats.averageRating?.toFixed(1) || '0.0'}
            </span>
            <span className="text-muted-foreground">({stats.ratingCount || 0})</span>
          </div>
        </div>
      </div>
    </Card>
  );

  // 包装链接
  if (onClick) {
    return <div onClick={onClick}>{cardContent}</div>;
  }

  return (
    <Link href={`/store/${peerID}`} className="block">
      {cardContent}
    </Link>
  );
}

export default UserCard;
