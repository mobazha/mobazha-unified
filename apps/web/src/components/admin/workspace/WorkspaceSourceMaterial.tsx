'use client';

import { useCallback, useState } from 'react';
import { createSourceMaterialArtifact, useI18n } from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function WorkspaceSourceMaterial() {
  const { t } = useI18n();
  const { toast } = useToast();
  const sessionId = useAIChatStore(s => s.sessionId);
  const attachedArtifacts = useAIChatStore(s => s.attachedArtifacts);
  const attachArtifact = useAIChatStore(s => s.attachArtifact);
  const detachArtifact = useAIChatStore(s => s.detachArtifact);
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
        metadata: { source: 'workspace_paste' },
      });
      attachArtifact({
        id: artifact.id,
        name: artifact.name || artifact.sourceName || t('admin.workspace.sourceMaterialUntitled'),
        summary: artifact.summary,
      });
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
  }, [attachArtifact, busy, sessionId, t, text, toast]);

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
              disabled={busy || !text.trim()}
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
          {attachedArtifacts.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {attachedArtifacts.map(item => (
                <li
                  key={item.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground"
                  data-testid={`workspace-attached-artifact-${item.id}`}
                >
                  <span className="truncate">{item.name}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted"
                    aria-label={t('admin.workspace.sourceMaterialRemove')}
                    onClick={() => detachArtifact(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
