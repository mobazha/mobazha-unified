'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useI18n, imagesApi } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { VStack } from '@/components/layouts';
import { StarRating } from '@/components/ui/star-rating';
import { ImagePlus, X, Loader2 } from 'lucide-react';
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

const MAX_REVIEW_IMAGES = 3;
const MAX_FILE_SIZE_MB = 10;

interface ReviewImage {
  file: File;
  preview: string;
  hash?: string;
  uploading: boolean;
  error?: string;
}

export interface ReviewData {
  overall: number;
  review: string;
  anonymous: boolean;
  imageHashes?: string[];
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
  const [images, setImages] = useState<ReviewImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<ReviewImage> => {
    const preview = URL.createObjectURL(file);
    const entry: ReviewImage = { file, preview, uploading: true };

    try {
      const base64 = await imagesApi.fileToBase64(file);
      const result = await imagesApi.uploadImage({
        filename: `review_${Date.now()}`,
        image: base64,
      });
      if (result?.small) {
        return { ...entry, hash: result.small, uploading: false };
      }
      return { ...entry, uploading: false, error: 'Upload failed' };
    } catch {
      return { ...entry, uploading: false, error: 'Upload failed' };
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (fileInputRef.current) fileInputRef.current.value = '';

      const available = MAX_REVIEW_IMAGES - images.length;
      const toAdd = files.slice(0, available).filter(f => {
        if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;
        if (!f.type.startsWith('image/')) return false;
        return true;
      });

      const placeholders: ReviewImage[] = toAdd.map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        uploading: true,
      }));
      setImages(prev => [...prev, ...placeholders]);

      const uploaded = await Promise.all(toAdd.map(uploadFile));
      setImages(prev => {
        const existing = prev.filter(img => !placeholders.some(p => p.preview === img.preview));
        return [...existing, ...uploaded];
      });
    },
    [images.length, uploadFile]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const anyUploading = images.some(img => img.uploading);

  const handleSubmit = useCallback(() => {
    if (anyUploading) return;
    const hashes = images.filter(img => img.hash).map(img => img.hash!);
    onSubmit({
      overall: overall > 0 ? overall : 5,
      review,
      anonymous,
      imageHashes: hashes.length > 0 ? hashes : undefined,
    });
  }, [overall, review, anonymous, images, anyUploading, onSubmit]);

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
        {overall > 0 && (
          <span className="text-sm font-medium text-primary animate-in fade-in duration-200">
            {t(`order.review.star${overall}`)}
          </span>
        )}
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

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {t('order.review.photos')}
        </label>
        <div className="flex flex-wrap gap-2">
          {images.map((img, idx) => (
            <div
              key={img.preview}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group"
            >
              <img
                src={img.preview}
                alt={`Review ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {img.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
              {img.error && (
                <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove image ${idx + 1}`}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {images.length < MAX_REVIEW_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              aria-label={t('order.review.addPhoto')}
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('order.review.photosHint', {
            max: String(MAX_REVIEW_IMAGES),
            size: String(MAX_FILE_SIZE_MB),
          })}
        </p>
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
        <Button
          size="lg"
          className="flex-1"
          onClick={handleSubmit}
          disabled={isSubmitting || anyUploading}
        >
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
