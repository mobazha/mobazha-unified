'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  createProductImportProposalApproval,
  formatProductImportDraftPrice,
  productImportDraftQuantity,
  useI18n,
  useProductImportWorkbench,
  type ProductImportRowStatusFilter,
  type ProductImportWorkbenchRow,
} from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import type { TranslateFunction } from '@mobazha/core/i18n/types';
import { AIChatPanel } from '@/components/AIChatPanel';
import {
  AgentApprovalActions,
  type AgentApprovalLocalStatus,
} from '@/components/ai/AgentApprovalActions';
import { useAiWorkspaceStatus } from '@/components/admin/workspace/useAiWorkspaceStatus';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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

function runStatusLabel(status: string, t: TranslateFunction): string {
  switch (status) {
    case 'running':
      return t('admin.productImport.workbench.runStatusRunning');
    case 'waiting_for_review':
      return t('admin.productImport.workbench.runStatusWaiting');
    case 'completed':
      return t('admin.productImport.workbench.runStatusCompleted');
    case 'failed':
      return t('admin.productImport.workbench.runStatusFailed');
    case 'cancelled':
      return t('admin.productImport.workbench.runStatusCancelled');
    default:
      return status;
  }
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
      onStatusChange={() => onRefresh()}
      testId={`import-row-approval-${row.proposalArtifactId}`}
    />
  );
}

interface ProductImportWorkbenchPanelProps {
  runId: string;
}

const STATUS_FILTERS: ProductImportRowStatusFilter[] = [
  '',
  'needs_review',
  'pending_approval',
  'applied',
  'approval_failed',
];

