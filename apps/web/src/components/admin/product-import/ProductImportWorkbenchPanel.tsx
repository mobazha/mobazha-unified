'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileImage,
  FileText,
  Loader2,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  X,
} from 'lucide-react';
import {
  approveAndApplyAgentApproval,
  applyAgentApproval,
  aggregateMissingProductImportFields,
  createProductImportProposalApproval,
  decideAgentApproval,
  fetchProductImportSourcePreview,
  formatProductImportDraftPrice,
  getProductImportUserRowState,
  isImageImportSource,
  matchesProductImportUserFilter,
  missingProductImportDraftFields,
  productImportApprovalExecutionMode,
  productImportDraftCurrencyCode,
  productImportDraftQuantity,
  useCurrency,
  useI18n,
  useProductImportWorkbench,
  type ProductImportMissingField,
  type ProductImportUserFilter,
  type ProductImportUserRowState,
  type ProductImportWorkbenchRow,
  type ProductImportWorkbenchSource,
} from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import type { TranslateFunction } from '@mobazha/core/i18n/types';
import { AIChatPanel } from '@/components/AIChatPanel';
import { useAiWorkspaceStatus } from '@/components/admin/workspace/useAiWorkspaceStatus';
import { ImportDraftEditor } from '@/components/admin/product-import/ImportDraftEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const USER_FILTERS: ProductImportUserFilter[] = ['all', 'needs_fix', 'ready', 'applied', 'failed'];

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

function userRowStateLabel(state: ProductImportUserRowState, t: TranslateFunction): string {
  return t(`admin.productImport.workbench.userState.${state}`);
}

function formatMissingFieldLabels(
  fields: ProductImportMissingField[],
  t: TranslateFunction,
  locale: string
): string {
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
    fields.map(field => t(`admin.productImport.workbench.missingFieldLabel.${field}`))
  );
}

interface ImportWorkbenchToolbarProps {
  running: boolean;
  needsFixCount: number;
  readyCount: number;
  appliedCount: number;
  onApplyReady: () => void;
  onGoFixFirst: () => void;
  applying: boolean;
  showMobileSummary: boolean;
  hideGoFixAction: boolean;
}

