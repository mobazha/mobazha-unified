'use client';

import { useI18n } from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import { X } from 'lucide-react';

interface AttachedSkillRunChipsProps {
  testIdPrefix?: string;
}

export function AttachedSkillRunChips({
  testIdPrefix = 'attached-skill-run',
}: AttachedSkillRunChipsProps) {
  const { t } = useI18n();
  const attachedSkillRuns = useAIChatStore(s => s.attachedSkillRuns);
  const detachSkillRun = useAIChatStore(s => s.detachSkillRun);

  if (attachedSkillRuns.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2 pb-2" data-testid="attached-skill-run-chips">
      {attachedSkillRuns.map(item => (
        <li
          key={item.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground"
          data-testid={`${testIdPrefix}-${item.id}`}
        >
          <span className="truncate">{item.label}</span>
          <button
            type="button"
            className="rounded-full p-0.5 hover:bg-muted"
            aria-label={t('admin.workspace.skillRunRemove')}
            onClick={() => detachSkillRun(item.id)}
          >
            <X className="h-3 w-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}
