'use client';

import { useI18n } from '@mobazha/core';
import { FileText, X } from 'lucide-react';
import { ChatAttachmentPreview } from '@/components/ai/ChatAttachmentPreview';
import { cn } from '@/lib/utils';
import type { ComposerFileDraft } from './workspaceComposerFileDraft';

interface WorkspaceFileDraftStripProps {
  drafts: ComposerFileDraft[];
  hint: string;
  onRemove: (id: string) => void;
}

export function WorkspaceFileDraftStrip({ drafts, hint, onRemove }: WorkspaceFileDraftStripProps) {
  const { t } = useI18n();

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid="workspace-file-draft-strip">
      <p className="text-xs text-foreground font-medium">
        {t('admin.workspace.composerFileDraftSummary', { count: drafts.length })}
      </p>
      <ul className="flex flex-wrap gap-2">
        {drafts.map(draft => (
          <li
            key={draft.id}
            className={cn(
              'inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-muted/30 pl-1 pr-1.5 py-1 text-xs text-foreground'
            )}
            data-testid={`workspace-file-draft-${draft.id}`}
          >
            {draft.previewUrl ? (
              <ChatAttachmentPreview
                name={draft.file.name}
                previewUrl={draft.previewUrl}
                contentType={draft.file.type}
                variant="draft"
                className="border-0 bg-transparent px-0 py-0"
              />
            ) : (
              <>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="truncate max-w-[140px]" title={draft.file.name}>
                  {draft.file.name}
                </span>
              </>
            )}
            <button
              type="button"
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 ml-0.5"
              aria-label={t('admin.workspace.composerFileDraftRemove')}
              onClick={() => onRemove(draft.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
