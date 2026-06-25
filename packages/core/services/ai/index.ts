export { aiService, AiServiceError } from './aiService';
export type { AiAction, AiGenerateRequest, AiGenerateResponse } from './aiService';

export {
  sendChatMessage,
  listChatSessions,
  getChatSession,
  deleteChatSession,
} from './chatService';
export type {
  ChatMessage,
  ChatSession,
  ChatSSEEvent,
  ChatStreamCallbacks,
  ToolCallInfo,
  ChatContext,
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
export {
  createSourceMaterialArtifact,
  getAgentArtifact,
  normalizeAgentArtifactRecord,
} from './artifactService';
export type {
  AgentApproval,
  AgentApprovalListParams,
  AgentApprovalRecord,
  AgentApprovalRecordRaw,
  AgentApprovalRequest,
  AgentApprovalStatus,
  ApprovalRequiredPayload,
} from '../../types/agentApproval';
export type {
  AgentArtifactRecord,
  AgentArtifactRecordRaw,
  AttachArtifactResult,
  AttachedChatArtifact,
  CreateSourceMaterialArtifactInput,
} from '../../types/agentArtifact';
export { MAX_ATTACHED_CHAT_ARTIFACTS } from '../../types/agentArtifact';
export {
  ingestProductImport,
  getProductImportWorkbench,
  createProductImportProposalApproval,
  normalizeProductImportIngestResult,
  normalizeProductImportArtifact,
  normalizeProductImportWorkbench,
  formatProductImportDraftPrice,
  productImportDraftQuantity,
} from './productImportService';
export type { IngestProductImportOptions } from './productImportService';
export type {
  ProductImportIngestResult,
  ProductImportWorkbench,
  ProductImportWorkbenchRow,
  ProductImportWorkbenchSource,
  ProductImportDraft,
  ProductImportDraftPrice,
} from '../../types/productImport';
