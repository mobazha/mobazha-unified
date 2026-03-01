'use client';

import React, { useState, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { VStack } from '@/components/layouts';
import { StarRating } from '@/components/ui/star-rating';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface ReviewData {
  overall: number;
  review: string;
  anonymous: boolean;
}

interface WriteReviewDialogProps {
  open: boolean;
  productTitle?: string;
  onSubmit: (data: ReviewData) => void;
  onSkip: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
  isMobile?: boolean;
}

function ReviewForm({
  productTitle,
  onSubmit,
  onSkip,
  isSubmitting,
}: Pick<WriteReviewDialogProps, 'productTitle' | 'onSubmit' | 'onSkip' | 'isSubmitting'>) {
  const { t } = useI18n();
  const [overall, setOverall] = useState(0);
  const [review, setReview] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const handleSubmit = useCallback(() => {
    onSubmit({ overall: overall > 0 ? overall : 5, review, anonymous });
  }, [overall, review, anonymous, onSubmit]);

  return (
    <VStack gap="md">
      {productTitle && (
        <p className="text-sm text-muted-foreground truncate max-w-xs mx-auto text-center">
          {productTitle}
        </p>
      )}

      <VStack gap="xs" align="center">
        <span className="text-sm font-medium text-muted-foreground">
          {t('order.review.rateExperience')}
        </span>
        <StarRating value={overall} onChange={setOverall} size="lg" />
      </VStack>

      <div>
        <label htmlFor="review-text" className="text-sm font-medium text-foreground mb-1.5 block">
          {t('order.review.reviewLabel')}
        </label>
        <textarea
          id="review-text"
          value={review}
          onChange={e => setReview(e.target.value)}
          placeholder={t('order.review.reviewPlaceholder')}
          className="w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          maxLength={2000}
        />
      </div>

      <label htmlFor="review-anonymous" className="flex items-center gap-2 cursor-pointer">
        <input
          id="review-anonymous"
          type="checkbox"
          checked={anonymous}
          onChange={e => setAnonymous(e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        <span className="text-sm text-muted-foreground">{t('order.review.anonymous')}</span>
      </label>

      <div className="flex gap-3 w-full pt-2">
        <Button size="lg" className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? t('common.processing') : t('order.review.submit')}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="flex-1"
          onClick={onSkip}
          disabled={isSubmitting}
        >
          {t('order.review.skip')}
        </Button>
      </div>
    </VStack>
  );
}

export function WriteReviewDialog({
  open,
  productTitle,
  onSubmit,
  onSkip,
  onClose,
  isSubmitting,
  isMobile,
}: WriteReviewDialogProps) {
  const { t } = useI18n();

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={isOpen => {
          if (!isOpen && !isSubmitting) onClose();
        }}
      >
        <SheetContent
          side="bottom"
          className="px-4 pb-8 pt-6 rounded-t-2xl max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center">{t('order.review.title')}</SheetTitle>
            <SheetDescription className="sr-only">{t('order.review.title')}</SheetDescription>
          </SheetHeader>
          <ReviewForm
            productTitle={productTitle}
            onSubmit={onSubmit}
            onSkip={onSkip}
            isSubmitting={isSubmitting}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{t('order.review.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('order.review.title')}</DialogDescription>
        </DialogHeader>
        <ReviewForm
          productTitle={productTitle}
          onSubmit={onSubmit}
          onSkip={onSkip}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
