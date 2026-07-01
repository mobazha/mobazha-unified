'use client';

import { useI18n } from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import { X } from 'lucide-react';

interface AttachedArtifactChipsProps {
  testIdPrefix?: string;
}

export function AttachedArtifactChips({
  testIdPrefix = 'attached-artifact',
}: AttachedArtifactChipsProps) {
  const { t } = useI18n();
  const attachedArtifacts = useAIChatStore(s => s.attachedArtifacts);
  const detachArtifact = useAIChatStore(s => s.detachArtifact);

  if (attachedArtifacts.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2 pb-2" data-testid="attached-artifact-chips">
      {attachedArtifacts.map(item => (
        <li
          key={item.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground"
          data-testid={`${testIdPrefix}-${item.id}`}
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
  );
}
