'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layouts';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { socialApi, useI18n, useUserStore } from '@mobazha/core';
import { UserCard } from './UserCard';
import { Loader2, Users } from 'lucide-react';

interface FollowTabProps {
  /** 店铺 peerID */
  peerID: string;
  /** 类型：followers 或 following */
  type: 'followers' | 'following';
}

/**
 * 关注者/关注中标签页
 * 显示用户的粉丝或关注列表
 */
export function FollowTab({ peerID, type }: FollowTabProps) {
  const { t } = useI18n();
  const { isAuthenticated, profile: currentUserProfile } = useUserStore();

  const [peerIDs, setPeerIDs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 分页状态
  const pageSize = 12;
  const [displayCount, setDisplayCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 是否是自己的页面
  const isOwnPage = isAuthenticated && currentUserProfile?.peerID === peerID;

  // 获取关注者/关注列表
  useEffect(() => {
    let isCancelled = false;

    const fetchList = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const list =
          type === 'followers'
            ? await socialApi.getFollowers(peerID)
            : await socialApi.getFollowing(peerID);

        if (!isCancelled) {
          setPeerIDs(list);
          setDisplayCount(pageSize);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch list');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchList();

    return () => {
      isCancelled = true;
    };
  }, [peerID, type]);

  // 加载更多
  const loadMore = useCallback(() => {
    setIsLoadingMore(true);
    // 模拟加载延迟
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + pageSize, peerIDs.length));
      setIsLoadingMore(false);
    }, 300);
  }, [peerIDs.length]);

  // 显示的用户列表
  const displayedPeerIDs = peerIDs.slice(0, displayCount);
  const hasMore = displayCount < peerIDs.length;

  // 加载状态
  if (isLoading) {
    return (
      <Container size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton variant="rectangular" height={80} className="w-full" />
              <div className="relative px-3 pb-3">
                <div className="-mt-8 mb-2">
                  <Skeleton variant="circular" width={64} height={64} />
                </div>
                <Skeleton variant="text" width="70%" height={20} />
                <Skeleton variant="text" width="50%" height={16} className="mt-1" />
                <Skeleton variant="text" width="80%" height={14} className="mt-2" />
              </div>
            </Card>
          ))}
        </div>
      </Container>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Container size="xl">
        <Card className="p-6 text-center">
          <p className="text-destructive">{error}</p>
        </Card>
      </Container>
    );
  }

  // 空状态
  if (peerIDs.length === 0) {
    // 根据类型和页面所有者确定空状态消息
    const getEmptyMessage = (): string => {
      if (type === 'followers') {
        if (isOwnPage) {
          return t('profile.noOwnFollowers');
        }
        return t('profile.noFollowers');
      }
      // type === 'following'
      if (isOwnPage) {
        return t('profile.noOwnFollowing');
      }
      return t('profile.noFollowing');
    };

    const emptyMessage = getEmptyMessage();

    return (
      <Container size="xl">
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <div className="space-y-4">
        {/* 用户卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedPeerIDs.map(id => (
            <UserCard key={id} peerID={id} showFollowButton={!isOwnPage} />
          ))}
        </div>

        {/* 加载更多按钮 */}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="min-w-[140px]"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.loadMore')
              )}
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
}

export default FollowTab;
