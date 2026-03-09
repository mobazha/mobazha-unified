'use client';

import React from 'react';
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import type { ListingFormData } from '@mobazha/core';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TokenInput } from '@/components/ui/TokenInput';
import { AiSetupPrompt } from '@/components/Listing/AiAssistant';

interface AiReviewStepProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  onTagsChange: (tags: string[]) => void;
  errors: Record<string, string | undefined>;
  aiLoading: boolean;
  aiError: string | null;
  aiNotConfigured: boolean;
  onRegenerate: () => void;
}

export function AiReviewStep({
  formData,
  updateField,
  onTagsChange,
  errors,
  aiLoading,
  aiError,
  aiNotConfigured,
  onRegenerate,
}: AiReviewStepProps) {
  const { t } = useI18n();

  if (aiLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl">
          <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-foreground">
            {t('listing.quickCreate.analyzing')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('ai.generateFromImagesDesc', {
              defaultValue: 'Generate title, description, and tags from your product photos',
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('listing.quickCreate.editFields')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('listing.quickCreate.editFieldsDesc')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('listing.quickCreate.regenerate')}</span>
        </Button>
      </div>

      {aiNotConfigured && <AiSetupPrompt />}

      {aiError && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-destructive">{aiError}</p>
            <button
              type="button"
              onClick={onRegenerate}
              className="text-xs text-primary hover:underline mt-1"
            >
              {t('listing.quickCreate.regenerate')}
            </button>
          </div>
        </div>
      )}

      {!aiLoading && !aiError && !aiNotConfigured && formData.title && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-200/50 dark:border-purple-800/50 rounded-lg">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            {t('listing.quickCreate.aiGenerated')}
          </span>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="qc-title" className="text-sm font-medium text-foreground">
          {t('listing.title')} <span className="text-destructive">*</span>
        </label>
        <Input
          id="qc-title"
          value={formData.title}
          onChange={e => updateField('title', e.target.value)}
          placeholder={t('listing.title')}
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      {/* Short Description */}
      <div className="space-y-1.5">
        <label htmlFor="qc-short-desc" className="text-sm font-medium text-foreground">
          {t('listing.shortDescription', { defaultValue: 'Short Description' })}
        </label>
        <Input
          id="qc-short-desc"
          value={formData.shortDescription}
          onChange={e => updateField('shortDescription', e.target.value)}
          placeholder={t('listing.shortDescription', { defaultValue: 'Short Description' })}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="qc-desc" className="text-sm font-medium text-foreground">
          {t('listing.description', { defaultValue: 'Description' })}
        </label>
        <Textarea
          id="qc-desc"
          value={formData.description}
          onChange={e => updateField('description', e.target.value)}
          placeholder={t('listing.description', { defaultValue: 'Description' })}
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('listing.tags.title', { defaultValue: 'Tags' })}
        </label>
        <TokenInput
          tokens={formData.tags}
          onTokensChange={onTagsChange}
          placeholder={t('listing.tags.addPlaceholder', { defaultValue: 'Add a tag...' })}
        />
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <label htmlFor="qc-price" className="text-sm font-medium text-foreground">
          {t('listing.quickCreate.priceRequired')} <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {formData.pricingCurrency}
          </span>
          <Input
            id="qc-price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={e => updateField('price', e.target.value)}
            onWheel={e => (e.target as HTMLInputElement).blur()}
            placeholder={t('listing.quickCreate.pricePlaceholder')}
            className={`flex-1 ${errors.price ? 'border-destructive' : ''}`}
          />
        </div>
        {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
      </div>
    </div>
  );
}
