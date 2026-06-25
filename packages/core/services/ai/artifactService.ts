import { NODE_API } from '../../config/apiPaths';
import type {
  AgentArtifactRecord,
  AgentArtifactRecordRaw,
  CreateSourceMaterialArtifactInput,
} from '../../types/agentArtifact';
import { nodeAuthGet, nodeAuthPost } from '../api/helpers';

export function normalizeAgentArtifactRecord(raw: AgentArtifactRecordRaw): AgentArtifactRecord {
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    threadId: raw.thread_id,
    turnId: raw.turn_id,
    skillRunId: raw.skill_run_id,
    skillId: raw.skill_id,
    kind: raw.kind,
    status: raw.status,
    name: raw.name,
    contentType: raw.content_type,
    sourceUri: raw.source_uri,
    sourceName: raw.source_name,
    sourceHash: raw.source_hash,
    summary: raw.summary,
    data: raw.data,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export async function getAgentArtifact(artifactId: string): Promise<AgentArtifactRecord> {
  const data = await nodeAuthGet<AgentArtifactRecordRaw>(
    NODE_API.AGENT_ARTIFACTS_BY_ARTIFACT_ID(artifactId)
  );
  return normalizeAgentArtifactRecord(data);
}

export async function createSourceMaterialArtifact(
  input: CreateSourceMaterialArtifactInput
): Promise<AgentArtifactRecord> {
  const text = input.text.trim();
  if (!text) {
    throw new Error('Source material text is required');
  }
  const name = input.name?.trim() || defaultSourceMaterialName(text);
  const data = await nodeAuthPost<AgentArtifactRecordRaw>(NODE_API.AGENT_ARTIFACTS, {
    ...(input.threadId ? { threadId: input.threadId } : {}),
    name,
    summary: input.summary?.trim() || defaultSourceMaterialSummary(text),
    text,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
  return normalizeAgentArtifactRecord(data);
}

function defaultSourceMaterialName(text: string): string {
  const firstLine =
    text
      .split('\n')
      .find(line => line.trim())
      ?.trim() || 'Pasted material';
  if (firstLine.length <= 48) return firstLine;
  return `${firstLine.slice(0, 45)}...`;
}

function defaultSourceMaterialSummary(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117)}...`;
}