function ImportWorkbenchToolbar({
  running,
  needsFixCount,
  readyCount,
  appliedCount,
  onApplyReady,
  onGoFixFirst,
  applying,
  showMobileSummary,
  hideGoFixAction,
}: ImportWorkbenchToolbarProps) {
  const { t } = useI18n();
  const complete = appliedCount > 0 && needsFixCount === 0 && readyCount === 0;
  const activeStep = running ? 0 : complete ? 2 : needsFixCount > 0 || readyCount > 0 ? 1 : 2;
  const steps = [
    t('admin.productImport.workbench.progress.parse'),
    t('admin.productImport.workbench.progress.review'),
    t('admin.productImport.workbench.progress.apply'),
  ];

  const summaryParts: string[] = [];
  if (needsFixCount > 0) {
    summaryParts.push(t('admin.productImport.workbench.summaryNeedsFix', { count: needsFixCount }));
  }
  if (readyCount > 0) {
    summaryParts.push(t('admin.productImport.workbench.summaryReady', { count: readyCount }));
  }

  return (
    <Card
      className={cn('overflow-hidden', !showMobileSummary && 'hidden md:block')}
      data-testid="import-progress"
    >
      {showMobileSummary && (
        <div className="flex items-center gap-2 p-3 md:hidden">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('admin.productImport.workbench.mobileToolbarRunning')}
              </p>
            </>
          ) : (
            <p className="text-sm text-foreground">
              {complete
                ? t('admin.productImport.workbench.summaryAllClear')
                : summaryParts.length > 0
                  ? summaryParts.join(' · ')
                  : t('admin.productImport.workbench.mobileToolbarReviewing')}
            </p>
          )}
        </div>
      )}

      {/* Desktop: stepper + primary action (counts live in filter tabs) */}
      <div className="hidden flex-col gap-3 p-3 md:flex md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
        <nav
          className="flex min-w-0 flex-1 items-center md:max-w-md"
          aria-label={t('admin.productImport.workbench.progress.label')}
        >
          <ol className="flex w-full items-center">
            {steps.map((label, index) => {
              const finished = complete || index < activeStep;
              const active = !complete && index === activeStep;
              return (
                <li key={label} className="contents">
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                        finished && 'border-primary bg-primary text-primary-foreground',
                        active && 'border-primary bg-primary/10 text-primary',
                        !finished && !active && 'border-border bg-background text-muted-foreground'
                      )}
                      aria-current={active ? 'step' : undefined}
                    >
                      {finished ? <Check className="h-3 w-3" strokeWidth={2.5} /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        'max-w-[5.25rem] break-words text-center text-xs leading-tight sm:max-w-none',
                        active || finished ? 'font-medium text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      aria-hidden
                      className={cn(
                        'mx-2 h-px min-w-[1.25rem] flex-1',
                        index < activeStep || complete ? 'bg-primary/70' : 'bg-border'
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          {readyCount > 0 ? (
            <Button
              type="button"
              size="sm"
              className="min-h-9 shrink-0"
              disabled={applying}
              onClick={onApplyReady}
              data-testid="import-primary-apply-ready"
            >
              {applying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {t('admin.productImport.workbench.primaryApplyReady', { count: readyCount })}
            </Button>
          ) : needsFixCount > 0 && !hideGoFixAction ? (
            <Button
              type="button"
              size="sm"
              className="min-h-9 shrink-0"
              onClick={onGoFixFirst}
              data-testid="import-primary-go-fix"
            >
              {t('admin.productImport.workbench.primaryGoFix')}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

interface ImportMobileActionBarProps {
  needsFixCount: number;
  readyCount: number;
  applying: boolean;
  batchBusy: boolean;
  showBatchBar: boolean;
  running: boolean;
  hideGoFixAction: boolean;
  onApplyReady: () => void;
  onGoFixFirst: () => void;
}

function ImportMobileActionBar({
  needsFixCount,
  readyCount,
  applying,
  batchBusy,
  showBatchBar,
  running,
  hideGoFixAction,
  onApplyReady,
  onGoFixFirst,
}: ImportMobileActionBarProps) {
  const { t } = useI18n();
  if (running || showBatchBar || (needsFixCount === 0 && readyCount === 0)) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      data-testid="import-mobile-action-bar"
    >
      {readyCount > 0 ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={applying || batchBusy}
          onClick={onApplyReady}
          data-testid="import-mobile-apply-ready"
        >
          {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('admin.productImport.workbench.primaryApplyReadyMobile', { count: readyCount })}
        </Button>
      ) : needsFixCount > 0 && !hideGoFixAction ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          onClick={onGoFixFirst}
          data-testid="import-mobile-go-fix"
        >
          {t('admin.productImport.workbench.primaryGoFix')}
        </Button>
      ) : null}
    </div>
  );
}

interface ImportValidationNotesProps {
  messages: Array<{ source?: string; message: string; code?: unknown }>;
}

function ImportValidationNotes({ messages }: ImportValidationNotesProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  if (!messages.length) return null;

  const preview = messages[0];
  const previewText = preview
    ? `${preview.source ? `${preview.source}: ` : ''}${preview.message}`
    : '';

  return (
    <Card className="border-warning/40 bg-warning/10 p-3" data-testid="import-validation-notes">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">
              {t('admin.productImport.workbench.validationTitle')}
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({t('admin.productImport.workbench.validationCount', { count: messages.length })})
              </span>
            </p>
            {messages.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 px-2 text-xs"
                onClick={() => setExpanded(open => !open)}
                aria-expanded={expanded}
              >
                {expanded
                  ? t('admin.productImport.workbench.validationHideDetails')
                  : t('admin.productImport.workbench.validationShowDetails')}
              </Button>
            )}
          </div>
          {!expanded ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{previewText}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {messages.map((item, i) => (
                <li key={`${item.source}-${i}`}>
                  {item.source ? `${item.source}: ` : ''}
                  {item.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ImportSourceThumbnailProps {
  source?: ProductImportWorkbenchSource;
  sourceName?: string;
}

function ImportSourceThumbnailPreview({
  artifactId,
  label,
}: {
  artifactId: string;
  label: string;
}) {
  const { t } = useI18n();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void fetchProductImportSourcePreview(artifactId)
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPreviewFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [artifactId]);

  if (previewUrl) {
    return (
      <div
        className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-muted/30 md:h-14 md:w-14"
        title={label}
      >
        <img
          src={previewUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          data-testid="import-source-preview"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary md:h-14 md:w-14"
      title={label}
    >
      <FileImage className="h-6 w-6" aria-hidden />
      {previewFailed ? (
        <span className="mt-0.5 max-w-full truncate px-1 text-[9px] text-muted-foreground">
          {t('admin.productImport.workbench.previewUnavailable')}
        </span>
      ) : null}
      <span className="mt-0.5 max-w-[52px] truncate px-1 text-[10px]">
        {t('admin.productImport.workbench.imageSourceLabel')}
      </span>
    </div>
  );
}

function ImportSourceThumbnail({ source, sourceName }: ImportSourceThumbnailProps) {
  const { t } = useI18n();
  const label = sourceName || source?.sourceName || '';
  const isImage = isImageImportSource(source?.contentType, label);

  if (isImage && source?.hasPreview && source.artifactId) {
    return <ImportSourceThumbnailPreview artifactId={source.artifactId} label={label} />;
  }

  return (
    <div
      className={cn(
        'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground md:h-14 md:w-14',
        isImage && 'border-primary/20 bg-primary/5 text-primary'
      )}
      title={label}
    >
      {isImage ? (
        <FileImage className="h-6 w-6" aria-hidden />
      ) : (
        <FileText className="h-6 w-6" aria-hidden />
      )}
      <span className="mt-0.5 max-w-[52px] truncate px-1 text-[10px]">
        {isImage ? t('admin.productImport.workbench.imageSourceLabel') : label.split('.').pop()}
      </span>
    </div>
  );
}

interface RowPrimaryActionProps {
  row: ProductImportWorkbenchRow;
  onRefresh: () => void;
}

function RowPrimaryAction({ row, onRefresh }: RowPrimaryActionProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const userState = getProductImportUserRowState(row);

  const handleApply = async () => {
    setBusy(true);
    try {
      const executionMode = productImportApprovalExecutionMode(row.approval?.status);
      if (executionMode === 'none') {
        await onRefresh();
        return;
      }
      if (executionMode === 'create_and_apply') {
        const approval = await createProductImportProposalApproval(row.proposalArtifactId);
        await approveAndApplyAgentApproval(approval.id);
        toast({
          title: t('ai.approval.appliedTitle'),
          variant: 'success',
        });
        await onRefresh();
        return;
      }
      if (executionMode === 'approve_and_apply') {
        await approveAndApplyAgentApproval(row.approval!.id);
      } else {
        await applyAgentApproval(row.approval!.id);
      }
      toast({
        title: t('ai.approval.appliedTitle'),
        variant: 'success',
      });
      await onRefresh();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('ai.approval.applyFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      const approval =
        row.approval ?? (await createProductImportProposalApproval(row.proposalArtifactId));
      await decideAgentApproval(approval.id, 'rejected');
      toast({ title: t('ai.approval.rejectedTitle') });
      await onRefresh();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('ai.approval.rejectFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  if (userState === 'applied') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        {userRowStateLabel(userState, t)}
      </span>
    );
  }

  if (row.approval?.status === 'applying') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.loading')}
      </span>
    );
  }

  if (userState === 'failed') {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-9"
        disabled={busy}
        onClick={() => void handleApply()}
      >
        {t('ai.approval.retry')}
      </Button>
    );
  }

  if (userState === 'needs_fix') {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        className="min-h-9"
        disabled={busy}
        onClick={() => void handleApply()}
        data-testid={`import-row-primary-${row.proposalArtifactId}`}
      >
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        {t('admin.productImport.workbench.singleRowApply')}
      </Button>
      {userState === 'ready' && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-9 text-muted-foreground"
          disabled={busy}
          onClick={() => void handleReject()}
        >
          <X className="mr-1 h-4 w-4" />
          {t('admin.productImport.workbench.batchReject')}
        </Button>
      )}
    </div>
  );
}

function ImportRowCollapsedSummary({
  row,
  missingFields,
  currencyCode,
}: {
  row: ProductImportWorkbenchRow;
  missingFields: ProductImportMissingField[];
  currencyCode: string;
}) {
  const { t, locale } = useI18n();

  if (missingFields.length > 0) {
    const fieldLabels = formatMissingFieldLabels(missingFields, t, locale);
    const showCurrency = missingFields.includes('price') || Boolean(row.draft?.price?.currencyCode);
    return (
      <p className="mt-1.5 text-sm text-muted-foreground">
        {t('admin.productImport.workbench.rowMissingSummary', { fields: fieldLabels })}
        {showCurrency ? (
          <span className="text-muted-foreground/80">{` · ${currencyCode}`}</span>
        ) : null}
      </p>
    );
  }

  return (
    <p className="mt-1.5 text-sm text-muted-foreground">
      {t('admin.productImport.workbench.rowReadySummary', {
        price: formatProductImportDraftPrice(row.draft),
        qty: productImportDraftQuantity(row.draft),
      })}
    </p>
  );
}

interface ImportWorkbenchRowProps {
  row: ProductImportWorkbenchRow;
  source?: ProductImportWorkbenchSource;
  expanded: boolean;
  selected: boolean;
  showCheckbox: boolean;
  onToggleSelect: () => void;
  onToggleExpanded: () => void;
  onRefresh: () => void;
  onAskAi: () => void;
}

function ImportWorkbenchRow({
  row,
  source,
  expanded,
  selected,
  showCheckbox,
  onToggleSelect,
  onToggleExpanded,
  onRefresh,
  onAskAi,
}: ImportWorkbenchRowProps) {
  const { t } = useI18n();
  const { localCurrency } = useCurrency();
  const missingFields = missingProductImportDraftFields(row);
  const userState = getProductImportUserRowState(row);
  const checkboxId = `import-select-${row.proposalArtifactId}`;
  const needsEditor = userState === 'needs_fix' || userState === 'ready';
  const currencyCode = productImportDraftCurrencyCode(row.draft, localCurrency || 'USD');
  const compactExpandedHeader = expanded && needsEditor;

  return (
    <div
      className="border-b border-border transition-colors last:border-0 hover:bg-muted/20"
      data-testid={`import-workbench-row-${row.proposalArtifactId}`}
    >
      <div className="flex items-start gap-3 p-3 md:p-4">
        {showCheckbox && (
          <label
            htmlFor={checkboxId}
            className="hidden min-h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-muted md:inline-flex"
          >
            <Checkbox
              id={checkboxId}
              checked={selected}
              onCheckedChange={onToggleSelect}
              aria-label={t('admin.productImport.workbench.selectRow')}
            />
          </label>
        )}

        <ImportSourceThumbnail source={source} sourceName={row.sourceName} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <button
              type="button"
              className="min-w-0 flex-1 rounded-md text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={expanded}
              onClick={onToggleExpanded}
            >
              <div className="flex items-start gap-2 p-0.5">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center">
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  {!compactExpandedHeader ? (
                    <p className="line-clamp-2 text-base font-medium text-foreground">
                      {row.draft?.title || t('admin.productImport.workbench.untitledProduct')}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">
                      {row.rowNumber != null ? `#${row.rowNumber}` : null}
                      {row.rowNumber != null && row.sourceName ? ' · ' : null}
                      {row.sourceName ? (
                        <span className="truncate" title={row.sourceName}>
                          {row.sourceName}
                        </span>
                      ) : null}
                    </p>
                  )}
                  {!compactExpandedHeader && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {row.rowNumber != null && <span>#{row.rowNumber}</span>}
                      {row.sourceName && (
                        <span className="max-w-[240px] truncate" title={row.sourceName}>
                          {row.sourceName}
                        </span>
                      )}
                    </div>
                  )}
                  {!expanded && (
                    <ImportRowCollapsedSummary
                      row={row}
                      missingFields={missingFields}
                      currencyCode={currencyCode}
                    />
                  )}
                </div>
              </div>
            </button>

            <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5 sm:flex-row sm:items-center">
              <UserStateBadge state={userState} />
              <div className="hidden lg:block">
                <RowPrimaryAction row={row} onRefresh={onRefresh} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-4 md:pl-[4.75rem]">
          {needsEditor ? (
            <ImportDraftEditor
              row={row}
              missingFields={missingFields}
              onSaved={() => void onRefresh()}
              onAskAi={onAskAi}
            />
          ) : (
            <div className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {row.draft?.description || t('admin.productImport.workbench.noDescription')}
              </p>
              {missingFields.length === 0 && (
                <p className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('admin.productImport.workbench.fieldsComplete')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserStateBadge({ state }: { state: ProductImportUserRowState }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium',
        state === 'needs_fix' && 'border-warning/40 bg-warning/10 text-warning',
        state === 'ready' && 'border-primary/30 bg-primary/10 text-primary',
        state === 'applied' && 'border-success/30 bg-success/10 text-success',
        state === 'failed' && 'border-destructive/30 bg-destructive/10 text-destructive',
        state === 'rejected' && 'border-border bg-muted/40 text-muted-foreground'
      )}
    >
      {state === 'applied' && <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
      {userRowStateLabel(state, t)}
    </span>
  );
}

interface ProductImportWorkbenchPanelProps {
  runId: string;
}

export function ProductImportWorkbenchPanel({ runId }: ProductImportWorkbenchPanelProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const attachSkillRun = useAIChatStore(s => s.attachSkillRun);
  const { available: aiAvailable, loading: aiStatusLoading } = useAiWorkspaceStatus();
  const [userFilter, setUserFilter] = useState<ProductImportUserFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [primaryApplying, setPrimaryApplying] = useState(false);
  const attachedRunRef = useRef<string | null>(null);
  const loadErrorNotifiedRef = useRef(false);
  const autoExpandedRef = useRef(false);

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
    batchApproveAndApplySelection,
    batchRejectSelection,
  } = useProductImportWorkbench({ runId, statusFilter: '' });

  const sourceByArtifactId = useMemo(() => {
    const map = new Map<string, ProductImportWorkbenchSource>();
    workbench?.sources.forEach(source => map.set(source.artifactId, source));
    return map;
  }, [workbench?.sources]);

  const visibleRows = useMemo(() => {
    if (!workbench?.rows) return [];
    return workbench.rows.filter(row => matchesProductImportUserFilter(row, userFilter));
  }, [workbench?.rows, userFilter]);

  const rowStats = useMemo(() => {
    const rows = workbench?.rows ?? [];
    let needsFixCount = 0;
    let readyCount = 0;
    let appliedCount = 0;
    let failedCount = 0;
    for (const row of rows) {
      const state = getProductImportUserRowState(row);
      if (state === 'needs_fix') needsFixCount += 1;
      if (state === 'ready') readyCount += 1;
      if (state === 'applied') appliedCount += 1;
      if (state === 'failed') failedCount += 1;
    }
    return { needsFixCount, readyCount, appliedCount, failedCount, all: rows.length };
  }, [workbench?.rows]);

  const filterCounts: Record<ProductImportUserFilter, number> = {
    all: rowStats.all,
    needs_fix: rowStats.needsFixCount,
    ready: rowStats.readyCount,
    applied: rowStats.appliedCount,
    failed: rowStats.failedCount,
  };

  const showBatchBar = selectedIds.size >= 2;

  useEffect(() => {
    if (!workbench?.rows.length || autoExpandedRef.current) return;
    const firstNeedsFix = workbench.rows.find(
      row => getProductImportUserRowState(row) === 'needs_fix'
    );
    if (firstNeedsFix) {
      setExpandedIds(new Set([firstNeedsFix.proposalArtifactId]));
    }
    autoExpandedRef.current = true;
  }, [workbench?.rows]);

  useEffect(() => {
    attachedRunRef.current = null;
    autoExpandedRef.current = false;
    setExpandedIds(new Set());
    setSelectedIds(new Set());
    setUserFilter('all');
  }, [runId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [workbench?.page.offset]);

  useEffect(() => {
    if (error && !loading && !workbench && !loadErrorNotifiedRef.current) {
      loadErrorNotifiedRef.current = true;
      toast({
        title: t('common.error'),
        description: error || t('admin.productImport.workbench.loadFailed'),
        variant: 'destructive',
      });
    }
    if (workbench) loadErrorNotifiedRef.current = false;
  }, [error, loading, workbench, t, toast]);

  useEffect(() => {
    if (!workbench?.skillRun?.id) return;
    if (attachedRunRef.current === workbench.skillRun.id) return;
    attachedRunRef.current = workbench.skillRun.id;
    attachSkillRun({
      id: workbench.skillRun.id,
      label: t('admin.productImport.workbench.continueWithAiLabel', {
        count: rowStats.readyCount + rowStats.needsFixCount,
      }),
      skillId: workbench.skillRun.skillId,
    });
  }, [attachSkillRun, rowStats.needsFixCount, rowStats.readyCount, t, workbench?.skillRun]);

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

  const handleGoFixFirst = useCallback(() => {
    const firstNeedsFix = workbench?.rows.find(
      row => getProductImportUserRowState(row) === 'needs_fix'
    );
    if (!firstNeedsFix) return;
    setUserFilter('needs_fix');
    setExpandedIds(new Set([firstNeedsFix.proposalArtifactId]));
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-testid="import-workbench-row-${firstNeedsFix.proposalArtifactId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [workbench?.rows]);

  const toggleSelectAll = useCallback(() => {
    if (!visibleRows.length) return;
    const allSelected = visibleRows.every(r => selectedIds.has(r.proposalArtifactId));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleRows.map(r => r.proposalArtifactId)));
  }, [selectedIds, visibleRows]);

  const handleApplyAllReady = async () => {
    const readyIds =
      workbench?.rows
        .filter(row => getProductImportUserRowState(row) === 'ready')
        .map(row => row.proposalArtifactId) ?? [];
    if (!readyIds.length) return;
    setPrimaryApplying(true);
    try {
      const result = await batchApproveAndApplySelection(readyIds);
      if (!result.actionable) {
        toast({
          title: t('admin.productImport.workbench.batchNothingToApprove'),
          variant: 'destructive',
        });
        return;
      }
      if (result.failed > 0) {
        toast({
          title: t('common.error'),
          description: t('admin.productImport.workbench.batchApplyPartial', {
            applied: result.applied,
            failed: result.failed,
          }),
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
    } finally {
      setPrimaryApplying(false);
    }
  };

  const handleBatchApproveApply = async () => {
    const ids = [...selectedIds].filter(id => {
      const row = workbench?.rows.find(r => r.proposalArtifactId === id);
      return row && getProductImportUserRowState(row) === 'ready';
    });
    if (!ids.length) {
      toast({
        title: t('admin.productImport.workbench.completeFieldsFirst'),
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await batchApproveAndApplySelection(ids);
      if (!result.actionable) {
        toast({
          title: t('admin.productImport.workbench.batchNothingToApprove'),
          variant: 'destructive',
        });
        return;
      }
      if (result.failed > 0) {
        toast({
          title: t('common.error'),
          description: t('admin.productImport.workbench.batchApplyPartial', {
            applied: result.applied,
            failed: result.failed,
          }),
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
      setSelectedIds(new Set());
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('ai.approval.applyFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleBatchReject = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      const result = await batchRejectSelection(ids);
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
      setSelectedIds(new Set());
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('ai.approval.rejectFailed'),
        variant: 'destructive',
      });
    }
  };

  const allPageSelected =
    visibleRows.length > 0 && visibleRows.every(r => selectedIds.has(r.proposalArtifactId));
  const aggregatedMissingFields = useMemo(
    () => aggregateMissingProductImportFields(workbench?.rows ?? []),
    [workbench?.rows]
  );
  const missingFieldsLabel = useMemo(
    () => formatMissingFieldLabels(aggregatedMissingFields, t, locale),
    [aggregatedMissingFields, locale, t]
  );
  const rowsWithMissingFields = rowStats.needsFixCount;

  const openAssistant = () => setAssistantOpen(true);

  const showFilterTabs = rowStats.all > 1;
  const showMobileToolbarSummary = rowStats.all > 1 || workbench?.skillRun.status === 'running';

  const hideGoFixAction = useMemo(() => {
    if (!workbench?.rows.length || rowStats.all !== 1 || rowStats.needsFixCount !== 1) {
      return false;
    }
    const onlyRow = workbench.rows[0];
    return (
      getProductImportUserRowState(onlyRow) === 'needs_fix' &&
      expandedIds.has(onlyRow.proposalArtifactId)
    );
  }, [workbench?.rows, rowStats.all, rowStats.needsFixCount, expandedIds]);

  const hasExpandedEditor = useMemo(
    () =>
      workbench?.rows.some(
        row =>
          expandedIds.has(row.proposalArtifactId) &&
          (getProductImportUserRowState(row) === 'needs_fix' ||
            getProductImportUserRowState(row) === 'ready')
      ) ?? false,
    [expandedIds, workbench?.rows]
  );

  const showMobileActionBar =
    workbench &&
    workbench.skillRun.status !== 'running' &&
    !showBatchBar &&
    !hasExpandedEditor &&
    (rowStats.readyCount > 0 || (rowStats.needsFixCount > 0 && !hideGoFixAction));

  const workbenchMain = (
    <div
      className={cn('space-y-3', showMobileActionBar && 'pb-4 md:pb-0')}
      data-testid="product-import-workbench-main"
    >
      {workbench && (
        <>
          <ImportWorkbenchToolbar
            running={workbench.skillRun.status === 'running'}
            needsFixCount={rowStats.needsFixCount}
            readyCount={rowStats.readyCount}
            appliedCount={rowStats.appliedCount}
            onApplyReady={() => void handleApplyAllReady()}
            onGoFixFirst={handleGoFixFirst}
            applying={primaryApplying || batchBusy}
            showMobileSummary={showMobileToolbarSummary}
            hideGoFixAction={hideGoFixAction}
          />

          {showFilterTabs && (
            <div
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label={t('admin.productImport.workbench.filterLabel')}
            >
              {USER_FILTERS.map(filter => (
                <Button
                  key={filter}
                  type="button"
                  size="sm"
                  variant={userFilter === filter ? 'default' : 'outline'}
                  className="h-8 shrink-0 gap-1 px-2.5 text-xs sm:px-3 sm:text-sm"
                  onClick={() => {
                    setUserFilter(filter);
                    setSelectedIds(new Set());
                  }}
                  role="tab"
                  aria-selected={userFilter === filter}
                  data-testid={`import-filter-${filter}`}
                >
                  {t(`admin.productImport.workbench.userFilter.${filter}`)}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                      userFilter === filter
                        ? 'bg-primary-foreground/15 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {filterCounts[filter]}
                  </span>
                </Button>
              ))}
            </div>
          )}

          {workbench.page.totalRows > workbench.page.returnedRows && (
            <p className="text-xs text-muted-foreground">
              {t('admin.productImport.workbench.pageScopeHint')}
            </p>
          )}

          {visibleRows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {t('admin.productImport.workbench.emptyRows')}
            </Card>
          ) : (
            <Card className="overflow-hidden" data-testid="import-mobile-row-list">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-2.5 md:px-4">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  {workbench.sources.length > 0 && (
                    <>
                      <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="font-medium text-foreground">
                        {t('admin.productImport.workbench.sources')}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {workbench.sources
                          .map(source => source.sourceName || source.artifactId)
                          .join(' · ')}
                      </span>
                    </>
                  )}
                </div>
                {visibleRows.length > 1 && (
                  <label
                    htmlFor="import-select-all"
                    className="hidden cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
                  >
                    <Checkbox
                      id="import-select-all"
                      checked={allPageSelected}
                      onCheckedChange={() => toggleSelectAll()}
                      aria-label={t('admin.productImport.workbench.selectAll')}
                    />
                    {t('admin.productImport.workbench.selectAll')}
                  </label>
                )}
              </div>

              {visibleRows.map(row => (
                <ImportWorkbenchRow
                  key={row.proposalArtifactId}
                  row={row}
                  source={
                    row.sourceArtifactId
                      ? sourceByArtifactId.get(row.sourceArtifactId)
                      : workbench.sources[0]
                  }
                  expanded={expandedIds.has(row.proposalArtifactId)}
                  selected={selectedIds.has(row.proposalArtifactId)}
                  showCheckbox={visibleRows.length > 1}
                  onToggleSelect={() => toggleRow(row.proposalArtifactId)}
                  onToggleExpanded={() => toggleExpanded(row.proposalArtifactId)}
                  onRefresh={() => void refresh()}
                  onAskAi={openAssistant}
                />
              ))}
            </Card>
          )}

          {validationMessages.length > 0 && <ImportValidationNotes messages={validationMessages} />}

          {showBatchBar && (
            <div className="fixed inset-x-0 bottom-20 z-30 flex flex-wrap items-center gap-2 border-t border-border bg-card px-4 py-3 shadow-lg md:sticky md:bottom-4 md:inset-x-auto md:rounded-xl md:border md:p-3">
              <span className="mr-auto text-sm font-medium text-foreground">
                {t('admin.productImport.workbench.selectedCount', { count: selectedIds.size })}
              </span>
              <Button
                type="button"
                size="sm"
                className="min-h-10"
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
                className="min-h-10"
                disabled={batchBusy}
                onClick={() => void handleBatchReject()}
                data-testid="import-batch-reject"
              >
                {t('admin.productImport.workbench.batchReject')}
              </Button>
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
              {(canPrevPage || canNextPage) && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-10"
                    disabled={!canPrevPage || loading}
                    onClick={prevPage}
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-10"
                    disabled={!canNextPage || loading}
                    onClick={nextPage}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {rowStats.appliedCount > 0 && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-success/30 bg-success/10 p-4">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <PackageCheck className="h-5 w-5 text-success" />
                {t('admin.productImport.workbench.appliedSummary', {
                  count: rowStats.appliedCount,
                })}
              </div>
              <Button asChild variant="outline" className="min-h-10 bg-card">
                <Link href="/admin/products">
                  {t('admin.productImport.workbench.goToProducts')}
                </Link>
              </Button>
            </Card>
          )}

          {showMobileActionBar && (
            <ImportMobileActionBar
              needsFixCount={rowStats.needsFixCount}
              readyCount={rowStats.readyCount}
              applying={primaryApplying}
              batchBusy={batchBusy}
              showBatchBar={showBatchBar}
              running={workbench.skillRun.status === 'running'}
              hideGoFixAction={hideGoFixAction}
              onApplyReady={() => void handleApplyAllReady()}
              onGoFixFirst={handleGoFixFirst}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'mx-auto max-w-[1280px] space-y-4 p-4 md:p-5',
        showMobileActionBar && 'pb-24 md:pb-5'
      )}
      data-testid="product-import-workbench"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href="/admin/products/import"
            className="mb-2 inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:mb-3 md:min-h-11"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.productImport.workbench.backToHub')}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              {t('admin.productImport.workbench.title')}
            </h1>
            {workbench && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                {runStatusLabel(workbench.skillRun.status, t)}
                {workbench.skillRun.status === 'running' && (
                  <Loader2 className="ml-1.5 h-3 w-3 animate-spin" />
                )}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('admin.productImport.workbench.subtitle', {
              count: workbench?.page.totalRows ?? workbench?.rows.length ?? 0,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 shrink-0"
          disabled={loading}
          onClick={() => void refresh()}
          aria-label={t('common.refresh')}
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin', 'md:mr-1.5')} />
          <span className="hidden md:inline">{t('common.refresh')}</span>
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
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start xl:gap-5">
          <section className="min-w-0">{workbenchMain}</section>
          <aside className="mt-4 space-y-4 xl:sticky xl:top-4 xl:mt-0">
            <Card className="p-3 md:p-4" data-testid="import-assistant-summary">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:h-10 md:w-10">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-foreground md:text-base">
                    {t('admin.productImport.workbench.assistantTitle')}
                  </h2>
                  <p className="mt-1 hidden text-sm leading-6 text-muted-foreground md:block">
                    {workbench?.skillRun.status === 'running'
                      ? t('admin.productImport.workbench.assistantProcessing')
                      : aggregatedMissingFields.length > 0
                        ? t('admin.productImport.workbench.assistantNeedsReview', {
                            rows: rowsWithMissingFields,
                            fieldsLabel: missingFieldsLabel,
                          })
                        : t('admin.productImport.workbench.assistantReady', {
                            count: rowStats.readyCount,
                          })}
                  </p>
                </div>
              </div>

              <div className="mt-3 hidden rounded-lg bg-muted/50 p-3 md:block">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('admin.productImport.workbench.assistantNextStep')}
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {rowStats.needsFixCount > 0
                    ? t('admin.productImport.workbench.assistantCheckMissing', {
                        fields: missingFieldsLabel,
                      })
                    : rowStats.readyCount > 0
                      ? t('admin.productImport.workbench.assistantApplyReady', {
                          count: rowStats.readyCount,
                        })
                      : t('admin.productImport.workbench.assistantCheckRows')}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-10 w-full gap-2 md:mt-4"
                disabled={aiStatusLoading || !aiAvailable}
                onClick={() => setAssistantOpen(open => !open)}
                aria-expanded={assistantOpen}
                data-testid="import-assistant-toggle"
              >
                {assistantOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                {aiStatusLoading
                  ? t('common.loading')
                  : !aiAvailable
                    ? t('admin.productImport.workbench.assistantUnavailable')
                    : assistantOpen
                      ? t('admin.productImport.workbench.assistantCloseChat')
                      : t('admin.productImport.workbench.assistantOpenChat')}
              </Button>
            </Card>

            {assistantOpen && (
              <AIChatPanel
                variant="inline"
                aiAvailable={aiAvailable}
                aiStatusLoading={aiStatusLoading}
                setupPromptVariant="minimal"
                onClose={() => setAssistantOpen(false)}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
