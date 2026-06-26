'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import {
  createProductImportProposalApproval,
  formatProductImportDraftPrice,
  getProductImportWorkbench,
  productImportDraftQuantity,
  useI18n,
} from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import type { ProductImportWorkbench, ProductImportWorkbenchRow } from '@mobazha/core';
import type { TranslateFunction } from '@mobazha/core/i18n/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  AgentApprovalActions,
  type AgentApprovalLocalStatus,
} from '@/components/ai/AgentApprovalActions';

function approvalLocalStatus(status?: string): AgentApprovalLocalStatus {
  switch (status) {
    case 'applied':
      return 'applied';
    case 'rejected':
      return 'rejected';
    case 'apply_failed':
      return 'failed';
    default:
      return 'pending';
  }
}

function rowStatusLabel(row: ProductImportWorkbenchRow, t: TranslateFunction): string {
  if (row.approval?.status === 'applied') {
    return t('admin.productImport.workbench.statusApplied');
  }
  if (row.approval?.status === 'pending' || row.approval?.status === 'approved') {
    return t('admin.productImport.workbench.statusPendingApproval');
  }
  if (row.status === 'needs_review') {
    return t('admin.productImport.workbench.statusNeedsReview');
  }
  return row.status;
}

interface WorkbenchRowActionsProps {
  row: ProductImportWorkbenchRow;
  onRefresh: () => void;
}

function WorkbenchRowActions({ row, onRefresh }: WorkbenchRowActionsProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [localStatus, setLocalStatus] = useState<AgentApprovalLocalStatus>(() =>
    row.approval ? approvalLocalStatus(row.approval.status) : 'pending'
  );

  useEffect(() => {
    if (row.approval) {
      setLocalStatus(approvalLocalStatus(row.approval.status));
    }
  }, [row.approval]);

  const handleCreateApproval = async () => {
    setCreating(true);
    try {
      await createProductImportProposalApproval(row.proposalArtifactId);
      onRefresh();
    } catch (err) {
      toast({
        title: t('common.error'),
        description:
          err instanceof Error
            ? err.message
            : t('admin.productImport.workbench.createApprovalFailed'),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (!row.approval) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-9"
        disabled={creating}
        onClick={() => void handleCreateApproval()}
        data-testid={`import-row-create-approval-${row.proposalArtifactId}`}
      >
        {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        {t('admin.productImport.workbench.createApproval')}
      </Button>
    );
  }

  return (
    <AgentApprovalActions
      approvalId={row.approval.id}
      action={row.approval.action}
      summary={row.draft?.title || row.approval.action}
      localStatus={localStatus}
      onStatusChange={status => {
        setLocalStatus(status);
        onRefresh();
      }}
      testId={`import-row-approval-${row.proposalArtifactId}`}
    />
  );
}

export default function ProductImportWorkbenchPage() {
  const { t } = useI18n();
  const params = useParams();
  const runId = typeof params?.runId === 'string' ? params.runId : '';
  const { toast } = useToast();
  const attachSkillRun = useAIChatStore(s => s.attachSkillRun);
  const openChat = useAIChatStore(s => s.open);
  const [workbench, setWorkbench] = useState<ProductImportWorkbench | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkbench = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProductImportWorkbench(runId);
      setWorkbench(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('admin.productImport.workbench.loadFailed');
      setError(message);
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [runId, t, toast]);

  useEffect(() => {
    void loadWorkbench();
  }, [loadWorkbench]);

  const validationMessages = useMemo(() => {
    if (!workbench?.validationReports?.length) return [];
    return workbench.validationReports.flatMap(report => {
      const code = report.data?.code;
      const message = report.data?.message;
      if (typeof message === 'string') {
        return [{ source: report.sourceName, message, code }];
      }
      return [];
    });
  }, [workbench]);

  const handleContinueWithAi = () => {
    if (!workbench) return;
    const result = attachSkillRun({
      id: workbench.skillRun.id,
      label: t('admin.productImport.workbench.continueWithAiLabel', {
        count: workbench.rows.length,
      }),
      skillId: workbench.skillRun.skillId,
    });
    if (result === 'max_reached') {
      toast({
        title: t('common.error'),
        description: t('admin.productImport.workbench.skillRunMaxReached'),
        variant: 'destructive',
      });
      return;
    }
    openChat();
  };

  if (!runId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('admin.productImport.workbench.missingRun')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/products/import"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.productImport.workbench.backToHub')}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('admin.productImport.workbench.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('admin.productImport.workbench.subtitle', {
              count: workbench?.rows.length ?? 0,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void loadWorkbench()}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading || !workbench}
            onClick={handleContinueWithAi}
            data-testid="import-workbench-continue-with-ai"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {t('admin.productImport.workbench.continueWithAi')}
          </Button>
        </div>
      </div>

      {loading && !workbench ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('common.loading')}
        </div>
      ) : error && !workbench ? (
        <Card className="border-destructive/40 p-6 text-sm text-destructive">{error}</Card>
      ) : workbench ? (
        <>
          {workbench.sources.length > 0 && (
            <Card className="p-4">
              <h2 className="text-sm font-medium">{t('admin.productImport.workbench.sources')}</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {workbench.sources.map(source => (
                  <li key={source.artifactId} className="flex flex-wrap gap-2">
                    <span>{source.sourceName || source.artifactId}</span>
                    {source.contentType && <span className="text-xs">({source.contentType})</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {validationMessages.length > 0 && (
            <Card className="border-warning/40 bg-warning/10 p-4">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-medium">
                    {t('admin.productImport.workbench.validationTitle')}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {validationMessages.map((item, i) => (
                      <li key={`${item.source}-${i}`}>
                        {item.source ? `${item.source}: ` : ''}
                        {item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {workbench.rows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {t('admin.productImport.workbench.emptyRows')}
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-medium">#</th>
                    <th className="px-3 py-2.5 font-medium">
                      {t('admin.productImport.workbench.colTitle')}
                    </th>
                    <th className="px-3 py-2.5 font-medium">
                      {t('admin.productImport.workbench.colPrice')}
                    </th>
                    <th className="px-3 py-2.5 font-medium">
                      {t('admin.productImport.workbench.colQty')}
                    </th>
                    <th className="px-3 py-2.5 font-medium">
                      {t('admin.productImport.workbench.colSource')}
                    </th>
                    <th className="px-3 py-2.5 font-medium">
                      {t('admin.productImport.workbench.colStatus')}
                    </th>
                    <th className="px-3 py-2.5 font-medium">
                      {t('admin.productImport.workbench.colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workbench.rows.map(row => (
                    <tr
                      key={row.proposalArtifactId}
                      className="border-b border-border align-top last:border-0"
                      data-testid={`import-workbench-row-${row.proposalArtifactId}`}
                    >
                      <td className="px-3 py-3 text-muted-foreground">{row.rowNumber ?? '—'}</td>
                      <td className="px-3 py-3 font-medium">{row.draft?.title || '—'}</td>
                      <td className="px-3 py-3">{formatProductImportDraftPrice(row.draft)}</td>
                      <td className="px-3 py-3">{productImportDraftQuantity(row.draft)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{row.sourceName || '—'}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1">
                          {row.approval?.status === 'applied' && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          )}
                          {rowStatusLabel(row, t)}
                        </span>
                      </td>
                      <td className="min-w-[200px] px-3 py-3">
                        <WorkbenchRowActions row={row} onRefresh={() => void loadWorkbench()} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link href="/admin/products">{t('admin.productImport.workbench.goToProducts')}</Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
