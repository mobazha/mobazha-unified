'use client';

import React from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useI18n, useCurrency, getImageUrl } from '@mobazha/core';
import type { ListingFormData } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PreviewStepProps {
  formData: ListingFormData;
  hasImages: boolean;
  hasTitle: boolean;
  hasPrice: boolean;
  isSubmitting: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-destructive" />
      )}
      <span className={`text-sm ${ok ? 'text-foreground' : 'text-destructive'}`}>{label}</span>
    </div>
  );
}

export function PreviewStep({
  formData,
  hasImages,
  hasTitle,
  hasPrice,
  isSubmitting,
  onPublish,
  onSaveDraft,
}: PreviewStepProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  const firstImage = formData.images[0];
  const imageHash = firstImage?.medium || firstImage?.small || firstImage?.original;
  const imageUrl = imageHash ? getImageUrl(imageHash) || null : null;

  const canPublish = hasImages && hasTitle && hasPrice;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('listing.quickCreate.previewTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('listing.quickCreate.previewDesc')}</p>
      </div>

      {/* Product preview card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {imageUrl && (
            <div className="sm:w-40 sm:h-40 h-48 bg-muted shrink-0">
              <img src={imageUrl} alt={formData.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4 flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{formData.title || '—'}</h3>
            {formData.shortDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {formData.shortDescription}
              </p>
            )}
            <p className="text-lg font-bold text-primary mt-2">
              {hasPrice ? formatPrice(parseFloat(formData.price), formData.pricingCurrency) : '—'}
            </p>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.slice(0, 5).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {formData.tags.length > 5 && (
                  <span className="text-xs text-muted-foreground">+{formData.tags.length - 5}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Checklist */}
      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          {t('listing.quickCreate.checklist')}
        </h3>
        <CheckItem ok={hasImages} label={t('listing.quickCreate.checkImages')} />
        <CheckItem ok={hasTitle} label={t('listing.quickCreate.checkTitle')} />
        <CheckItem ok={hasPrice} label={t('listing.quickCreate.checkPrice')} />
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onPublish}
          disabled={!canPublish || isSubmitting}
          className="flex-1 min-h-[44px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('listing.quickCreate.publishing')}
            </>
          ) : (
            t('listing.quickCreate.publish')
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onSaveDraft}
          disabled={!hasTitle || isSubmitting}
          className="flex-1 min-h-[44px]"
        >
          {t('listing.quickCreate.saveDraft')}
        </Button>
      </div>
    </div>
  );
}
