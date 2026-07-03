'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@mobazha/core';

interface BasePriceSyncDialogProps {
  open: boolean;
  variantCount: number;
  newPrice: string;
  onApplyAll: () => void;
  onKeepVariants: () => void;
  onReviewVariants: () => void;
  onOpenChange: (open: boolean) => void;
}

export function BasePriceSyncDialog({
  open,
  variantCount,
  newPrice,
  onApplyAll,
  onKeepVariants,
  onReviewVariants,
  onOpenChange,
}: BasePriceSyncDialogProps) {
  const { t } = useI18n();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('listing.priceSync.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('listing.priceSync.description', { count: variantCount, price: newPrice })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <AlertDialogAction onClick={onApplyAll}>
            {t('listing.priceSync.applyAll')}
          </AlertDialogAction>
          <AlertDialogCancel onClick={onKeepVariants}>
            {t('listing.priceSync.keepVariants')}
          </AlertDialogCancel>
          <Button type="button" variant="outline" onClick={onReviewVariants}>
            {t('listing.priceSync.reviewVariants')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
