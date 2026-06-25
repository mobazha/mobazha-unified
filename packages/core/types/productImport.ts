/** Product import skill run status from /v1/agent/product-import/*. */
export type ProductImportSkillRunStatus =
  | 'running'
  | 'waiting_for_review'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ProductImportSkillRunRaw {
  id: string;
  tenant_id?: string;
  thread_id?: string;
  skill_id?: string;
  store_id?: string;
  status: ProductImportSkillRunStatus | string;
  started_at?: string;
  updated_at?: string;
}

export interface ProductImportArtifactRaw {
  id: string;
  tenant_id?: string;
  skill_run_id?: string;
  skill_id?: string;
  kind?: string;
  status?: string;
  name?: string;
  content_type?: string;
  source_name?: string;
  summary?: string;
  data?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImportIngestResultRaw {
  skillRun: ProductImportSkillRunRaw;
  sourceArtifacts: ProductImportArtifactRaw[];
  candidateArtifacts: ProductImportArtifactRaw[];
  proposalArtifacts: ProductImportArtifactRaw[];
  validationArtifacts?: ProductImportArtifactRaw[];
}

export interface ProductImportSkillRun {
  id: string;
  tenantId?: string;
  threadId?: string;
  skillId?: string;
  storeId?: string;
  status: string;
  startedAt?: string;
  updatedAt?: string;
}

export interface ProductImportArtifact {
  id: string;
  tenantId?: string;
  skillRunId?: string;
  skillId?: string;
  kind?: string;
  status?: string;
  name?: string;
  contentType?: string;
  sourceName?: string;
  summary?: string;
  data?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImportIngestResult {
  skillRun: ProductImportSkillRun;
  sourceArtifacts: ProductImportArtifact[];
  candidateArtifacts: ProductImportArtifact[];
  proposalArtifacts: ProductImportArtifact[];
  validationArtifacts: ProductImportArtifact[];
}

export interface ProductImportDraftPrice {
  amountMinor?: number;
  currencyCode?: string;
  divisibility?: number;
}

export interface ProductImportDraft {
  title?: string;
  description?: string;
  price?: ProductImportDraftPrice;
  inventory?: { quantity?: number };
}

export interface ProductImportRowApproval {
  id: string;
  status: string;
  action: string;
  requestHash: string;
}

export interface ProductImportWorkbenchRow {
  proposalArtifactId: string;
  candidateArtifactId?: string;
  sourceArtifactId?: string;
  sourceName?: string;
  rowNumber?: number;
  status: string;
  draft?: ProductImportDraft;
  fieldSources?: Record<string, unknown>;
  validation?: unknown[];
  approval?: ProductImportRowApproval;
  updatedAt?: string;
}

export interface ProductImportWorkbenchSource {
  artifactId: string;
  sourceName?: string;
  contentType?: string;
  status: string;
  summary?: string;
}

export interface ProductImportWorkbenchValidation {
  artifactId: string;
  sourceName?: string;
  status: string;
  data?: Record<string, unknown>;
}

export interface ProductImportWorkbench {
  skillRun: ProductImportSkillRun;
  sources: ProductImportWorkbenchSource[];
  rows: ProductImportWorkbenchRow[];
  validationReports: ProductImportWorkbenchValidation[];
  counts: Record<string, number>;
}
