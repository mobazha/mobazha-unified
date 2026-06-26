/** Raw REST record from /v1/agent/artifacts* (snake_case). */
export interface AgentArtifactRecordRaw {
  id: string;
  tenant_id: string;
  thread_id?: string;
  turn_id?: string;
  skill_run_id?: string;
  skill_id?: string;
  kind: string;
  status: string;
  name?: string;
  content_type?: string;
  source_uri?: string;
  source_name?: string;
  source_hash?: string;
  summary?: string;
  data?: string;
  created_at?: string;
  updated_at?: string;
}

/** Normalized artifact record for UI (camelCase). */
export interface AgentArtifactRecord {
  id: string;
  tenantId: string;
  threadId?: string;
  turnId?: string;
  skillRunId?: string;
  skillId?: string;
  kind: string;
  status: string;
  name?: string;
  contentType?: string;
  sourceUri?: string;
  sourceName?: string;
  sourceHash?: string;
  summary?: string;
  data?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSourceMaterialArtifactInput {
  text: string;
  name?: string;
  summary?: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

export interface AttachedChatArtifact {
  id: string;
  name: string;
  summary?: string;
}

/** Max artifacts included on a single chat message (matches node agentChatMaxContextArtifacts). */
export const MAX_ATTACHED_CHAT_ARTIFACTS = 10;

export interface AttachedChatSkillRun {
  id: string;
  label: string;
  skillId?: string;
}

/** Max skill runs included on a single chat message (matches node agentChatMaxContextSkillRuns). */
export const MAX_ATTACHED_CHAT_SKILL_RUNS = 3;

export type AttachArtifactResult = 'attached' | 'duplicate' | 'max_reached';
export type AttachSkillRunResult = 'attached' | 'duplicate' | 'max_reached';
