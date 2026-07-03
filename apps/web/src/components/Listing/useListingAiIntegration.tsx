'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAbsoluteImageUrl, useI18n, useFeature, getAdminAiModelsPath } from '@mobazha/core';
import type { AiGenerateResponse, Image, ListingFormData } from '@mobazha/core';
import { aiStatusSupportsVision, getAIStatus } from '@mobazha/core/services/api/aiSettings';
import { useToast, ToastAction } from '@/components/ui';
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
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');
  const aiModelsPath = getAdminAiModelsPath(aiWorkspaceEnabled);
  const {
    loadingAction: aiLoadingAction,
    lastError: aiError,
    notConfigured: aiNotConfigured,
    improveTitle,
    polishDescription,
    suggestTags,
  } = useAiAssist();

  // Check if the configured AI model supports vision (image input).
  // Defaults to true until confirmed otherwise to avoid flash-hiding the panel.
  const [aiSupportsVision, setAiSupportsVision] = useState(true);
  useEffect(() => {
    getAIStatus()
      .then(status => {
        setAiSupportsVision(aiStatusSupportsVision(status));
      })
      .catch(() => {
        // On error keep default (true) — don't hide the panel speculatively.
      });
  }, []);

  useEffect(() => {
    if (aiError) {
      toast({ title: t('ai.assist'), description: aiError, variant: 'destructive' });
    }
  }, [aiError, toast, t]);

  useEffect(() => {
    if (aiNotConfigured) {
      toast({
        title: t('ai.notConfigured', { defaultValue: 'AI assistant is not configured.' }),
        description: t('ai.setupPrompt', {
          defaultValue: 'Set up AI to auto-optimize product titles and descriptions.',
        }),
        action: (
          <ToastAction
            altText={
              aiWorkspaceEnabled
                ? t('ai.goToModels', { defaultValue: 'Configure AI Models' })
                : t('ai.goToSettings', { defaultValue: 'Go to Settings' })
            }
            onClick={() => window.open(aiModelsPath, '_blank')}
          >
            {aiWorkspaceEnabled
              ? t('ai.goToModels', { defaultValue: 'Configure AI Models' })
              : t('ai.goToSettings', { defaultValue: 'Go to Settings' })}
          </ToastAction>
        ),
      });
    }
  }, [aiNotConfigured, toast, t, aiWorkspaceEnabled, aiModelsPath]);

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
      if (result.productType && !formData.productType) {
        updateField('productType', result.productType);
      }
    }
  }, [
    suggestTags,
    formData.title,
    formData.description,
    formData.productType,
    addTag,
    updateField,
  ]);

  const handleAiApplyAll = useCallback(
    (result: AiGenerateResponse) => {
      if (result.title) updateField('title', result.title);
      if (result.shortDescription) updateField('shortDescription', result.shortDescription);
      if (result.description) updateField('description', result.description);
      if (result.tags) result.tags.forEach(tag => addTag(tag));
      if (result.productType && !formData.productType) {
        updateField('productType', result.productType);
      }
    },
    [updateField, addTag, formData.productType]
  );

  const aiImageUrls = useMemo(() => {
    return formData.images
      .slice(0, 4)
      .map((img: Image) => {
        const hash = img.medium || img.small || img.original;
        if (!hash) return '';
        return getAbsoluteImageUrl(hash) || '';
      })
      .filter(Boolean);
  }, [formData.images]);

  return {
    aiLoadingAction,
    aiNotConfigured,
    aiSupportsVision,
    aiImageUrls,
    handleAiImproveTitle,
    handleAiPolishDescription,
    handleAiSuggestTags,
    handleAiApplyAll,
  };
}
