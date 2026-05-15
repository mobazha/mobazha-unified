'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useListingForm, aiService, AiServiceError, getImageUrl, useI18n } from '@mobazha/core';
import type { AiGenerateResponse, ContractType, Image } from '@mobazha/core';

export type QuickCreateStep = 'photos' | 'review' | 'publish';

const STEPS: QuickCreateStep[] = ['photos', 'review', 'publish'];

export function useQuickCreate() {
  const { t } = useI18n();
  const form = useListingForm();
  const [step, setStep] = useState<QuickCreateStep>('photos');
  const [aiResult, setAiResult] = useState<AiGenerateResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiNotConfigured, setAiNotConfigured] = useState(false);
  const aiTriggeredRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  const { updateField, addTag, formData } = form;
  const { images, contractType, productType } = formData;

  const aiImageUrls = useMemo(() => {
    return images
      .slice(0, 4)
      .map((img: Image) => {
        const hash = img.medium || img.small || img.original;
        if (!hash) return '';
        return getImageUrl(hash) || '';
      })
      .filter(Boolean);
  }, [images]);

  const generateAi = useCallback(async () => {
    if (!aiImageUrls.length) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAiLoading(true);
    setAiError(null);
    setAiNotConfigured(false);

    try {
      const res = await aiService.generateFromImages(aiImageUrls, {
        contractType,
      });

      if (controller.signal.aborted) return;
      setAiResult(res);

      if (res.title) updateField('title', res.title);
      if (res.shortDescription) updateField('shortDescription', res.shortDescription);
      if (res.description) updateField('description', res.description);
      if (res.tags) {
        updateField('tags', res.tags);
      }
      if (res.productType && !productType) {
        updateField('productType', res.productType);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof AiServiceError && err.isNotConfigured) {
        setAiNotConfigured(true);
      } else if (err instanceof AiServiceError) {
        setAiError(err.message);
      } else {
        setAiError(t('ai.error', { defaultValue: 'Failed to generate. Please try again.' }));
      }
    } finally {
      if (!controller.signal.aborted) {
        setAiLoading(false);
      }
    }
  }, [aiImageUrls, contractType, productType, updateField, t]);

  useEffect(() => {
    if (step === 'review' && !aiTriggeredRef.current && aiImageUrls.length > 0) {
      aiTriggeredRef.current = true;
      generateAi();
    }
  }, [step, aiImageUrls.length, generateAi]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const canProceed = useMemo(() => {
    switch (step) {
      case 'photos':
        return images.length > 0;
      case 'review':
        return formData.title.trim().length > 0 && parseFloat(formData.price) > 0;
      case 'publish':
        return true;
      default:
        return false;
    }
  }, [step, images.length, formData.title, formData.price]);

  const goNext = useCallback(() => {
    if (!isLastStep) {
      setStep(STEPS[stepIndex + 1]);
    }
  }, [stepIndex, isLastStep]);

  const goBack = useCallback(() => {
    if (!isFirstStep) {
      setStep(STEPS[stepIndex - 1]);
      if (STEPS[stepIndex - 1] === 'photos') {
        abortRef.current?.abort();
        aiTriggeredRef.current = false;
      }
    }
  }, [stepIndex, isFirstStep]);

  const { changeContractType: formChangeContractType } = form;

  const changeContractType = useCallback(
    (type: ContractType) => {
      formChangeContractType(type);
      aiTriggeredRef.current = false;
      setAiResult(null);
    },
    [formChangeContractType]
  );

  const regenerateAi = useCallback(() => {
    aiTriggeredRef.current = false;
    setAiResult(null);
    generateAi();
  }, [generateAi]);

  const hasImages = images.length > 0;
  const hasTitle = formData.title.trim().length > 0;
  const hasPrice = parseFloat(formData.price) > 0;

  return {
    ...form,
    step,
    stepIndex,
    steps: STEPS,
    isFirstStep,
    isLastStep,
    canProceed,
    goNext,
    goBack,
    changeContractType,

    aiResult,
    aiLoading,
    aiError,
    aiNotConfigured,
    aiImageUrls,
    regenerateAi,

    hasImages,
    hasTitle,
    hasPrice,
  };
}
