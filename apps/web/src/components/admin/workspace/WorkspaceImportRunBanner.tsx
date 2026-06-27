'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getProductImportWorkbench, useI18n } from '@mobazha/core';
import { ArrowRight, Loader2, MessageSquare, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  clearWorkspaceImportRunId,
  getWorkspaceImportRunId,
  setWorkspaceImportRunId,
} from './workspaceImportRunStorage';
import { scrollToWorkspaceChatPanel } from './workspaceLayoutStorage';

interface WorkspaceImportRunBannerProps {
  runId?: string | null;
  onRunIdChange?: (runId: string | null) => void;
}

export function WorkspaceImportRunBanner({ runId, onRunIdChange }: WorkspaceImportRunBannerProps) {
  const { t } = useI18n();
  const [activeRunId, setActiveRunId] = useState<string | null>(runId ?? getWorkspaceImportRunId());
  const [reviewableCount, setReviewableCount] = useState<number | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (runId) {
      setActiveRunId(runId);
    }
  }, [runId]);

  const refresh = useCallback(async () => {
    if (!activeRunId) return;
    setLoading(true);
    try {
      const workbench = await getProductImportWorkbench(activeRunId, { limit: 1 });
      setReviewableCount(workbench.summary.reviewableCount);
      setRunStatus(workbench.skillRun.status);
      if (workbench.skillRun.status === 'completed' && workbench.summary.reviewableCount === 0) {
        clearWorkspaceImportRunId();
        setActiveRunId(null);
        onRunIdChange?.(null);
      }
    } catch {
      clearWorkspaceImportRunId();
      setActiveRunId(null);
      onRunIdChange?.(null);
    } finally {
      setLoading(false);
    }
  }, [activeRunId, onRunIdChange]);

  useEffect(() => {
    if (!activeRunId) return;
    void refresh();
    if (runStatus !== 'running') return;
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [activeRunId, refresh, runStatus]);

  if (!activeRunId) {
    return null;
  }

  const statusLabel =
    runStatus === 'running'
      ? t('admin.workspace.importRunStatusRunning')
      : runStatus === 'waiting_for_review'
        ? t('admin.workspace.importRunStatusReview')
        : runStatus === 'waiting_for_approval'
          ? t('admin.workspace.importRunStatusApproval')
          : runStatus === 'failed'
            ? t('admin.workspace.importRunStatusFailed')
            : runStatus === 'cancelled'
              ? t('admin.workspace.importRunStatusCancelled')
              : runStatus === 'completed'
                ? t('admin.workspace.importRunStatusReady')
                : t('admin.workspace.importRunStatusChecking');
  const canContinueReview = runStatus !== 'failed' && runStatus !== 'cancelled';

  const taskSummary =
    reviewableCount != null
      ? t('admin.workspace.importRunTaskSummary', { count: reviewableCount, status: statusLabel })
      : t('admin.workspace.importRunTaskParsing', { status: statusLabel });

  return (
    <div
      className="rounded-xl border border-primary/30 bg-primary/[0.04] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
      data-testid="workspace-import-run-banner"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t('admin.workspace.importRunTaskTitle')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{taskSummary}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          onClick={scrollToWorkspaceChatPanel}
          data-testid="workspace-import-run-scroll-chat"
        >
          <MessageSquare className="mr-1.5 h-4 w-4" />
          {t('admin.workspace.importRunOpenChat')}
        </Button>
        {canContinueReview && (
          <Button asChild size="sm" className="min-h-9">
            <Link href={`/admin/products/import/${encodeURIComponent(activeRunId)}`}>
              {t('admin.workspace.importRunContinueReview')}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        )}
        <button
          type="button"
          className={cn(
            'p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
          )}
          aria-label={t('common.close')}
          onClick={() => {
            clearWorkspaceImportRunId();
            setActiveRunId(null);
            onRunIdChange?.(null);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function rememberWorkspaceImportRun(runId: string, onRunIdChange?: (runId: string) => void) {
  setWorkspaceImportRunId(runId);
  onRunIdChange?.(runId);
}
