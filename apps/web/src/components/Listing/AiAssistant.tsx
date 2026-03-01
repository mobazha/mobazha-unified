'use client';

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  Wand2,
  ImageIcon,
  Check,
  AlertCircle,
  Settings,
  ExternalLink,
} from 'lucide-react';
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
        min-h-[44px] sm:min-h-0
        ${size === 'xs' ? 'px-3 py-2 text-sm sm:px-2 sm:py-0.5 sm:text-xs' : 'px-3 py-2 text-sm sm:px-2.5 sm:py-1'}
      `}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 sm:w-3 sm:h-3 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4 sm:w-3 sm:h-3" />
      )}
      {label || t('ai.assist', { defaultValue: 'AI' })}
    </button>
  );
}

// ─── AI Setup Prompt (shown when AI is not configured) ──

interface AiSetupPromptProps {
  onDismiss?: () => void;
}

export function AiSetupPrompt({ onDismiss }: AiSetupPromptProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-lg">
      <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {t('ai.setupPrompt', {
            defaultValue: 'Set up AI to auto-optimize product titles and descriptions.',
          })}
        </p>
        <a
          href="/admin/settings/integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-1"
        >
          {t('ai.goToSettings', { defaultValue: 'Go to Settings' })}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-600 dark:text-amber-600 dark:hover:text-amber-400 transition-colors"
          aria-label="Dismiss"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      )}
    </div>
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
  const [showSetup, setShowSetup] = useState(false);

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
      if (err instanceof AiServiceError && err.isNotConfigured) {
        setShowSetup(true);
      } else if (err instanceof AiServiceError) {
        setError(err.message);
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

      {showSetup && <AiSetupPrompt onDismiss={() => setShowSetup(false)} />}

      {!result && !error && !showSetup && (
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white min-h-[44px] sm:min-h-0"
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
            <Button
              type="button"
              onClick={() => onApply(result)}
              size="sm"
              className="flex-1 min-h-[44px] sm:min-h-0"
            >
              <Check className="w-4 h-4 mr-1" />
              {t('ai.applyAll', { defaultValue: 'Apply All' })}
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0"
            >
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
  const [notConfigured, setNotConfigured] = useState(false);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof AiServiceError && err.isNotConfigured) {
      setNotConfigured(true);
      setLastError(null);
    } else {
      setLastError(err instanceof Error ? err.message : 'Failed');
    }
  }, []);

  const improveTitle = useCallback(
    async (title: string, description?: string): Promise<string | null> => {
      setLoadingAction('improve_title');
      setLastError(null);
      setNotConfigured(false);
      try {
        const res = await aiService.improveTitle(title, { description, language: opts?.language });
        return res.title;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [opts?.language, handleError]
  );

  const polishDescription = useCallback(
    async (
      title: string,
      description: string
    ): Promise<{ description: string; shortDescription?: string } | null> => {
      setLoadingAction('polish_description');
      setLastError(null);
      setNotConfigured(false);
      try {
        return await aiService.polishDescription(title, description, { language: opts?.language });
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [opts?.language, handleError]
  );

  const suggestTags = useCallback(
    async (
      title: string,
      description?: string
    ): Promise<{ tags: string[]; productType?: string } | null> => {
      setLoadingAction('suggest_tags');
      setLastError(null);
      setNotConfigured(false);
      try {
        return await aiService.suggestTags(title, { description, language: opts?.language });
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [opts?.language, handleError]
  );

  return {
    loadingAction,
    lastError,
    notConfigured,
    isLoading: loadingAction !== null,
    improveTitle,
    polishDescription,
    suggestTags,
  };
}