export function ProductImportWorkbenchPanel({ runId }: ProductImportWorkbenchPanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const attachSkillRun = useAIChatStore(s => s.attachSkillRun);
  const { available: aiAvailable, loading: aiStatusLoading } = useAiWorkspaceStatus();
  const [statusFilter, setStatusFilter] = useState<ProductImportRowStatusFilter>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const attachedRunRef = useRef<string | null>(null);
  const loadErrorNotifiedRef = useRef(false);

  const {
    workbench,
    loading,
    refreshing,
    error,
    batchBusy,
    totalRows,
    canPrevPage,
    canNextPage,
    refresh,
    prevPage,
    nextPage,
    batchPrepare,
    batchApproveAndApplySelection,
    batchRejectSelection,
  } = useProductImportWorkbench({ runId, statusFilter });

  const handleStatusFilterChange = useCallback((filter: ProductImportRowStatusFilter) => {
    setStatusFilter(filter);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (error && !loading && !workbench && !loadErrorNotifiedRef.current) {
      loadErrorNotifiedRef.current = true;
      toast({
        title: t('common.error'),
        description: error || t('admin.productImport.workbench.loadFailed'),
        variant: 'destructive',
      });
    }
    if (workbench) {
      loadErrorNotifiedRef.current = false;
    }
  }, [error, loading, workbench, t, toast]);

  useEffect(() => {
    attachedRunRef.current = null;
  }, [runId]);

  useEffect(() => {
    if (!workbench?.skillRun?.id) return;
    if (attachedRunRef.current === workbench.skillRun.id) return;
    attachedRunRef.current = workbench.skillRun.id;
    const result = attachSkillRun({
      id: workbench.skillRun.id,
      label: t('admin.productImport.workbench.continueWithAiLabel', {
        count: workbench.summary.reviewableCount || workbench.rows.length,
      }),
      skillId: workbench.skillRun.skillId,
    });
    if (result === 'max_reached') {
      toast({
        title: t('common.error'),
        description: t('admin.productImport.workbench.skillRunMaxReached'),
        variant: 'destructive',
      });
    }
  }, [
    attachSkillRun,
    t,
    toast,
    workbench?.skillRun?.id,
    workbench?.skillRun?.skillId,
    workbench?.summary.reviewableCount,
    workbench?.rows.length,
  ]);

  const validationMessages = useMemo(() => {
    if (!workbench?.validationReports?.length) return [];
    return workbench.validationReports.flatMap(report => {
      const message = report.data?.message;
      if (typeof message === 'string') {
        return [{ source: report.sourceName, message, code: report.data?.code }];
      }
      return [];
    });
  }, [workbench]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!workbench?.rows.length) return;
    const allSelected = workbench.rows.every(r => selectedIds.has(r.proposalArtifactId));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workbench.rows.map(r => r.proposalArtifactId)));
    }
  }, [selectedIds, workbench]);

  const handleBatchPrepare = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      await batchPrepare(ids);
      toast({
        title: t('common.success'),
        description: t('admin.productImport.workbench.batchPrepareSuccess', { count: ids.length }),
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('common.error'),
        variant: 'destructive',
      });
    }
  };

  const handleBatchApproveApply = async () => {
    const proposalIds = [...selectedIds];
    if (!proposalIds.length) return;
    try {
      const result = await batchApproveAndApplySelection(proposalIds);
      if (!result.actionable) {
        toast({
          title: t('admin.productImport.workbench.batchNothingToApprove'),
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: t('ai.approval.appliedTitle'),
        description: t('admin.productImport.workbench.batchApplySuccess', {
          count: result.applied,
        }),
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('ai.approval.applyFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleBatchReject = async () => {
    const proposalIds = [...selectedIds];
    if (!proposalIds.length) return;
    try {
      const result = await batchRejectSelection(proposalIds);
      if (!result.actionable) {
        toast({
          title: t('admin.productImport.workbench.batchNothingToReject'),
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: t('ai.approval.rejectedTitle'),
        description: t('admin.productImport.workbench.batchRejectSuccess', {
          count: result.rejected,
        }),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('ai.approval.rejectFailed'),
        variant: 'destructive',
      });
    }
  };

  const summary = workbench?.summary;
  const allPageSelected =
    !!workbench?.rows.length && workbench.rows.every(r => selectedIds.has(r.proposalArtifactId));

  const workbenchMain = (
    <div className="space-y-4" data-testid="product-import-workbench-main">
      {workbench && (
        <>
          <div className="flex flex-wrap gap-2">
            {summary && (
              <>
                <SummaryChip
                  label={t('admin.productImport.workbench.summaryReviewable')}
                  count={summary.reviewableCount}
                />
                <SummaryChip
                  label={t('admin.productImport.workbench.summaryActionable')}
                  count={summary.actionableCount}
                  variant="primary"
                />
                <SummaryChip
                  label={t('admin.productImport.workbench.summaryApplied')}
                  count={summary.appliedCount}
                  variant="success"
                />
                {summary.applyFailedCount > 0 && (
                  <SummaryChip
                    label={t('admin.productImport.workbench.summaryFailed')}
                    count={summary.applyFailedCount}
                    variant="destructive"
                  />
                )}
              </>
            )}
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              {runStatusLabel(workbench.skillRun.status, t)}
              {workbench.skillRun.status === 'running' && (
                <Loader2 className="ml-1.5 h-3 w-3 animate-spin" />
              )}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(filter => (
              <Button
                key={filter || 'all'}
                type="button"
                size="sm"
                variant={statusFilter === filter ? 'default' : 'outline'}
                className="min-h-9"
                onClick={() => handleStatusFilterChange(filter)}
                data-testid={`import-filter-${filter || 'all'}`}
              >
                {t(`admin.productImport.workbench.filter.${filter || 'all'}`)}
              </Button>
            ))}
          </div>

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

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">
                {t('admin.productImport.workbench.selectedCount', { count: selectedIds.size })}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-9"
                disabled={batchBusy}
                onClick={() => void handleBatchPrepare()}
                data-testid="import-batch-prepare"
              >
                {batchBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {t('admin.productImport.workbench.batchPrepare')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-h-9"
                disabled={batchBusy}
                onClick={() => void handleBatchApproveApply()}
                data-testid="import-batch-approve-apply"
              >
                {t('admin.productImport.workbench.batchApproveApply')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-9"
                disabled={batchBusy}
                onClick={() => void handleBatchReject()}
                data-testid="import-batch-reject"
              >
                {t('admin.productImport.workbench.batchReject')}
              </Button>
            </div>
          )}

          {workbench.rows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {t('admin.productImport.workbench.emptyRows')}
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={() => toggleSelectAll()}
                        aria-label={t('admin.productImport.workbench.selectAll')}
                      />
                    </th>
                    <th className="w-8 px-1 py-2.5" />
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
                  {workbench.rows.map(row => {
                    const expanded = expandedIds.has(row.proposalArtifactId);
                    const rowValidation = Array.isArray(row.validation) ? row.validation : [];
                    return (
                      <React.Fragment key={row.proposalArtifactId}>
                        <tr
                          className="border-b border-border align-top last:border-0"
                          data-testid={`import-workbench-row-${row.proposalArtifactId}`}
                        >
                          <td className="px-3 py-3">
                            <Checkbox
                              checked={selectedIds.has(row.proposalArtifactId)}
                              onCheckedChange={() => toggleRow(row.proposalArtifactId)}
                              aria-label={t('admin.productImport.workbench.selectRow')}
                            />
                          </td>
                          <td className="px-1 py-3">
                            <button
                              type="button"
                              className="rounded p-1 hover:bg-muted"
                              aria-expanded={expanded}
                              onClick={() => toggleExpanded(row.proposalArtifactId)}
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {row.rowNumber ?? '—'}
                          </td>
                          <td className="px-3 py-3 font-medium">{row.draft?.title || '—'}</td>
                          <td className="px-3 py-3">{formatProductImportDraftPrice(row.draft)}</td>
                          <td className="px-3 py-3">{productImportDraftQuantity(row.draft)}</td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {row.sourceName || '—'}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1">
                              {row.approval?.status === 'applied' && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              )}
                              {rowStatusLabel(row, t)}
                            </span>
                          </td>
                          <td className="min-w-[200px] px-3 py-3">
                            <WorkbenchRowActions row={row} onRefresh={() => void refresh()} />
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-border bg-muted/20">
                            <td colSpan={9} className="px-4 py-3 text-sm text-muted-foreground">
                              {row.draft?.description && (
                                <p className="mb-2 whitespace-pre-wrap">{row.draft.description}</p>
                              )}
                              {rowValidation.length > 0 && (
                                <ul className="space-y-1">
                                  {rowValidation.map((item, i) => (
                                    <li key={i}>
                                      {typeof item === 'object' &&
                                      item !== null &&
                                      'message' in item
                                        ? String((item as { message?: string }).message)
                                        : String(item)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {!row.draft?.description && rowValidation.length === 0 && (
                                <span>{t('admin.productImport.workbench.noRowDetails')}</span>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalRows > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {t('admin.productImport.workbench.pagination', {
                  from: workbench.page.offset + 1,
                  to: workbench.page.offset + workbench.page.returnedRows,
                  total: totalRows,
                })}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canPrevPage || loading}
                  onClick={prevPage}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canNextPage || loading}
                  onClick={nextPage}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link href="/admin/products">{t('admin.productImport.workbench.goToProducts')}</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6" data-testid="product-import-workbench">
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
              count: workbench?.page.totalRows ?? workbench?.rows.length ?? 0,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void refresh()}
        >
          <RefreshCw className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')} />
          {t('common.refresh')}
        </Button>
      </div>

      {loading && !workbench ? (
        <div className="space-y-4">
          <div className="h-8 w-64 animate-pulse rounded bg-muted/40" />
          <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
        </div>
      ) : error && !workbench ? (
        <Card className="border-destructive/40 p-6 text-sm text-destructive">{error}</Card>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-6">
          <section>{workbenchMain}</section>
          <section className="mt-6 lg:sticky lg:top-4 lg:mt-0">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t('admin.productImport.workbench.chatTitle')}
            </h3>
            <AIChatPanel
              variant="inline"
              aiAvailable={aiAvailable}
              aiStatusLoading={aiStatusLoading}
              setupPromptVariant="minimal"
            />
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryChip({
  label,
  count,
  variant = 'default',
}: {
  label: string;
  count: number;
  variant?: 'default' | 'primary' | 'success' | 'destructive';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs',
        variant === 'primary' && 'border-primary/30 bg-primary/10 text-primary',
        variant === 'success' && 'border-success/30 bg-success/10 text-success',
        variant === 'destructive' && 'border-destructive/30 bg-destructive/10 text-destructive',
        variant === 'default' && 'border-border text-muted-foreground'
      )}
    >
      {label}: {count}
    </span>
  );
}
