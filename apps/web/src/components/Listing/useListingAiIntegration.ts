'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { getGatewayUrl, useI18n } from '@mobazha/core';
import type { AiGenerateResponse, Image, ListingFormData } from '@mobazha/core';
import { useToast } from '@/components/ui';
import { useAiAssist } from './AiAssistant';

interface UseListingAiIntegrationParams {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  addTag: (tag: string) => void;
}

export function useListingAiIntegration({
  formData,
  updateField,
  addTag,
}: UseListingAiIntegrationParams) {
  const { t } = useI18n();
  const { toast } = useToast();
  const {
    loadingAction: aiLoadingAction,
    lastError: aiError,
    improveTitle,
    polishDescription,
    suggestTags,
  } = useAiAssist();

  useEffect(() => {
    if (aiError) {
      toast({ title: t('ai.assist'), description: aiError, variant: 'destructive' });
    }
  }, [aiError, toast, t]);

  const handleAiImproveTitle = useCallback(async () => {
    const improved = await improveTitle(formData.title, formData.description);
    if (improved) updateField('title', improved);
  }, [improveTitle, formData.title, formData.description, updateField]);

  const handleAiPolishDescription = useCallback(async () => {
    const result = await polishDescription(formData.title, formData.description);
    if (result) {
      updateField('description', result.description);
      if (result.shortDescription) updateField('shortDescription', result.shortDescription);
    }
  }, [polishDescription, formData.title, formData.description, updateField]);

  const handleAiSuggestTags = useCallback(async () => {
    const result = await suggestTags(formData.title, formData.description);
    if (result) {
      result.tags.forEach(tag => addTag(tag));
      if (result.categories.length > 0) {
        updateField('categories', [...new Set([...formData.categories, ...result.categories])]);
      }
    }
  }, [suggestTags, formData.title, formData.description, formData.categories, addTag, updateField]);

  const handleAiApplyAll = useCallback(
    (result: AiGenerateResponse) => {
      if (result.title) updateField('title', result.title);
      if (result.shortDescription) updateField('shortDescription', result.shortDescription);
      if (result.description) updateField('description', result.description);
      if (result.tags) result.tags.forEach(tag => addTag(tag));
      if (result.categories) {
        updateField('categories', [
          ...new Set([...formData.categories, ...(result.categories || [])]),
        ]);
      }
    },
    [updateField, addTag, formData.categories]
  );

  const aiImageUrls = useMemo(() => {
    return formData.images
      .slice(0, 4)
      .map((img: Image) => {
        const hash = img.medium || img.small || img.original;
        if (!hash) return '';
        return `${getGatewayUrl()}/media/images/${hash}`;
      })
      .filter(Boolean);
  }, [formData.images]);

  return {
    aiLoadingAction,
    aiImageUrls,
    handleAiImproveTitle,
    handleAiPolishDescription,
    handleAiSuggestTags,
    handleAiApplyAll,
  };
}
