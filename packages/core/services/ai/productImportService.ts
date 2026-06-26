import { NODE_API } from '../../config/apiPaths';
import type {
  ProductImportArtifact,
  ProductImportArtifactRaw,
  ProductImportAdvanceCounts,
  ProductImportAdvanceNextAction,
  ProductImportAdvanceRequest,
  ProductImportAdvanceResult,
  ProductImportAdvanceSkippedArtifact,
  ProductImportApprovalActionBatchResult,
  ProductImportApprovalActionItem,
  ProductImportApprovalBatchResult,
  ProductImportApprovalBatchSkip,
  ProductImportDraft,
  ProductImportDraftPrice,
  ProductImportIngestResult,
  ProductImportIngestResultRaw,
  ProductImportSkillRun,
  ProductImportSkillRunRaw,
  ProductImportWorkbench,
  ProductImportWorkbenchPage,
  ProductImportWorkbenchQuery,
  ProductImportWorkbenchRow,
  ProductImportWorkbenchSource,
  ProductImportWorkbenchSummary,
  ProductImportWorkbenchValidation,
} from '../../types/productImport';
import type { AgentApprovalRecord, AgentApprovalRecordRaw } from '../../types/agentApproval';
import { nodeAuthGet, nodeAuthPost, nodeAuthRequest } from '../api/helpers';
import { normalizeAgentApprovalRecord } from './approvalService';

const MAX_IMPORT_FILES = 20;
const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

const EMPTY_WORKBENCH_SUMMARY: ProductImportWorkbenchSummary = {
  noApprovalCount: 0,
  pendingApprovalCount: 0,
  approvedCount: 0,
  applyingCount: 0,
  appliedCount: 0,
  rejectedCount: 0,
  applyFailedCount: 0,
  reviewableCount: 0,
  skippedCount: 0,
  actionableCount: 0,
};

const EMPTY_WORKBENCH_PAGE: ProductImportWorkbenchPage = {
  offset: 0,
  totalRows: 0,
  returnedRows: 0,
};

function normalizeSkillRun(raw: ProductImportSkillRunRaw): ProductImportSkillRun {
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    threadId: raw.thread_id,
    skillId: raw.skill_id,
    storeId: raw.store_id,
    status: raw.status,
    startedAt: raw.started_at,
    updatedAt: raw.updated_at,
  };
}

