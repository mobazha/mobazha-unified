'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import { Star } from 'lucide-react';

interface ReviewData {
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
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <HStack gap="xs">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="w-11 h-11 flex items-center justify-center transition-transform hover:scale-110 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          data-testid={`star-${star}`}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= (hover || value)
                ? 'fill-amber-500 text-amber-500'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </HStack>
  );
}

export function WriteReviewDialog({
  open,
  productTitle,
  onSubmit,
  onSkip,
  onClose,
  isSubmitting,
}: WriteReviewDialogProps) {
  const { t } = useI18n();
  const [overall, setOverall] = useState(0);
  const [review, setReview] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const handleSubmit = useCallback(() => {
    onSubmit({ overall: overall > 0 ? overall : 5, review, anonymous });
  }, [overall, review, anonymous, onSubmit]);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 outline-none"
      data-testid="write-review-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-review-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-6">
        <VStack gap="md">
          <div className="text-center">
            <h2 id="write-review-title" className="text-lg font-semibold text-foreground">
              {t('order.review.title')}
            </h2>
            {productTitle && (
              <p className="text-sm text-muted-foreground mt-1 truncate max-w-xs mx-auto">
                {productTitle}
              </p>
            )}
          </div>

          <VStack gap="xs" align="center">
            <span className="text-sm font-medium text-muted-foreground">
              {t('order.review.rateExperience')}
            </span>
            <StarRating value={overall} onChange={setOverall} />
          </VStack>

          <div>
            <label
              htmlFor="review-text"
              className="text-sm font-medium text-foreground mb-1.5 block"
            >
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

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('common.cancel')}
          </button>
        </VStack>
      </div>
    </div>
  );
}
