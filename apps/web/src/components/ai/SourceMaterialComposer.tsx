'use client';

import { useCallback, useState } from 'react';
import { buildTextChatAttachment, createSourceMaterialArtifact, useI18n } from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import { FileText, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface SourceMaterialComposerProps {
  variant?: 'full' | 'compact';
}

export function SourceMaterialComposer({ variant = 'full' }: SourceMaterialComposerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const sessionId = useAIChatStore(s => s.sessionId);
  const attachArtifact = useAIChatStore(s => s.attachArtifact);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAttach = useCallback(async () => {
    const material = text.trim();
    if (!material || busy) return;
    setBusy(true);
    try {
      const artifact = await createSourceMaterialArtifact({
        text: material,
        threadId: sessionId,
        metadata: { source: variant === 'compact' ? 'floating_paste' : 'workspace_paste' },
      });
      const result = attachArtifact({
        id: artifact.id,
        name: artifact.name || artifact.sourceName || t('admin.workspace.sourceMaterialUntitled'),
        summary: artifact.summary,
        attachment: buildTextChatAttachment(artifact.name || material.slice(0, 48), material),
      });
      if (result === 'max_reached') {
        toast({
          title: t('common.error'),
          description: t('admin.workspace.sourceMaterialMaxReached'),
          variant: 'destructive',
        });
        return;
      }
      if (result === 'duplicate') {
        return;
      }
      setText('');
      toast({
        title: t('admin.workspace.sourceMaterialAttachedTitle'),
        description: t('admin.workspace.sourceMaterialAttachedDescription'),
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description:
          err instanceof Error ? err.message : t('admin.workspace.sourceMaterialAttachFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }, [attachArtifact, busy, sessionId, t, text, toast, variant]);

  const actionDisabled = busy || !text.trim();

  if (variant === 'compact') {
    return (
      <div className="space-y-2 pb-2" data-testid="source-material-composer-compact">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('admin.workspace.sourceMaterialCompactPlaceholder')}
          className="min-h-[56px] w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="source-material-composer-input"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-8 h-8 text-xs"
            disabled={actionDisabled}
            onClick={() => void handleAttach()}
            data-testid="source-material-composer-attach"
          >
            {busy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t('admin.workspace.sourceMaterialAttach')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border bg-card px-4 py-3 space-y-3"
      data-testid="workspace-source-material"
    >
      <div className="flex items-start gap-3">
        <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t('admin.workspace.sourceMaterialTitle')}
          </p>
          <p className="text-xs text-muted-foreground">{t('admin.workspace.sourceMaterialHint')}</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('admin.workspace.sourceMaterialPlaceholder')}
            className="min-h-[88px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="workspace-source-material-input"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-9"
              disabled={actionDisabled}
              onClick={() => void handleAttach()}
              data-testid="workspace-source-material-attach"
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="mr-1.5 h-4 w-4" />
              )}
              {t('admin.workspace.sourceMaterialAttach')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
