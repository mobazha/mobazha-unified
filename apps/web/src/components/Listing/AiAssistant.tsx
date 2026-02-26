'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, Wand2, ImageIcon, Check, AlertCircle } from 'lucide-react';
import { aiService, AiServiceError, useI18n } from '@mobazha/core';
import type { AiGenerateResponse } from '@mobazha/core';
import { Button } from '@/components/ui/button';

// ─── AI Assist Button (inline, next to field labels) ────────

interface AiAssistButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'xs';
}

export function AiAssistButton({
  onClick,
  isLoading,
  disabled,
  label,
  size = 'xs',
}: AiAssistButtonProps) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`
        inline-flex items-center gap-1 rounded-md font-medium transition-all
        bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400
        hover:from-purple-500/20 hover:to-blue-500/20
        disabled:opacity-50 disabled:cursor-not-allowed
        ${size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
      `}
    >
      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {label || t('ai.assist', { defaultValue: 'AI' })}
    </button>
  );
}

// ─── AI Generate From Images Panel ──────────────────────

interface AiImageGeneratePanelProps {
  imageUrls: string[];
  contractType: string;
  onApply: (result: AiGenerateResponse) => void;
  language?: string;
}

export function AiImageGeneratePanel({
  imageUrls,
  contractType,
  onApply,
  language,
}: AiImageGeneratePanelProps) {
  const { t } = useI18n();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AiGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!imageUrls.length) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await aiService.generateFromImages(imageUrls, {
        contractType,
        language,
      });
      setResult(res);
    } catch (err) {
      if (err instanceof AiServiceError) {
        setError(
          err.isNotConfigured
            ? t('ai.notConfigured', {
                defaultValue: 'AI service not configured. Ask admin to set OPENAI_API_KEY.',
              })
            : err.message
        );
      } else {
        setError(t('ai.error', { defaultValue: 'Failed to generate. Please try again.' }));
      }
    } finally {
      setIsGenerating(false);
    }
  }, [imageUrls, contractType, language, t]);

  if (!imageUrls.length) return null;

  return (
    <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('ai.generateFromImages', { defaultValue: 'AI Auto-Fill' })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('ai.generateFromImagesDesc', {
              defaultValue: 'Generate title, description, and tags from your product photos',
            })}
          </p>
        </div>
      </div>

      {!result && !error && (
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('ai.generating', { defaultValue: 'Analyzing images...' })}
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 mr-2" />
              {t('ai.generateAll', { defaultValue: 'Generate All Fields' })}
            </>
          )}
        </Button>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={handleGenerate}
              className="text-xs text-primary hover:underline mt-1"
            >
              {t('common.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Preview */}
          <div className="space-y-2 text-sm">
            {result.title && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t('listing.title')}:
                </span>
                <p className="text-foreground">{result.title}</p>
              </div>
            )}
            {result.shortDescription && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t('listing.shortDescription')}:
                </span>
                <p className="text-foreground line-clamp-2">{result.shortDescription}</p>
              </div>
            )}
            {result.tags && result.tags.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t('listing.tags')}:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={() => onApply(result)} size="sm" className="flex-1">
              <Check className="w-4 h-4 mr-1" />
              {t('ai.applyAll', { defaultValue: 'Apply All' })}
            </Button>
            <Button type="button" onClick={handleGenerate} variant="outline" size="sm">
              <Wand2 className="w-4 h-4 mr-1" />
              {t('ai.regenerate', { defaultValue: 'Regenerate' })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hook: useAiAssist ──────────────────────────────

export interface UseAiAssistOptions {
  language?: string;
}

export function useAiAssist(opts?: UseAiAssistOptions) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const improveTitle = useCallback(
    async (title: string, description?: string): Promise<string | null> => {
      setLoadingAction('improve_title');
      setLastError(null);
      try {
        const res = await aiService.improveTitle(title, { description, language: opts?.language });
        return res.title;
      } catch (err) {
        setLastError(err instanceof Error ? err.message : 'Failed');
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [opts?.language]
  );

  const polishDescription = useCallback(
    async (
      title: string,
      description: string
    ): Promise<{ description: string; shortDescription?: string } | null> => {
      setLoadingAction('polish_description');
      setLastError(null);
      try {
        return await aiService.polishDescription(title, description, { language: opts?.language });
      } catch (err) {
        setLastError(err instanceof Error ? err.message : 'Failed');
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [opts?.language]
  );

  const suggestTags = useCallback(
    async (
      title: string,
      description?: string
    ): Promise<{ tags: string[]; categories: string[] } | null> => {
      setLoadingAction('suggest_tags');
      setLastError(null);
      try {
        return await aiService.suggestTags(title, { description, language: opts?.language });
      } catch (err) {
        setLastError(err instanceof Error ? err.message : 'Failed');
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [opts?.language]
  );

  return {
    loadingAction,
    lastError,
    isLoading: loadingAction !== null,
    improveTitle,
    polishDescription,
    suggestTags,
  };
}
