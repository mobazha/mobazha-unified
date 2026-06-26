'use client';

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  createSourceMaterialArtifact,
  ingestProductImport,
  ingestProductImportPaste,
  useI18n,
} from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import { Loader2, Paperclip, Send, Square } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  filterProductImportFiles,
  looksLikeProductImport,
  PRODUCT_IMPORT_FILE_ACCEPT,
} from './workspaceComposerUtils';

interface WorkspaceUnifiedComposerProps {
  disabled?: boolean;
  isStreaming?: boolean;
  onSendMessage: (text: string) => void;
  onCancelStream?: () => void;
  onImportComplete?: (runId: string) => void;
}

export function WorkspaceUnifiedComposer({
  disabled = false,
  isStreaming = false,
  onSendMessage,
  onCancelStream,
  onImportComplete,
}: WorkspaceUnifiedComposerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const sessionId = useAIChatStore(s => s.sessionId);
  const attachArtifact = useAIChatStore(s => s.attachArtifact);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachReference = useCallback(async () => {
    const material = text.trim();
    if (!material || busy || isStreaming) return;
    setBusy(true);
    try {
      const artifact = await createSourceMaterialArtifact({
        text: material,
        threadId: sessionId,
        metadata: { source: 'workspace_unified_composer' },
      });
      const result = attachArtifact({
        id: artifact.id,
        name: artifact.name || artifact.sourceName || t('admin.workspace.sourceMaterialUntitled'),
        summary: artifact.summary,
      });
      if (result === 'max_reached') {
        toast({
          title: t('common.error'),
          description: t('admin.workspace.sourceMaterialMaxReached'),
          variant: 'destructive',
        });
        return;
      }
      if (result === 'duplicate') return;
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
  }, [attachArtifact, busy, isStreaming, sessionId, t, text, toast]);

  const runImport = useCallback(
    async (material: string, sourceName = 'workspace-paste.csv') => {
      const result = await ingestProductImportPaste(material, {
        threadId: sessionId,
        sourceName,
        contentType: 'text/csv',
      });
      setText('');
      onImportComplete?.(result.skillRun.id);
      toast({
        title: t('admin.workspace.sourceMaterialImportStartedTitle'),
        description: t('admin.workspace.sourceMaterialImportStartedDescription'),
        variant: 'success',
      });
    },
    [onImportComplete, sessionId, t, toast]
  );

  const ingestFiles = useCallback(
    async (files: File[]) => {
      const accepted = filterProductImportFiles(files);
      if (!accepted.length) {
        toast({
          title: t('common.error'),
          description: t('admin.workspace.composerUnsupportedFile'),
          variant: 'destructive',
        });
        return;
      }
      if (accepted.length < files.length) {
        toast({
          description: t('admin.workspace.composerSomeFilesSkipped'),
        });
      }
      setBusy(true);
      try {
        const result = await ingestProductImport(accepted, { threadId: sessionId });
        onImportComplete?.(result.skillRun.id);
        toast({
          title: t('admin.workspace.sourceMaterialImportStartedTitle'),
          description: t('admin.workspace.sourceMaterialImportStartedDescription'),
          variant: 'success',
        });
      } catch (err) {
        toast({
          title: t('common.error'),
          description:
            err instanceof Error ? err.message : t('admin.workspace.sourceMaterialImportFailed'),
          variant: 'destructive',
        });
      } finally {
        setBusy(false);
      }
    },
    [onImportComplete, sessionId, t, toast]
  );

  const handleSend = useCallback(async () => {
    const material = text.trim();
    if (!material || busy || isStreaming || disabled) return;

    if (looksLikeProductImport(material)) {
      setBusy(true);
      try {
        await runImport(material);
      } catch (err) {
        toast({
          title: t('common.error'),
          description:
            err instanceof Error ? err.message : t('admin.workspace.sourceMaterialImportFailed'),
          variant: 'destructive',
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    setText('');
    onSendMessage(material);
  }, [busy, disabled, isStreaming, onSendMessage, runImport, t, text, toast]);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = '';
      if (!files.length || busy || isStreaming || disabled) return;
      await ingestFiles(files);
    },
    [busy, disabled, ingestFiles, isStreaming]
  );

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      if (disabled || busy || isStreaming) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    },
    [busy, disabled, isStreaming]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      if (disabled || busy || isStreaming) return;
      const files = Array.from(e.dataTransfer.files ?? []);
      if (!files.length) return;
      await ingestFiles(files);
    },
    [busy, disabled, ingestFiles, isStreaming]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  const actionDisabled = disabled || busy || isStreaming || !text.trim();

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg transition-colors',
        isDragging && 'ring-2 ring-primary/40 bg-primary/[0.04]'
      )}
      data-testid="workspace-unified-composer"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={e => void handleDrop(e)}
    >
      {isDragging && (
        <p
          className="text-xs text-center text-primary font-medium py-1"
          data-testid="workspace-composer-drop-hint"
        >
          {t('admin.workspace.composerDropHint')}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={PRODUCT_IMPORT_FILE_ACCEPT}
        multiple
        onChange={e => void handleFileChange(e)}
      />
      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled={disabled || busy || isStreaming}
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 shrink-0"
          aria-label={t('admin.workspace.composerUpload')}
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('admin.workspace.composerPlaceholder')}
          rows={2}
          disabled={disabled || busy || isStreaming}
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-32 min-h-[52px] disabled:opacity-60"
          data-testid="workspace-unified-composer-input"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onCancelStream}
            className="p-2 rounded-lg bg-muted text-foreground border border-border hover:bg-muted/80 shrink-0"
            aria-label={t('ai.stopGenerating')}
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            disabled={actionDisabled}
            onClick={() => void handleSend()}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 shrink-0"
            aria-label={t('ai.send')}
            data-testid="workspace-unified-composer-send"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        )}
      </div>
      {text.trim().length > 0 && !looksLikeProductImport(text) && (
        <button
          type="button"
          disabled={actionDisabled}
          onClick={() => void handleAttachReference()}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          data-testid="workspace-composer-attach-reference"
        >
          {t('admin.workspace.composerAttachReference')}
        </button>
      )}
      <p className="text-[11px] text-muted-foreground">{t('admin.workspace.composerHint')}</p>
    </div>
  );
}
