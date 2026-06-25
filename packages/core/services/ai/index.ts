export { aiService, AiServiceError } from './aiService';
export type { AiAction, AiGenerateRequest, AiGenerateResponse } from './aiService';

export {
  sendChatMessage,
  listChatSessions,
  getChatSession,
  deleteChatSession,
} from './chatService';
export {
  listAgentApprovals,
  getAgentApproval,
  decideAgentApproval,
  applyAgentApproval,
  approveAndApplyAgentApproval,
  parseApprovalRequiredResult,
  normalizeAgentApprovalRecord,
} from './approvalService';
export type {
  ChatMessage,
  ChatSession,
  ChatSSEEvent,
  ChatStreamCallbacks,
  ToolCallInfo,
} from './chatService';
export type {
  AgentApproval,
  AgentApprovalListParams,
  AgentApprovalRecord,
  AgentApprovalRecordRaw,
  AgentApprovalRequest,
  AgentApprovalStatus,
  ApprovalRequiredPayload,
} from '../../types/agentApproval';
