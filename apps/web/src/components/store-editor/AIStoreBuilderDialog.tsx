'use client';

/**
 * AIStoreBuilderDialog — PG-202
 *
 * Three-phase dialog: idle (brand form) → generating (skeleton) → preview (apply/regenerate).
 * The generated StoreConfig is previewed inside the dialog before the user applies it.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useI18n, useFeature, getAdminAiModelsPath } from '@mobazha/core';
import type { StoreConfig } from '@mobazha/core';
import { aiService, AiServiceError } from '@mobazha/core/services/ai/aiService';
import { Sparkles, Loader2, AlertCircle, Settings2, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StoreThemeProvider, SectionRenderer } from '@/components/store-sections';
import { useOwnerProducts } from './ResourcePicker';

type Phase = 'idle' | 'generating' | 'preview' | 'error';

interface AIStoreBuilderDialogProps {
  open: boolean;
  onApply: (config: StoreConfig) => void;
  onClose: () => void;
}

export function AIStoreBuilderDialog({ open, onApply, onClose }: AIStoreBuilderDialogProps) {
  const { t, locale } = useI18n();
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');
  const aiModelsPath = getAdminAiModelsPath(aiWorkspaceEnabled);

  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [generatedConfig, setGeneratedConfig] = useState<StoreConfig | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ message: string; isNotConfigured: boolean }>({
    message: '',
    isNotConfigured: false,
  });

  const { products } = useOwnerProducts();
  const catalogSample = useMemo(
    () => products.slice(0, 20).map(p => ({ slug: p.slug, title: p.title })),
    [products]
  );
  const catalogSlugs = useMemo(() => new Set(products.map(p => p.slug)), [products]);

  /** Drop any hallucinated slugs so manual sections only reference real listings. */
  const sanitizeConfig = useCallback(
    (config: StoreConfig): StoreConfig => ({
      ...config,
      sections: config.sections.map(section => {
        if (section.type !== 'featured-products') return section;
        const slugs = (section.props.productSlugs || []).filter(s => catalogSlugs.has(s));
        if (section.props.mode === 'manual' && slugs.length === 0) {
          return { ...section, props: { ...section.props, mode: 'newest' as const } };
        }
        return { ...section, props: { ...section.props, productSlugs: slugs } };
      }),
    }),
    [catalogSlugs]
  );

  const canGenerate = brandName.trim().length > 0 && brandDescription.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setPhase('generating');
    setErrorInfo({ message: '', isNotConfigured: false });

    try {
      const config = await aiService.generateStoreConfig({
        brandName: brandName.trim(),
        brandDescription: brandDescription.trim(),
        language: locale,
        products: catalogSample,
      });
      setGeneratedConfig(sanitizeConfig(config));
      setPhase('preview');
    } catch (err) {
      const isNotConfigured = err instanceof AiServiceError && err.isNotConfigured;
      const message = err instanceof Error ? err.message : String(err);
      setErrorInfo({ message, isNotConfigured });
      setPhase('error');
    }
  }, [canGenerate, brandName, brandDescription, locale, catalogSample, sanitizeConfig]);

  const handleRefine = useCallback(async () => {
    const instruction = refineInstruction.trim();
    if (!instruction || !generatedConfig) return;
    setIsRefining(true);
    try {
      const config = await aiService.refineStoreConfig(generatedConfig, instruction, {
        language: locale,
      });
      setGeneratedConfig(sanitizeConfig(config));
      setRefineInstruction('');
    } catch (err) {
      const isNotConfigured = err instanceof AiServiceError && err.isNotConfigured;
      const message = err instanceof Error ? err.message : String(err);
      setErrorInfo({ message, isNotConfigured });
      setPhase('error');
    } finally {
      setIsRefining(false);
    }
  }, [refineInstruction, generatedConfig, locale, sanitizeConfig]);

  const handleApply = useCallback(() => {
    if (generatedConfig) {
      onApply(generatedConfig);
    }
  }, [generatedConfig, onApply]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onClose();
        setTimeout(() => {
          setPhase('idle');
          setGeneratedConfig(null);
          setErrorInfo({ message: '', isNotConfigured: false });
        }, 300);
      }
    },
    [onClose]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[85vh] flex flex-col"
        data-testid="ai-store-builder-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('admin.storeBranding.aiBuilderTitle')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t('admin.storeBranding.aiBuilderDesc')}</p>
        </DialogHeader>

        {/* Brand Info Form */}
        {(phase === 'idle' || phase === 'generating' || phase === 'error') && (
          <div className="space-y-4 px-1">
            <div className="space-y-2">
              <Label htmlFor="ai-brand-name">{t('admin.storeBranding.brandNameLabel')}</Label>
              <Input
                id="ai-brand-name"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder={t('admin.storeBranding.brandNamePlaceholder')}
                disabled={phase === 'generating'}
                data-testid="ai-brand-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-brand-desc">{t('admin.storeBranding.brandDescLabel')}</Label>
              <Textarea
                id="ai-brand-desc"
                value={brandDescription}
                onChange={e => setBrandDescription(e.target.value)}
                placeholder={t('admin.storeBranding.brandDescPlaceholder')}
                maxLength={500}
                rows={3}
                disabled={phase === 'generating'}
                data-testid="ai-brand-desc-input"
              />
            </div>
          </div>
        )}

        {/* Error State */}
        {phase === 'error' && (
          <div className="mx-1 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                {errorInfo.isNotConfigured ? (
                  <>
                    <p className="text-sm font-medium text-destructive">
                      {t('admin.storeBranding.aiNotConfigured')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.storeBranding.aiNotConfiguredDesc')}
                    </p>
                    <Link
                      href={aiModelsPath}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      {aiWorkspaceEnabled
                        ? t('ai.goToModels', { defaultValue: 'Configure AI Models' })
                        : t('ai.goToSettings', { defaultValue: 'Go to Settings' })}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-destructive">
                      {t('admin.storeBranding.aiGenerateFailed')}
                    </p>
                    <p className="text-xs text-muted-foreground">{errorInfo.message}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generating: Skeleton */}
        {phase === 'generating' && (
          <div className="flex-1 overflow-hidden px-1">
            <div className="rounded-lg border border-border bg-muted/30 p-6 space-y-4 animate-pulse">
              <div className="h-32 bg-muted rounded-lg" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg" />
              </div>
              <div className="flex gap-3 justify-center">
                <div className="h-8 w-20 bg-muted rounded-full" />
                <div className="h-8 w-20 bg-muted rounded-full" />
                <div className="h-8 w-20 bg-muted rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('admin.storeBranding.generating')}
            </div>
          </div>
        )}

        {/* Preview */}
        {phase === 'preview' && generatedConfig && (
          <div className="flex-1 overflow-y-auto px-1 -mx-1 space-y-3">
            <div className="rounded-lg border border-border bg-background overflow-hidden relative">
              {isRefining && (
                <div className="absolute inset-0 z-10 bg-background/70 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('admin.storeBranding.refining')}
                </div>
              )}
              <div
                className="origin-top-left"
                style={{
                  transform: 'scale(0.6)',
                  transformOrigin: 'top center',
                  width: '166.67%',
                  marginLeft: '-33.33%',
                }}
              >
                <StoreThemeProvider theme={generatedConfig.theme}>
                  <SectionRenderer sections={generatedConfig.sections} peerId="ai-preview" />
                </StoreThemeProvider>
              </div>
            </div>
            {/* Conversational refinement */}
            <div className="flex items-center gap-2 mx-0.5">
              <Input
                value={refineInstruction}
                onChange={e => setRefineInstruction(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isRefining) handleRefine();
                }}
                placeholder={t('admin.storeBranding.refinePlaceholder')}
                disabled={isRefining}
                data-testid="ai-refine-input"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefine}
                disabled={isRefining || !refineInstruction.trim()}
                data-testid="ai-refine-button"
              >
                <Wand2 className="w-4 h-4 mr-1" />
                {t('admin.storeBranding.refine')}
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-auto">
          {phase === 'idle' && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!canGenerate}
                data-testid="ai-generate-button"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {t('admin.storeBranding.generateWithAI')}
              </Button>
            </>
          )}

          {phase === 'generating' && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          )}

          {phase === 'error' && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              {!errorInfo.isNotConfigured && (
                <Button size="sm" onClick={handleRegenerate}>
                  {t('admin.storeBranding.aiRetry')}
                </Button>
              )}
            </>
          )}

          {phase === 'preview' && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                <Sparkles className="w-4 h-4 mr-1" />
                {t('admin.storeBranding.regenerate')}
              </Button>
              <Button size="sm" onClick={handleApply} data-testid="ai-apply-button">
                {t('admin.storeBranding.applyDesign')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
