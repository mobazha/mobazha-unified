'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layouts';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { useStoreRatings, useI18n } from '@mobazha/core';
import { ReviewCard } from './ReviewCard';
import { Loader2 } from 'lucide-react';

interface StoreReviewsTabProps {
  peerID: string;
}

/**
 * 店铺评价标签页
 * 显示评价统计和评价列表
 */
export function StoreReviewsTab({ peerID }: StoreReviewsTabProps) {
  const { t } = useI18n();
  const { ratingIndex, ratings, isLoading, isLoadingMore, error, hasMore, loadMore } =
    useStoreRatings(peerID, 5);

  // 加载状态
  if (isLoading) {
    return (
      <Container size="xl">
        <div className="space-y-4">
          {/* 统计卡片骨架 */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <Skeleton variant="text" width={80} height={48} className="mx-auto" />
                <Skeleton variant="text" width={100} height={20} className="mx-auto mt-2" />
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="text-center">
                <Skeleton variant="text" width={60} height={48} className="mx-auto" />
                <Skeleton variant="text" width={80} height={20} className="mx-auto mt-2" />
              </div>
            </div>
          </Card>

          {/* 评价列表骨架 */}
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton variant="rectangular" width={80} height={80} className="rounded-lg" />
                  <div className="flex-1">
                    <Skeleton variant="text" width="60%" height={16} />
                    <Skeleton variant="text" width="40%" height={20} className="mt-2" />
                    <Skeleton variant="text" width="80%" height={14} className="mt-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
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

  const count = ratingIndex?.count ?? 0;
  const average = ratingIndex?.average ?? 0;

  return (
    <Container size="xl">
      <div className="space-y-4">
        {/* 评价统计卡片 */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-around">
            {/* 平均评分 */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-yellow-500 text-3xl sm:text-4xl">★</span>
                <span className="text-3xl sm:text-4xl font-bold text-foreground">
                  {average.toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t('product.overallRating') || 'overall rating'}
              </p>
            </div>

            {/* 分隔线 */}
            <div className="h-16 w-px bg-border" />

            {/* 总评价数 */}
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-bold text-foreground">{count}</span>
              <p className="text-sm text-muted-foreground mt-1">
                {count === 1 ? t('profile.review') || 'review' : t('profile.reviews') || 'reviews'}
              </p>
            </div>
          </div>
        </Card>

        {/* 评价列表 */}
        {ratings.length > 0 ? (
          <div className="space-y-3">
            {ratings.map((review, index) => (
              <ReviewCard key={review.ratingID || index} review={review} />
            ))}

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
                      {t('common.loading') || 'Loading...'}
                    </>
                  ) : (
                    t('common.loadMore') || 'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              {t('product.noReviews') || 'No reviews yet'}
            </p>
          </Card>
        )}
      </div>
    </Container>
  );
}

export default StoreReviewsTab;
