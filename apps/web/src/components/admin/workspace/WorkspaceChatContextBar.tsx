'use client';

import { useI18n } from '@mobazha/core';
import { X } from 'lucide-react';

interface WorkspaceChatContextBarProps {
  label: string;
  onDismiss: () => void;
}

export function WorkspaceChatContextBar({ label, onDismiss }: WorkspaceChatContextBarProps) {
  const { t } = useI18n();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b border-primary/20 bg-primary/[0.04] text-xs"
      data-testid="workspace-chat-context-bar"
    >
      <span className="text-muted-foreground shrink-0">
        {t('admin.workspace.contextBarPrefix')}
      </span>
      <span className="font-medium text-foreground truncate flex-1">{label}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
        aria-label={t('common.close')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
