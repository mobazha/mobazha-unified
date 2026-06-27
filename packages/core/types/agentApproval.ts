/** Agent approval queue status. */
export type AgentApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'superseded'
  | 'applying'
  | 'applied'
  | 'apply_failed';

/** SSE / tool_result envelope fields (camelCase). */
export interface AgentApprovalRequest {
  id: string;
  skillId?: string;
  action: string;
  summary: string;
  requestHash: string;
  risk?: string;
  payload?: string;
  idempotencyKey?: string;
  createdAt?: string;
}

/** Tool result envelope when Runtime intercepts ApprovalExplicit tools. */
export interface ApprovalRequiredPayload {
  status: 'approval_required';
  message: string;
  approval: AgentApprovalRequest;
}

/** Raw REST record from /v1/agent/approvals* (snake_case). */
export interface AgentApprovalRecordRaw {
  id: string;
  tenant_id: string;
  thread_id?: string;
  turn_id?: string;
  tool_call_id?: string;
  skill_id?: string;
  store_id?: string;
  action: string;
  summary: string;
  request_hash: string;
  risk?: string;
  payload?: string;
  idempotency_key?: string;
  status: AgentApprovalStatus;
  decision_by?: string;
  decision_at?: string;
  applied_at?: string;
  apply_error?: string;
  created_at?: string;
  updated_at?: string;
}

/** Normalized approval record for UI and services (camelCase). */
export interface AgentApprovalRecord {
  id: string;
  tenantId: string;
  threadId?: string;
  turnId?: string;
  toolCallId?: string;
  skillId?: string;
  storeId?: string;
  action: string;
  summary: string;
  requestHash: string;
  risk?: string;
  payload?: string;
  idempotencyKey?: string;
  status: AgentApprovalStatus;
  decisionBy?: string;
  decisionAt?: string;
  appliedAt?: string;
  applyError?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** @deprecated Use AgentApprovalRecord */
export type AgentApproval = AgentApprovalRecord;

export interface AgentApprovalListParams {
  status?: AgentApprovalStatus | 'all';
  limit?: number;
  offset?: number;
}