export function normalizeProductImportArtifact(
  raw: ProductImportArtifactRaw
): ProductImportArtifact {
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    skillRunId: raw.skill_run_id,
    skillId: raw.skill_id,
    kind: raw.kind,
    status: raw.status,
    name: raw.name,
    contentType: raw.content_type,
    sourceName: raw.source_name,
    summary: raw.summary,
    data: raw.data,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function normalizeProductImportIngestResult(
  raw: ProductImportIngestResultRaw
): ProductImportIngestResult {
  return {
    skillRun: normalizeSkillRun(raw.skillRun),
    sourceArtifacts: (raw.sourceArtifacts || []).map(normalizeProductImportArtifact),
    candidateArtifacts: (raw.candidateArtifacts || []).map(normalizeProductImportArtifact),
    proposalArtifacts: (raw.proposalArtifacts || []).map(normalizeProductImportArtifact),
    validationArtifacts: (raw.validationArtifacts || []).map(normalizeProductImportArtifact),
  };
}

function normalizeWorkbenchSource(raw: ProductImportWorkbenchSource): ProductImportWorkbenchSource {
  return {
    artifactId: raw.artifactId,
    sourceName: raw.sourceName,
    contentType: raw.contentType,
    status: raw.status,
    summary: raw.summary,
  };
}

function normalizeWorkbenchRow(raw: ProductImportWorkbenchRow): ProductImportWorkbenchRow {
  return {
    proposalArtifactId: raw.proposalArtifactId,
    candidateArtifactId: raw.candidateArtifactId,
    sourceArtifactId: raw.sourceArtifactId,
    sourceName: raw.sourceName,
    rowNumber: raw.rowNumber,
    status: raw.status,
    draft: raw.draft,
    fieldSources: raw.fieldSources,
    validation: raw.validation,
    approval: raw.approval,
    updatedAt: raw.updatedAt,
  };
}

function normalizeWorkbenchValidation(
  raw: ProductImportWorkbenchValidation
): ProductImportWorkbenchValidation {
  return {
    artifactId: raw.artifactId,
    sourceName: raw.sourceName,
    status: raw.status,
    data: raw.data,
  };
}

function normalizeWorkbenchSummary(
  raw?: Partial<ProductImportWorkbenchSummary>
): ProductImportWorkbenchSummary {
  if (!raw) return { ...EMPTY_WORKBENCH_SUMMARY };
  return {
    noApprovalCount: raw.noApprovalCount ?? 0,
    pendingApprovalCount: raw.pendingApprovalCount ?? 0,
    approvedCount: raw.approvedCount ?? 0,
    applyingCount: raw.applyingCount ?? 0,
    appliedCount: raw.appliedCount ?? 0,
    rejectedCount: raw.rejectedCount ?? 0,
    applyFailedCount: raw.applyFailedCount ?? 0,
    reviewableCount: raw.reviewableCount ?? 0,
    skippedCount: raw.skippedCount ?? 0,
    actionableCount: raw.actionableCount ?? 0,
  };
}

function normalizeWorkbenchPage(
  raw?: Partial<ProductImportWorkbenchPage>
): ProductImportWorkbenchPage {
  if (!raw) return { ...EMPTY_WORKBENCH_PAGE };
  return {
    limit: raw.limit,
    offset: raw.offset ?? 0,
    totalRows: raw.totalRows ?? 0,
    returnedRows: raw.returnedRows ?? 0,
    status: raw.status,
  };
}

function normalizeApprovalBatchSkip(
  raw: ProductImportApprovalBatchSkip
): ProductImportApprovalBatchSkip {
  return {
    proposalArtifactId: raw.proposalArtifactId,
    approvalId: raw.approvalId,
    reason: raw.reason ?? '',
  };
}

function normalizeApprovalBatchResult(
  raw: Partial<ProductImportApprovalBatchResult>
): ProductImportApprovalBatchResult {
  return {
    created: raw.created ?? 0,
    reused: raw.reused ?? 0,
    skipped: (raw.skipped ?? []).map(normalizeApprovalBatchSkip),
    page: {
      totalProposals: raw.page?.totalProposals ?? 0,
      selected: raw.page?.selected ?? 0,
    },
  };
}

function normalizeApprovalActionItem(
  raw: ProductImportApprovalActionItem
): ProductImportApprovalActionItem {
  return {
    approvalId: raw.approvalId,
    status: raw.status,
    result: raw.result,
    reason: raw.reason,
  };
}

function normalizeApprovalActionBatchResult(
  raw: Partial<ProductImportApprovalActionBatchResult>
): ProductImportApprovalActionBatchResult {
  return {
    processed: raw.processed ?? 0,
    failed: raw.failed,
    skipped: (raw.skipped ?? []).map(normalizeApprovalBatchSkip),
    items: (raw.items ?? []).map(normalizeApprovalActionItem),
    page: { selected: raw.page?.selected ?? 0 },
  };
}

function normalizeAdvanceCounts(
  raw?: Partial<ProductImportAdvanceCounts>
): ProductImportAdvanceCounts {
  return {
    sourceCount: raw?.sourceCount ?? 0,
    candidateCount: raw?.candidateCount ?? 0,
    proposalCount: raw?.proposalCount ?? 0,
    validationCount: raw?.validationCount ?? 0,
    pendingAIExtractionCount: raw?.pendingAIExtractionCount ?? 0,
    createdProposalCount: raw?.createdProposalCount ?? 0,
    createdValidationCount: raw?.createdValidationCount ?? 0,
  };
}

function normalizeAdvanceNextAction(
  raw: ProductImportAdvanceNextAction
): ProductImportAdvanceNextAction {
  return {
    type: raw.type,
    sourceArtifactId: raw.sourceArtifactId,
    candidateArtifactId: raw.candidateArtifactId,
    message: raw.message,
  };
}

function normalizeAdvanceSkipped(
  raw: ProductImportAdvanceSkippedArtifact
): ProductImportAdvanceSkippedArtifact {
  return {
    artifactId: raw.artifactId,
    reason: raw.reason ?? '',
  };
}

export function normalizeProductImportAdvanceResult(raw: {
  skillRun: ProductImportSkillRunRaw;
  workbench?: Parameters<typeof normalizeProductImportWorkbench>[0];
  createdProposalArtifacts?: ProductImportArtifactRaw[];
  createdValidationReports?: ProductImportArtifactRaw[];
  approvalResult?: Partial<ProductImportApprovalBatchResult>;
  nextActions?: ProductImportAdvanceNextAction[];
  counts?: Partial<ProductImportAdvanceCounts>;
  skipped?: ProductImportAdvanceSkippedArtifact[];
}): ProductImportAdvanceResult {
  return {
    skillRun: normalizeSkillRun(raw.skillRun),
    workbench: raw.workbench ? normalizeProductImportWorkbench(raw.workbench) : undefined,
    createdProposalArtifacts: (raw.createdProposalArtifacts ?? []).map(
      normalizeProductImportArtifact
    ),
    createdValidationReports: (raw.createdValidationReports ?? []).map(
      normalizeProductImportArtifact
    ),
    approvalResult: raw.approvalResult
      ? normalizeApprovalBatchResult(raw.approvalResult)
      : undefined,
    nextActions: (raw.nextActions ?? []).map(normalizeAdvanceNextAction),
    counts: normalizeAdvanceCounts(raw.counts),
    skipped: (raw.skipped ?? []).map(normalizeAdvanceSkipped),
  };
}

export function normalizeProductImportWorkbench(raw: {
  skillRun: ProductImportSkillRunRaw;
  sources?: ProductImportWorkbenchSource[];
  rows?: ProductImportWorkbenchRow[];
  validationReports?: ProductImportWorkbenchValidation[];
  counts?: Record<string, number>;
  summary?: Partial<ProductImportWorkbenchSummary>;
  page?: Partial<ProductImportWorkbenchPage>;
}): ProductImportWorkbench {
  return {
    skillRun: normalizeSkillRun(raw.skillRun),
    sources: (raw.sources || []).map(normalizeWorkbenchSource),
    rows: (raw.rows || []).map(normalizeWorkbenchRow),
    validationReports: (raw.validationReports || []).map(normalizeWorkbenchValidation),
    counts: raw.counts || {},
    summary: normalizeWorkbenchSummary(raw.summary),
    page: normalizeWorkbenchPage(raw.page),
  };
}

function buildWorkbenchPath(runId: string, query: ProductImportWorkbenchQuery = {}): string {
  const base = NODE_API.AGENT_PRODUCT_IMPORT_RUNS_WORKBENCH(runId);
  const params = new URLSearchParams();
  if (query.limit != null && query.limit > 0) {
    params.set('limit', String(query.limit));
  }
  if (query.offset != null && query.offset > 0) {
    params.set('offset', String(query.offset));
  }
  if (query.status?.trim()) {
    params.set('status', query.status.trim());
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Format draft price (minor units) for workbench display. */
export function formatProductImportDraftPrice(draft?: ProductImportDraft): string {
  const price = draft?.price;
  if (!price || price.amountMinor == null) return '—';
  const divisibility = price.divisibility ?? 2;
  const currency = price.currencyCode || 'USD';
  const major = price.amountMinor / 10 ** divisibility;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: divisibility,
      maximumFractionDigits: divisibility,
    }).format(major);
  } catch {
    return `${major.toFixed(divisibility)} ${currency}`;
  }
}

