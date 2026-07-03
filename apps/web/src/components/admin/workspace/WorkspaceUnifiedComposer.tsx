'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  buildTextChatAttachment,
  createSourceMaterialArtifact,
  MAX_ATTACHED_CHAT_ARTIFACTS,
  stageFileForAgentChat,
  useI18n,
  type ChatTurnPayload,
} from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import { Loader2, Paperclip, Send, Square } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { WorkspaceFileDraftStrip } from './WorkspaceFileDraftStrip';
import {
  filterProductImportFiles,
  looksLikeProductImport,
  PRODUCT_IMPORT_FILE_ACCEPT,
} from './workspaceComposerUtils';
import {
  type ComposerFileDraft,
  composerFileDraftTotalBytes,
  MAX_COMPOSER_FILE_DRAFT_BYTES,
  MAX_COMPOSER_FILE_DRAFTS,
  mergeComposerFileDrafts,
  revokeComposerFileDrafts,
} from './workspaceComposerFileDraft';

interface WorkspaceUnifiedComposerProps {
  disabled?: boolean;
  isStreaming?: boolean;
  onSendMessage: (payload: { text: string; turn?: ChatTurnPayload }) => Promise<void>;
  onCancelStream?: () => void;
}

export function WorkspaceUnifiedComposer({
  disabled = false,
  isStreaming = false,
  onSendMessage,
  onCancelStream,
}: WorkspaceUnifiedComposerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const sessionId = useAIChatStore(s => s.sessionId);
  const attachArtifact = useAIChatStore(s => s.attachArtifact);
  const attachedArtifactCount = useAIChatStore(s => s.attachedArtifacts.length);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileDrafts, setFileDrafts] = useState<ComposerFileDraft[]>([]);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileDraftsRef = useRef(fileDrafts);

  useEffect(() => {
    fileDraftsRef.current = fileDrafts;
  }, [fileDrafts]);

  useEffect(() => {
    return () => {
      revokeComposerFileDrafts(fileDraftsRef.current);
    };
  }, []);

  const attachArtifactRecord = useCallback(
    async (input: {
      text: string;
      name: string;
      summary?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const artifact = await createSourceMaterialArtifact({
        text: input.text,
        name: input.name,
        summary: input.summary,
        threadId: sessionId,
        metadata: input.metadata,
      });
      const result = attachArtifact({
        id: artifact.id,
        name: artifact.name || artifact.sourceName || input.name,
        summary: artifact.summary,
        attachment: buildTextChatAttachment(input.name, input.text),
      });
      if (result === 'max_reached') {
        throw new Error('artifact_max_reached');
      }
      return result;
    },
    [attachArtifact, sessionId]
  );

  const buildStagedTurn = useCallback(
    async (drafts: ComposerFileDraft[]): Promise<ChatTurnPayload> => {
      if (attachedArtifactCount + drafts.length > MAX_ATTACHED_CHAT_ARTIFACTS) {
        throw new Error('artifact_max_reached');
      }
      if (composerFileDraftTotalBytes(drafts) > MAX_COMPOSER_FILE_DRAFT_BYTES) {
        throw new Error('file_total_too_large');
      }

      const artifactIds: string[] = [];
      const attachments: ChatTurnPayload['attachments'] = [];
      const display: ChatTurnPayload['display'] = [];

      for (const draft of drafts) {
        let staged;
        try {
          staged = await stageFileForAgentChat({
            file: draft.file,
            threadId: sessionId,
          });
        } catch (err) {
          if (err instanceof Error && err.message === 'file_too_large') {
            throw new Error('file_too_large');
          }
          throw err;
        }
        const { artifact, attachment } = staged;
        artifactIds.push(artifact.id);
        attachments.push(attachment);
        display.push({
          artifactId: artifact.id,
          name: draft.file.name,
          contentType: attachment.contentType,
          previewUrl: draft.previewUrl,
        });
      }

      return { artifactIds, attachments, display };
    },
    [attachedArtifactCount, sessionId]
  );

  const handleAttachReference = useCallback(async () => {
    const material = text.trim();
    if (!material || busy || isStreaming) return;
    setBusy(true);
    try {
      const result = await attachArtifactRecord({
        text: material,
        name: material.slice(0, 48),
        metadata: { source: 'workspace_unified_composer' },
      });
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
          err instanceof Error && err.message === 'artifact_max_reached'
            ? t('admin.workspace.sourceMaterialMaxReached')
            : err instanceof Error
              ? err.message
              : t('admin.workspace.sourceMaterialAttachFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }, [attachArtifactRecord, busy, isStreaming, t, text, toast]);

  const resolveOutgoingMessage = useCallback(
    (material: string, files: File[]) => {
      if (material) return material;
      if (files.length === 1) {
        return t('admin.workspace.composerFileChatDefaultSingle', { name: files[0].name });
      }
      return t('admin.workspace.composerFileChatDefaultMultiple', {
        names: files.map(file => file.name).join(t('admin.workspace.composerFileNameJoiner')),
      });
    },
    [t]
  );

  const handleSend = useCallback(async () => {
    const material = text.trim();
    const draftsToSend = [...fileDrafts];
    const pendingFiles = draftsToSend.map(draft => draft.file);
    const hasFiles = draftsToSend.length > 0;
    if ((!material && !hasFiles) || busy || isStreaming || disabled) return;

    setBusy(true);
    try {
      const turn = hasFiles ? await buildStagedTurn(draftsToSend) : undefined;
      const message = resolveOutgoingMessage(material, pendingFiles);
      await onSendMessage({ text: message, turn });
      if (hasFiles) {
        revokeComposerFileDrafts(draftsToSend);
        setFileDrafts([]);
      }
      setText('');
    } catch (err) {
      toast({
        title: t('common.error'),
        description:
          err instanceof Error && err.message === 'artifact_max_reached'
            ? t('admin.workspace.sourceMaterialMaxReached')
            : err instanceof Error && err.message === 'file_too_large'
              ? t('admin.workspace.composerFileTooLargeForText')
              : err instanceof Error && err.message === 'file_total_too_large'
                ? t('admin.workspace.composerFileDraftTotalSizeExceeded')
                : err instanceof Error
                  ? err.message
                  : t('admin.workspace.sourceMaterialAttachFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    buildStagedTurn,
    disabled,
    fileDrafts,
    isStreaming,
    onSendMessage,
    resolveOutgoingMessage,
    t,
    text,
    toast,
  ]);

  const addFileDrafts = useCallback(
    (files: File[]) => {
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

      setFileDrafts(prev => {
        const { drafts, added, skippedLimit, skippedTotalBytes } = mergeComposerFileDrafts(
          prev,
          accepted
        );
        if (skippedLimit > 0) {
          toast({
            description: t('admin.workspace.composerFileDraftMaxReached', {
              count: MAX_COMPOSER_FILE_DRAFTS,
            }),
          });
        }
        if (skippedTotalBytes > 0) {
          toast({
            description: t('admin.workspace.composerFileDraftTotalSizeExceeded'),
          });
        }
        if (added === 0) {
          return prev;
        }
        return drafts;
      });
    },
    [t, toast]
  );

  const removeFileDraft = useCallback((id: string) => {
    setFileDrafts(prev => {
      const target = prev.find(draft => draft.id === id);
      if (target) {
        revokeComposerFileDrafts([target]);
      }
      return prev.filter(draft => draft.id !== id);
    });
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = '';
      if (!files.length || busy || isStreaming || disabled) return;
      addFileDrafts(files);
    },
    [addFileDrafts, busy, disabled, isStreaming]
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
    (e: DragEvent) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      if (disabled || busy || isStreaming) return;
      const files = Array.from(e.dataTransfer.files ?? []);
      if (!files.length) return;
      addFileDrafts(files);
    },
    [addFileDrafts, busy, disabled, isStreaming]
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

  const hasPendingFiles = fileDrafts.length > 0;
  const actionDisabled = disabled || busy || isStreaming || (!text.trim() && !hasPendingFiles);

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
      onDrop={handleDrop}
    >
      {isDragging && (
        <p
          className="text-xs text-center text-primary font-medium py-1"
          data-testid="workspace-composer-drop-hint"
        >
          {t('admin.workspace.composerDropHint')}
        </p>
      )}
      <WorkspaceFileDraftStrip
        drafts={fileDrafts}
        hint={t('admin.workspace.composerFileDraftHintChat')}
        onRemove={removeFileDraft}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={PRODUCT_IMPORT_FILE_ACCEPT}
        multiple
        onChange={handleFileChange}
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
      {text.trim().length > 0 && !looksLikeProductImport(text) && !hasPendingFiles && (
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
      {!hasPendingFiles && (
        <p className="text-[11px] text-muted-foreground">{t('admin.workspace.composerHint')}</p>
      )}
    </div>
  );
}
