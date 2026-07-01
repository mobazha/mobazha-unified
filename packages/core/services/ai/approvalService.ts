import { NODE_API } from '../../config/apiPaths';
import type {
  AgentApprovalListParams,
  AgentApprovalRecord,
  AgentApprovalRecordRaw,
  ApprovalRequiredPayload,
} from '../../types/agentApproval';
import { nodeAuthGet, nodeAuthPost } from '../api/helpers';

function buildApprovalsPath(params?: AgentApprovalListParams): string {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const query = q.toString();
  return query ? `${NODE_API.AGENT_APPROVALS}?${query}` : NODE_API.AGENT_APPROVALS;
}

export function normalizeAgentApprovalRecord(raw: AgentApprovalRecordRaw): AgentApprovalRecord {
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    threadId: raw.thread_id,
    turnId: raw.turn_id,
    toolCallId: raw.tool_call_id,
    skillId: raw.skill_id,
    storeId: raw.store_id,
    action: raw.action,
    summary: raw.summary,
    requestHash: raw.request_hash,
    risk: raw.risk,
    payload: raw.payload,
    idempotencyKey: raw.idempotency_key,
    status: raw.status,
    decisionBy: raw.decision_by,
    decisionAt: raw.decision_at,
    appliedAt: raw.applied_at,
    applyError: raw.apply_error,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export async function listAgentApprovals(
  params?: AgentApprovalListParams
): Promise<AgentApprovalRecord[]> {
  const data = await nodeAuthGet<AgentApprovalRecordRaw[]>(buildApprovalsPath(params));
  return (data || []).map(normalizeAgentApprovalRecord);
}

export async function getAgentApproval(approvalId: string): Promise<AgentApprovalRecord> {
  const data = await nodeAuthGet<AgentApprovalRecordRaw>(
    NODE_API.AGENT_APPROVALS_BY_APPROVAL_ID(approvalId)
  );
  return normalizeAgentApprovalRecord(data);
}

export async function decideAgentApproval(
  approvalId: string,
  decision: 'approved' | 'rejected'
): Promise<AgentApprovalRecord> {
  const data = await nodeAuthPost<AgentApprovalRecordRaw>(
    NODE_API.AGENT_APPROVALS_DECISION(approvalId),
    { decision }
  );
  return normalizeAgentApprovalRecord(data);
}

export async function applyAgentApproval(approvalId: string): Promise<AgentApprovalRecord> {
  const data = await nodeAuthPost<AgentApprovalRecordRaw>(
    NODE_API.AGENT_APPROVALS_APPLY(approvalId)
  );
  return normalizeAgentApprovalRecord(data);
}

/** Approve then apply in one step for Workspace UX. */
export async function approveAndApplyAgentApproval(
  approvalId: string
): Promise<AgentApprovalRecord> {
  const approved = await decideAgentApproval(approvalId, 'approved');
  if (approved.status === 'applied') {
    return approved;
  }
  return applyAgentApproval(approvalId);
}

export function parseApprovalRequiredResult(result: unknown): ApprovalRequiredPayload | null {
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  if (record.status !== 'approval_required') return null;
  const approval = record.approval;
  if (!approval || typeof approval !== 'object') return null;
  const req = approval as Record<string, unknown>;
  if (typeof req.id !== 'string' || typeof req.action !== 'string') return null;
  return {
    status: 'approval_required',
    message: typeof record.message === 'string' ? record.message : '',
    approval: {
      id: req.id,
      skillId: typeof req.skillId === 'string' ? req.skillId : undefined,
      action: req.action,
      summary: typeof req.summary === 'string' ? req.summary : req.action,
      requestHash: typeof req.requestHash === 'string' ? req.requestHash : '',
      risk: typeof req.risk === 'string' ? req.risk : undefined,
      payload: typeof req.payload === 'string' ? req.payload : undefined,
      idempotencyKey: typeof req.idempotencyKey === 'string' ? req.idempotencyKey : undefined,
      createdAt: typeof req.createdAt === 'string' ? req.createdAt : undefined,
    },
  };
}