export function productImportDraftQuantity(draft?: ProductImportDraft): string {
  const qty = draft?.inventory?.quantity;
  if (qty == null) return '—';
  return String(qty);
}

export interface IngestProductImportOptions {
  threadId?: string;
  storeId?: string;
}

export async function ingestProductImport(
  files: File[],
  options: IngestProductImportOptions = {}
): Promise<ProductImportIngestResult> {
  if (!files.length) {
    throw new Error('At least one file is required');
  }
  if (files.length > MAX_IMPORT_FILES) {
    throw new Error(`Maximum ${MAX_IMPORT_FILES} files per import`);
  }
  for (const file of files) {
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      throw new Error(`${file.name} exceeds 2 MB limit`);
    }
  }

  const formData = new FormData();
  if (options.threadId?.trim()) {
    formData.append('threadId', options.threadId.trim());
  }
  if (options.storeId?.trim()) {
    formData.append('storeId', options.storeId.trim());
  }
  for (const file of files) {
    formData.append('file', file, file.name);
  }

  const raw = await nodeAuthRequest<ProductImportIngestResultRaw>(
    NODE_API.AGENT_PRODUCT_IMPORT_INGEST,
    { method: 'POST', body: formData }
  );
  return normalizeProductImportIngestResult(raw);
}

