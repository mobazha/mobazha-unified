'use client';

import { useI18n } from '@mobazha/core';
import { Maximize2, Minimize2, PanelRight, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceLayoutControlsProps {
  railCollapsed: boolean;
  focusMode: boolean;
  opportunityCount: number;
  onToggleRail: () => void;
  onToggleFocus: () => void;
  className?: string;
}

export function WorkspaceLayoutControls({
  railCollapsed,
  focusMode,
  opportunityCount,
  onToggleRail,
  onToggleFocus,
  className,
}: WorkspaceLayoutControlsProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn('flex items-center gap-1 shrink-0', className)}
      data-testid="workspace-layout-controls"
    >
      {!focusMode && (
        <button
          type="button"
          onClick={onToggleRail}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 min-h-11 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:min-h-9 lg:px-2.5 lg:py-1.5"
          aria-pressed={railCollapsed}
          data-testid="workspace-toggle-rail"
        >
          {railCollapsed ? (
            <PanelRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <PanelRightClose className="h-3.5 w-3.5" aria-hidden />
          )}
          {railCollapsed
            ? t('admin.workspace.layoutShowTasks', { count: opportunityCount })
            : t('admin.workspace.layoutHideTasks')}
        </button>
      )}
      <button
        type="button"
        onClick={onToggleFocus}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 min-h-11 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:min-h-9 lg:px-2.5 lg:py-1.5"
        aria-pressed={focusMode}
        data-testid="workspace-toggle-focus"
      >
        {focusMode ? (
          <Minimize2 className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" aria-hidden />
        )}
        {focusMode ? t('admin.workspace.layoutExitFocus') : t('admin.workspace.layoutEnterFocus')}
      </button>
    </div>
  );
}
