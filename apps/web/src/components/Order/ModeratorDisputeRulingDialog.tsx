'use client';

import React, { memo } from 'react';
import {
  useI18n,
  type ModeratorRulingConstraints,
  type ModeratorRulingDraft,
  type ModeratorRulingPreset,
  type ModeratorRulingValidationErrors,
} from '@mobazha/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export interface ModeratorDisputeRulingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ModeratorRulingDraft;
  validationErrors: ModeratorRulingValidationErrors;
  activePreset: ModeratorRulingPreset | null;
  vendorNotConfirmed: boolean;
  constraints: ModeratorRulingConstraints;
  buyerLabel: string;
  sellerLabel: string;
  isSubmitting?: boolean;
  onApplyPreset: (preset: ModeratorRulingPreset) => void;
  onBuyerPercentageChange: (value: number) => void;
  onVendorPercentageChange: (value: number) => void;
  onResolutionChange: (value: string) => void;
  onSubmit: () => void;
}

function fieldErrorMessage(
  t: (key: string) => string,
  code: ModeratorRulingValidationErrors[keyof ModeratorRulingValidationErrors] | undefined
): string | undefined {
  if (!code) return undefined;
  return t(`order.moderatorRuling.errors.${code}`);
}

const PRESET_CHIPS: ModeratorRulingPreset[] = ['buyer', 'split', 'seller'];

export const ModeratorDisputeRulingDialog = memo(function ModeratorDisputeRulingDialog({
  open,
  onOpenChange,
  draft,
  validationErrors,
  activePreset,
  vendorNotConfirmed,
  constraints,
  buyerLabel,
  sellerLabel,
  isSubmitting = false,
  onApplyPreset,
  onBuyerPercentageChange,
  onVendorPercentageChange,
  onResolutionChange,
  onSubmit,
}: ModeratorDisputeRulingDialogProps) {
  const { t } = useI18n();
  const lockVendor = constraints.lockVendorShareAboveZero;
  const inputsDisabled = isSubmitting || lockVendor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('order.moderatorRuling.title')}</DialogTitle>
          <DialogDescription>{t('order.moderatorRuling.sumHint')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {vendorNotConfirmed && (
            <div
              className="flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground"
              role="status"
              data-testid="moderator-ruling-vendor-unconfirmed"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p>{t('order.moderatorRuling.vendorNotConfirmed')}</p>
            </div>
          )}

          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t('order.moderatorRuling.presetGroup')}
          >
            {PRESET_CHIPS.map(preset => {
              const disabled = isSubmitting || (lockVendor && preset !== 'buyer');
              const labelKey =
                preset === 'buyer'
                  ? 'order.moderatorRuling.chipBuyer'
                  : preset === 'seller'
                    ? 'order.moderatorRuling.chipSeller'
                    : 'order.moderatorRuling.chipSplit';
              return (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={activePreset === preset ? 'default' : 'outline'}
                  disabled={disabled}
                  className={cn('text-xs', activePreset === preset && 'ring-2 ring-primary/30')}
                  onClick={() => onApplyPreset(preset)}
                  data-testid={`moderator-ruling-chip-${preset}`}
                >
                  {t(labelKey)}
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="moderator-ruling-buyer-pct">
                {t('order.moderatorRuling.buyerShare')}
              </Label>
              <p className="text-xs text-muted-foreground truncate" title={buyerLabel}>
                {buyerLabel}
              </p>
              <Input
                id="moderator-ruling-buyer-pct"
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                value={draft.buyerPercentage}
                disabled={inputsDisabled}
                onChange={e => onBuyerPercentageChange(Number(e.target.value))}
                aria-invalid={!!validationErrors.buyerPercentage}
                data-testid="moderator-ruling-buyer-pct"
              />
              {validationErrors.buyerPercentage && (
                <p className="text-xs text-destructive">
                  {fieldErrorMessage(t, validationErrors.buyerPercentage)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="moderator-ruling-seller-pct">
                {t('order.moderatorRuling.sellerShare')}
              </Label>
              <p className="text-xs text-muted-foreground truncate" title={sellerLabel}>
                {sellerLabel}
              </p>
              <Input
                id="moderator-ruling-seller-pct"
                type="number"
                min={0}
                max={lockVendor ? 0 : 100}
                inputMode="numeric"
                value={draft.vendorPercentage}
                disabled={inputsDisabled}
                onChange={e => onVendorPercentageChange(Number(e.target.value))}
                aria-invalid={!!validationErrors.vendorPercentage}
                data-testid="moderator-ruling-seller-pct"
              />
              {validationErrors.vendorPercentage && (
                <p className="text-xs text-destructive">
                  {fieldErrorMessage(t, validationErrors.vendorPercentage)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="moderator-ruling-resolution">
              {t('order.moderatorRuling.resolutionLabel')}
            </Label>
            <Textarea
              id="moderator-ruling-resolution"
              rows={5}
              value={draft.resolution}
              disabled={isSubmitting}
              placeholder={t('order.moderatorRuling.resolutionPlaceholder')}
              onChange={e => onResolutionChange(e.target.value)}
              aria-invalid={!!validationErrors.resolution}
              data-testid="moderator-ruling-resolution"
            />
            {validationErrors.resolution && (
              <p className="text-xs text-destructive">
                {fieldErrorMessage(t, validationErrors.resolution)}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{t('order.moderatorRuling.submitHint')}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => void onSubmit()}
            data-testid="moderator-ruling-submit"
          >
            {isSubmitting ? t('common.loading') : t('order.moderatorRuling.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
