'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VStack, HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

export interface OrderRatingData {
  slug: string;
  overall: number;
  quality?: number;
  description?: number;
  deliverySpeed?: number;
  customerService?: number;
  review?: string;
  anonymous?: boolean;
}

export interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ratings: OrderRatingData[]) => Promise<void>;
  isLoading?: boolean;
  orderInfo?: {
    orderId: string;
    items: Array<{
      slug: string;
      title: string;
    }>;
    vendorName?: string;
  };
}

/**
 * 星级评分组件
 */
const StarRating: React.FC<{
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ value, onChange, size = 'md' }) => {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className="text-yellow-400 hover:scale-110 transition-transform"
        >
          <svg
            className={sizeClasses[size]}
            fill={(hoverValue || value) >= star ? 'currentColor' : 'none'}
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
        </button>
      ))}
    </div>
  );
};

/**
 * 订单评价模态框
 */
export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  orderInfo,
}) => {
  const { t } = useI18n();

  const [overall, setOverall] = useState(5);
  const [quality, setQuality] = useState(5);
  const [description, setDescription] = useState(5);
  const [deliverySpeed, setDeliverySpeed] = useState(5);
  const [customerService, setCustomerService] = useState(5);
  const [review, setReview] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (overall === 0) {
      window.alert(t('order.rating.overallRequired'));
      return;
    }

    const ratings: OrderRatingData[] = (orderInfo?.items || [{ slug: '' }]).map(item => ({
      slug: item.slug,
      overall,
      quality: quality > 0 ? quality : undefined,
      description: description > 0 ? description : undefined,
      deliverySpeed: deliverySpeed > 0 ? deliverySpeed : undefined,
      customerService: customerService > 0 ? customerService : undefined,
      review: review.trim() || undefined,
      anonymous,
    }));

    await onSubmit(ratings);
  }, [
    overall,
    quality,
    description,
    deliverySpeed,
    customerService,
    review,
    anonymous,
    orderInfo,
    onSubmit,
    t,
  ]);

  const handleClose = useCallback(() => {
    setOverall(5);
    setQuality(5);
    setDescription(5);
    setDeliverySpeed(5);
    setCustomerService(5);
    setReview('');
    setAnonymous(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-lg p-4 sm:p-6 my-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">
          {t('order.rating.title')}
        </h2>
        {orderInfo?.vendorName && (
          <p className="text-sm text-muted-foreground mb-4">
            {t('order.rating.ratingFor', { vendor: orderInfo.vendorName })}
          </p>
        )}

        <VStack gap="md">
          {/* Overall Rating */}
          <div className="bg-muted/50 rounded-lg p-4">
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('order.rating.overall')} *
            </label>
            <StarRating value={overall} onChange={setOverall} size="lg" />
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('order.rating.quality')}
              </label>
              <StarRating value={quality} onChange={setQuality} size="sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('order.rating.description')}
              </label>
              <StarRating value={description} onChange={setDescription} size="sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('order.rating.deliverySpeed')}
              </label>
              <StarRating value={deliverySpeed} onChange={setDeliverySpeed} size="sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('order.rating.customerService')}
              </label>
              <StarRating value={customerService} onChange={setCustomerService} size="sm" />
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('order.rating.review')}
            </label>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
              placeholder={t('order.rating.reviewPlaceholder')}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{review.length}/500</p>
          </div>

          {/* Anonymous Option */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={e => setAnonymous(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">{t('order.rating.anonymous')}</span>
          </label>
        </VStack>

        <HStack justify="end" gap="sm" className="mt-6">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isLoading || overall === 0}>
            {isLoading ? t('common.loading') : t('order.rating.submit')}
          </Button>
        </HStack>
      </Card>
    </div>
  );
};

export default RatingModal;