export async function getProductImportWorkbench(
  runId: string,
  query: ProductImportWorkbenchQuery = {}
): Promise<ProductImportWorkbench> {
  const raw = await nodeAuthGet<{
    skillRun: ProductImportSkillRunRaw;
    sources?: ProductImportWorkbenchSource[];
    rows?: ProductImportWorkbenchRow[];
    validationReports?: ProductImportWorkbenchValidation[];
    counts?: Record<string, number>;
    summary?: Partial<ProductImportWorkbenchSummary>;
    page?: Partial<ProductImportWorkbenchPage>;
  }>(buildWorkbenchPath(runId, query));
  return normalizeProductImportWorkbench(raw);
}

export async function createProductImportProposalApproval(
  artifactId: string
): Promise<AgentApprovalRecord> {
  const raw = await nodeAuthPost<AgentApprovalRecordRaw>(
    NODE_API.AGENT_ARTIFACTS_APPROVAL(artifactId)
  );
  return normalizeAgentApprovalRecord(raw);
}

export async function createProductImportRunApprovals(
  runId: string,
  proposalArtifactIds?: string[]
): Promise<ProductImportApprovalBatchResult> {
  const body =
    proposalArtifactIds && proposalArtifactIds.length > 0 ? { proposalArtifactIds } : undefined;
  const raw = await nodeAuthPost<Partial<ProductImportApprovalBatchResult>>(
    NODE_API.AGENT_PRODUCT_IMPORT_RUNS_APPROVALS(runId),
    body
  );
  return normalizeApprovalBatchResult(raw);
}

export async function decideProductImportRunApprovals(
  runId: string,
  options: { approvalIds?: string[]; decision: 'approved' | 'rejected' }
): Promise<ProductImportApprovalActionBatchResult> {
  const body: { approvalIds?: string[]; decision: string } = {
    decision: options.decision,
  };
  if (options.approvalIds && options.approvalIds.length > 0) {
    body.approvalIds = options.approvalIds;
  }
  const raw = await nodeAuthPost<Partial<ProductImportApprovalActionBatchResult>>(
    NODE_API.AGENT_PRODUCT_IMPORT_RUNS_APPROVAL_DECISIONS(runId),
    body
  );
  return normalizeApprovalActionBatchResult(raw);
}

export async function applyProductImportRunApprovals(
  runId: string,
  approvalIds?: string[]
): Promise<ProductImportApprovalActionBatchResult> {
  const body = approvalIds && approvalIds.length > 0 ? { approvalIds } : undefined;
  const raw = await nodeAuthPost<Partial<ProductImportApprovalActionBatchResult>>(
    NODE_API.AGENT_PRODUCT_IMPORT_RUNS_APPROVAL_APPLICATIONS(runId),
    body
  );
  return normalizeApprovalActionBatchResult(raw);
}

export async function advanceProductImportRun(
  runId: string,
  request: ProductImportAdvanceRequest = {}
): Promise<ProductImportAdvanceResult> {
  const body: ProductImportAdvanceRequest = {};
  if (request.sourceArtifactIds?.length) {
    body.sourceArtifactIds = request.sourceArtifactIds;
  }
  if (request.candidateArtifactIds?.length) {
    body.candidateArtifactIds = request.candidateArtifactIds;
  }
  if (request.createApprovals) {
    body.createApprovals = true;
  }
  const raw = await nodeAuthPost<{
    skillRun: ProductImportSkillRunRaw;
    workbench?: Parameters<typeof normalizeProductImportWorkbench>[0];
    createdProposalArtifacts?: ProductImportArtifactRaw[];
    createdValidationReports?: ProductImportArtifactRaw[];
    approvalResult?: Partial<ProductImportApprovalBatchResult>;
    nextActions?: ProductImportAdvanceNextAction[];
    counts?: Partial<ProductImportAdvanceCounts>;
    skipped?: ProductImportAdvanceSkippedArtifact[];
  }>(
    NODE_API.AGENT_PRODUCT_IMPORT_RUNS_ADVANCE(runId),
    Object.keys(body).length ? body : undefined
  );
  return normalizeProductImportAdvanceResult(raw);
}

export type { ProductImportDraftPrice, ProductImportAdvanceRequest };
