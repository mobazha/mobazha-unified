'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { ImageThumbnails } from '@/components/ui/image-thumbnails';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface ReviewImageGalleryProps {
  imageUrls?: string[];
  altPrefix?: string;
  className?: string;
  thumbnailClassName?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const ReviewImageGallery = memo(function ReviewImageGallery({
  imageUrls,
  altPrefix = 'Review image',
  className,
  thumbnailClassName,
  size = 'sm',
  showLabel = false,
}: ReviewImageGalleryProps) {
  const { t } = useI18n();
  const safeImageUrls = useMemo(
    () => (Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : []),
    [imageUrls]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openPreview = useCallback((index: number) => {
    setSelectedIndex(index);
    setIsPreviewOpen(true);
  }, []);

  if (safeImageUrls.length === 0) {
    return null;
  }

  const thumbnailSizeClass = size === 'md' ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-20 w-20';

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {showLabel && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('order.review.photos')}
            </span>
            <span className="text-xs text-muted-foreground">
              {safeImageUrls.length}
              {safeImageUrls.length > 1 ? ` ${t('order.review.photos').toLowerCase()}` : ''}
            </span>
          </div>
        )}

        <ImageThumbnails
          imageUrls={safeImageUrls}
          onSelect={openPreview}
          altPrefix={altPrefix}
          itemClassName={cn(
            thumbnailSizeClass,
            'rounded-lg border border-border bg-muted',
            thumbnailClassName
          )}
          inactiveClassName="border border-border bg-muted hover:opacity-90"
          activeClassName="border border-primary ring-2 ring-primary/20 bg-muted"
          dataTestIdPrefix="review-image-thumbnail"
          getAriaLabel={index => `Preview review image ${index + 1}`}
        />
      </div>

      <ImageLightbox
        imageUrls={safeImageUrls}
        open={isPreviewOpen}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        onOpenChange={setIsPreviewOpen}
        altPrefix={altPrefix}
        ariaLabel="Review image preview"
        testIdPrefix="review-image-preview"
      />
    </>
  );
});
