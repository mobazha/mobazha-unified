'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { VStack, HStack } from '@/components/layouts';
import { ReviewImageGallery } from '@/components/Review/ReviewImageGallery';
import { getImageUrl, useI18n } from '@mobazha/core';
import { formatOrderDate } from './utils';

export interface RatingData {
  overall: number;
  review?: string;
  anonymous?: boolean;
  imageHashes?: string[];
  imageUrls?: string[];
}

export interface ReviewerInfo {
  peerID: string;
  name?: string;
  handle?: string;
  avatar?: string;
}

export interface OrderRatingProps {
  rating?: RatingData;
  reviewer?: ReviewerInfo;
  timestamp?: string;
  className?: string;
}

/**
 * 星级展示组件
 */
const StarDisplay: React.FC<{ value: number; size?: 'sm' | 'md' }> = ({ value, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          className={`${sizeClass} ${star <= value ? 'text-warning' : 'text-muted'}`}
          fill={star <= value ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </div>
  );
};

/**
 * 订单评价展示组件
 */
export const OrderRating: React.FC<OrderRatingProps> = ({
  rating,
  reviewer,
  timestamp,
  className = '',
}) => {
  const { t } = useI18n();

  // No rating yet
  if (!rating) {
    return (
      <Card className={`p-4 sm:p-6 ${className}`}>
        <HStack gap="sm" align="center">
          <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="text-sm text-muted-foreground italic">{t('order.rating.noRating')}</span>
        </HStack>
      </Card>
    );
  }

  const reviewerName = rating.anonymous
    ? t('product.anonymous')
    : reviewer?.name ||
      reviewer?.handle ||
      (reviewer?.peerID ? `${reviewer.peerID.slice(0, 8)}...` : t('product.anonymous'));
  const imageUrls =
    rating.imageUrls ||
    rating.imageHashes?.map(hash => getImageUrl(hash) || '').filter(Boolean) ||
    [];

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        {t('order.rating.buyerReview')}
      </h3>

      <VStack gap="md">
        {/* Reviewer Info */}
        <HStack justify="between" align="center">
          <HStack gap="sm" align="center">
            <Avatar
              src={rating.anonymous ? undefined : reviewer?.avatar}
              name={reviewerName}
              size="sm"
              className="w-8 h-8"
            />
            <div>
              <p className="text-sm font-medium text-foreground">{reviewerName}</p>
              {timestamp && (
                <p className="text-xs text-muted-foreground">
                  {formatOrderDate(timestamp, { short: true })}
                </p>
              )}
            </div>
          </HStack>

          {/* Overall Rating */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <StarDisplay value={rating.overall} size="md" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rating.overall.toFixed(1)} / 5.0
            </p>
          </div>
        </HStack>

        {/* Review Text */}
        {rating.review && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">{rating.review}</p>
          </div>
        )}

        <ReviewImageGallery
          imageUrls={imageUrls}
          altPrefix={`${reviewerName} review image`}
          size="md"
          showLabel={imageUrls.length > 1}
        />
      </VStack>
    </Card>
  );
};

export default OrderRating;
