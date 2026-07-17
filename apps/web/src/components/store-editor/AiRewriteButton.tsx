// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

/**
 * AiRewriteButton — PG-203 V2-P3
 *
 * Tiny inline action next to a text field: sends the current copy to the AI
 * proxy's rewrite_text action and applies the result. No-op (with a toast)
 * when AI is not configured.
 */

import React, { useState } from 'react';
import { useI18n } from '@mobazha/core';
import { aiService, AiServiceError } from '@mobazha/core/services/ai/aiService';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function AiRewriteButton({
  value,
  context,
  onApply,
}: {
  value?: string;
  /** Short description of the field, e.g. "store hero title" — steers the rewrite. */
  context: string;
  onApply: (text: string) => void;
}) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const safeValue = value ?? '';

  const handleClick = async () => {
    if (!safeValue.trim() || busy) return;
    setBusy(true);
    try {
      const text = await aiService.rewriteText(safeValue, { context, language: locale });
      if (text && text !== safeValue) onApply(text);
    } catch (err) {
      const notConfigured = err instanceof AiServiceError && err.isNotConfigured;
      toast({
        title: notConfigured
          ? t('admin.storeBranding.aiNotConfigured')
          : t('admin.storeBranding.aiGenerateFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !safeValue.trim()}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {busy ? t('admin.storeBranding.aiRewriting') : t('admin.storeBranding.aiRewrite')}
    </button>
  );
}
