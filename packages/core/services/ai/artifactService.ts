import { NODE_API } from '../../config/apiPaths';
import type {
  AgentArtifactRecord,
  AgentArtifactRecordRaw,
  CreateSourceMaterialArtifactInput,
  CreateStagingFileArtifactInput,
} from '../../types/agentArtifact';
import { nodeAuthGet, nodeAuthPost } from '../api/helpers';
import type { ChatAttachment } from './chatService';

const MAX_STAGING_FILE_BYTES = 2 * 1024 * 1024;
/** Matches node agentChatAttachmentTextMaxLen */
export const MAX_CHAT_ATTACHMENT_TEXT_LEN = 1200;

const TEXT_READABLE_FILE_PATTERN = /\.(txt|md|json|csv)$/i;

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

function isStagingTextReadableFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.startsWith('text/')) return true;
  if (type === 'application/json') return true;
  return TEXT_READABLE_FILE_PATTERN.test(file.name);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function buildTextChatAttachment(name: string, text: string): ChatAttachment {
  return {
    name,
    contentType: 'text/plain',
    text: text.slice(0, MAX_CHAT_ATTACHMENT_TEXT_LEN),
  };
}

export interface StageFileForAgentChatResult {
  artifact: AgentArtifactRecord;
  attachment: ChatAttachment;
}

/** Stage a file artifact and build turn-level attachment metadata for agent chat. */
export async function stageFileForAgentChat(
  input: CreateStagingFileArtifactInput
): Promise<StageFileForAgentChatResult> {
  const { file } = input;
  if (file.size > MAX_STAGING_FILE_BYTES) {
    throw new Error('file_too_large');
  }

  const metadata = {
    source: 'workspace_file_staging',
    fileName: file.name,
    contentType: file.type,
    staging: true,
    ...input.metadata,
  };

  if (isStagingTextReadableFile(file)) {
    const text = await file.text();
    const artifact = await createSourceMaterialArtifact({
      text,
      name: file.name,
      summary: file.name,
      threadId: input.threadId,
      metadata,
    });
    return {
      artifact,
      attachment: {
        ...buildTextChatAttachment(file.name, text),
        id: artifact.id,
        size: file.size,
      },
    };
  }

  const contentBase64 = await fileToBase64(file);
  const contentType = file.type || 'application/octet-stream';
  const data = await nodeAuthPost<AgentArtifactRecordRaw>(NODE_API.AGENT_ARTIFACTS, {
    ...(input.threadId ? { threadId: input.threadId } : {}),
    name: file.name,
    sourceName: file.name,
    contentType,
    summary: file.name,
    data: {
      contentBase64,
      fileName: file.name,
      contentType,
      staging: true,
    },
    metadata,
  });
  const artifact = normalizeAgentArtifactRecord(data);
  return {
    artifact,
    attachment: {
      id: artifact.id,
      name: file.name,
      contentType,
      size: file.size,
      contentBase64,
    },
  };
}

/** Stage a chat attachment for agent context (text inline, binary as base64 in artifact data). */
export async function createStagingFileArtifact(
  input: CreateStagingFileArtifactInput
): Promise<AgentArtifactRecord> {
  const { artifact } = await stageFileForAgentChat(input);
  return artifact;
}

function defaultSourceMaterialSummary(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117)}...`;
}
