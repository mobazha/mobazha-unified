'use client';

import { useCallback, useState } from 'react';
import {
  applyAgentApproval,
  approveAndApplyAgentApproval,
  decideAgentApproval,
  useI18n,
} from '@mobazha/core';
import { Check, Loader2, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export type AgentApprovalLocalStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';

interface AgentApprovalActionsProps {
  approvalId: string;
  action: string;
  summary: string;
  localStatus: AgentApprovalLocalStatus;
  applyError?: string;
  onStatusChange?: (localStatus: Exclude<AgentApprovalLocalStatus, 'pending'>) => void;
  testId?: string;
}

export function AgentApprovalActions({
  approvalId,
  action,
  summary,
  localStatus,
  applyError,
  onStatusChange,
  testId,
}: AgentApprovalActionsProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'approve' | 'reject' | 'retry' | null>(null);
  const [lastError, setLastError] = useState(applyError);

  const isRetryable = localStatus === 'failed';
  const isTerminal = localStatus === 'applied' || localStatus === 'rejected';
  const showPendingActions = localStatus === 'pending';

  const handleApprove = useCallback(async () => {
    setBusy('approve');
    try {
      await approveAndApplyAgentApproval(approvalId);
      onStatusChange?.('applied');
      toast({
        title: t('ai.approval.appliedTitle'),
        description: t('ai.approval.appliedDescription', { action }),
        variant: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('ai.approval.applyFailed');
      setLastError(message);
      onStatusChange?.('failed');
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  }, [action, approvalId, onStatusChange, t, toast]);

  const handleRetry = useCallback(async () => {
    setBusy('retry');
    try {
      await applyAgentApproval(approvalId);
      setLastError(undefined);
      onStatusChange?.('applied');
      toast({
        title: t('ai.approval.appliedTitle'),
        description: t('ai.approval.appliedDescription', { action }),
        variant: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('ai.approval.applyFailed');
      setLastError(message);
      onStatusChange?.('failed');
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  }, [action, approvalId, onStatusChange, t, toast]);

  const handleReject = useCallback(async () => {
    setBusy('reject');
    try {
      await decideAgentApproval(approvalId, 'rejected');
      onStatusChange?.('rejected');
      toast({
        title: t('ai.approval.rejectedTitle'),
        description: t('ai.approval.rejectedDescription'),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('ai.approval.rejectFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  }, [approvalId, onStatusChange, t, toast]);

  return (
    <div
      className="my-2 rounded-lg border border-border bg-card p-3 text-sm"
      data-testid={testId || `agent-approval-${approvalId}`}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-foreground">{t('ai.approval.title')}</p>
          <p className="text-muted-foreground">{summary || action}</p>
          <p className="text-xs text-muted-foreground">
            {t('ai.approval.actionLabel', { action })}
          </p>
          {isTerminal ? (
            <p className="text-xs text-muted-foreground">
              {localStatus === 'applied'
                ? t('ai.approval.statusApplied')
                : t('ai.approval.statusRejected')}
            </p>
          ) : isRetryable ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-destructive">
                {t('ai.approval.statusFailed')}
                {lastError ? `: ${lastError}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="min-h-9"
                  disabled={busy !== null}
                  onClick={() => void handleRetry()}
                  data-testid="agent-approval-retry"
                >
                  {busy === 'retry' ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                  )}
                  {t('ai.approval.retry')}
                </Button>
              </div>
            </div>
          ) : showPendingActions ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="min-h-9"
                disabled={busy !== null}
                onClick={() => void handleApprove()}
                data-testid="agent-approval-approve"
              >
                {busy === 'approve' ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                {t('ai.approval.approve')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-9"
                disabled={busy !== null}
                onClick={() => void handleReject()}
                data-testid="agent-approval-reject"
              >
                {busy === 'reject' ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-1.5 h-4 w-4" />
                )}
                {t('ai.approval.reject')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
