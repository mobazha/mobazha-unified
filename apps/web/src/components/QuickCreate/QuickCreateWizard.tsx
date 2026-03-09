'use client';

import React, { useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, Zap } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useQuickCreate, type QuickCreateStep } from './useQuickCreate';
import { PhotoStep } from './PhotoStep';
import { AiReviewStep } from './AiReviewStep';
import { PreviewStep } from './PreviewStep';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const STEP_LABELS: Record<QuickCreateStep, string> = {
  photos: 'listing.quickCreate.stepPhotos',
  review: 'listing.quickCreate.stepReview',
  publish: 'listing.quickCreate.stepPublish',
};

export function QuickCreateWizard() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();

  const qc = useQuickCreate();

  const handlePublish = useCallback(async () => {
    const result = await qc.submit();
    if ('error' in result) {
      toast({
        title: t('listing.quickCreate.publishError'),
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({ title: t('listing.quickCreate.publishSuccess') });
      router.push('/admin/products');
    }
  }, [qc, toast, t, router]);

  const handleSaveDraft = useCallback(async () => {
    const result = await qc.submitDraft();
    if ('error' in result) {
      toast({
        title: t('listing.quickCreate.publishError'),
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({ title: t('listing.quickCreate.draftSuccess') });
      router.push('/admin/products');
    }
  }, [qc, toast, t, router]);

  return (
    <div className="min-h-screen bg-background" data-testid="quick-create-wizard">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground" data-testid="wizard-title">
                {t('listing.quickCreate.title')}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {t('listing.quickCreate.subtitle')}
              </p>
            </div>
          </div>
          <Link
            href="/listing/new"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
            data-testid="full-editor-link"
          >
            {t('listing.quickCreate.openFullEditor')}
          </Link>
        </div>

        {/* Step indicator */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {qc.steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5" data-testid={`step-${s}`}>
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                      i < qc.stepIndex
                        ? 'bg-primary text-primary-foreground'
                        : i === qc.stepIndex
                          ? 'bg-primary/90 text-primary-foreground ring-2 ring-primary/30'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {i < qc.stepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors hidden sm:inline',
                      i <= qc.stepIndex ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {t(STEP_LABELS[s])}
                  </span>
                </div>
                {i < qc.steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-1 rounded-full transition-colors',
                      i < qc.stepIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {qc.step === 'photos' && (
          <PhotoStep
            images={qc.formData.images}
            contractType={qc.formData.contractType}
            onImagesChange={images => qc.updateField('images', images)}
            onContractTypeChange={qc.changeContractType}
          />
        )}

        {qc.step === 'review' && (
          <AiReviewStep
            formData={qc.formData}
            updateField={qc.updateField}
            onTagsChange={tags => qc.updateField('tags', tags)}
            errors={qc.errors}
            aiLoading={qc.aiLoading}
            aiError={qc.aiError}
            aiNotConfigured={qc.aiNotConfigured}
            onRegenerate={qc.regenerateAi}
          />
        )}

        {qc.step === 'publish' && (
          <PreviewStep
            formData={qc.formData}
            hasImages={qc.hasImages}
            hasTitle={qc.hasTitle}
            hasPrice={qc.hasPrice}
            isSubmitting={qc.isSubmitting}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
          />
        )}
      </div>

      {/* Bottom navigation (not on publish step — it has its own buttons) */}
      {qc.step !== 'publish' && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 sm:static sm:border-0 sm:bg-transparent">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={qc.goBack}
              disabled={qc.isFirstStep}
              className="min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t('common.back', { defaultValue: 'Back' })}
            </Button>

            {qc.step === 'photos' && !qc.canProceed && (
              <p className="text-xs text-muted-foreground text-center flex-1">
                {t('listing.quickCreate.noImages')}
              </p>
            )}

            <Button onClick={qc.goNext} disabled={!qc.canProceed} className="min-h-[44px]">
              {t('common.next', { defaultValue: 'Next' })}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
