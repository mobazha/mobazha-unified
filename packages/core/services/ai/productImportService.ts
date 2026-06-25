import { NODE_API } from '../../config/apiPaths';
import type {
  ProductImportArtifact,
  ProductImportArtifactRaw,
  ProductImportDraft,
  ProductImportDraftPrice,
  ProductImportIngestResult,
  ProductImportIngestResultRaw,
  ProductImportSkillRun,
  ProductImportSkillRunRaw,
  ProductImportWorkbench,
  ProductImportWorkbenchRow,
  ProductImportWorkbenchSource,
  ProductImportWorkbenchValidation,
} from '../../types/productImport';
import type { AgentApprovalRecord, AgentApprovalRecordRaw } from '../../types/agentApproval';
import { nodeAuthGet, nodeAuthPost, nodeAuthRequest } from '../api/helpers';
import { normalizeAgentApprovalRecord } from './approvalService';

const MAX_IMPORT_FILES = 20;
const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

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

export function normalizeProductImportWorkbench(raw: {
  skillRun: ProductImportSkillRunRaw;
  sources?: ProductImportWorkbenchSource[];
  rows?: ProductImportWorkbenchRow[];
  validationReports?: ProductImportWorkbenchValidation[];
  counts?: Record<string, number>;
}): ProductImportWorkbench {
  return {
    skillRun: normalizeSkillRun(raw.skillRun),
    sources: (raw.sources || []).map(normalizeWorkbenchSource),
    rows: (raw.rows || []).map(normalizeWorkbenchRow),
    validationReports: (raw.validationReports || []).map(normalizeWorkbenchValidation),
    counts: raw.counts || {},
  };
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

export async function getProductImportWorkbench(runId: string): Promise<ProductImportWorkbench> {
  const raw = await nodeAuthGet<{
    skillRun: ProductImportSkillRunRaw;
    sources?: ProductImportWorkbenchSource[];
    rows?: ProductImportWorkbenchRow[];
    validationReports?: ProductImportWorkbenchValidation[];
    counts?: Record<string, number>;
  }>(NODE_API.AGENT_PRODUCT_IMPORT_WORKBENCH(runId));
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

export type { ProductImportDraftPrice };
