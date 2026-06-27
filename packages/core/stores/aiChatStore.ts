/**
 * AI Chat Store — Zustand state for the AI assistant panel.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ChatMessage,
  ToolCallInfo,
  ChatSession,
  ChatContext,
  ChatTurnPayload,
} from '../services/ai/chatService';
import { sendChatMessage, listChatSessions, deleteChatSession } from '../services/ai/chatService';
import { extractProductImportRunId } from '../services/ai/productImportToolResult';
import type { SendMessageOptions } from '../services/ai/chatService';
import { parseApprovalRequiredResult } from '../services/ai/approvalService';
import {
  MAX_ATTACHED_CHAT_ARTIFACTS,
  MAX_ATTACHED_CHAT_SKILL_RUNS,
  type AttachArtifactResult,
  type AttachSkillRunResult,
  type AttachedChatArtifact,
  type AttachedChatSkillRun,
} from '../types/agentArtifact';

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${Date.now()}-${++msgCounter}`;
}

export function normalizeVisibleMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.reduce<ChatMessage[]>((visible, message) => {
    if (message.role !== 'user' && message.role !== 'assistant') {
      return visible;
    }

    const content = typeof message.content === 'string' ? message.content : '';
    if (message.role === 'assistant' && !content.trim()) {
      return visible;
    }

    visible.push({
      id: message.id || nextMsgId(),
      role: message.role,
      content,
      timestamp: message.timestamp,
    });
    return visible;
  }, []);
}

interface AIChatState {
  isOpen: boolean;
  isStreaming: boolean;
  messages: ChatMessage[];
  sessionId: string | undefined;
  sessions: ChatSession[];
  error: string | null;
  attachedArtifacts: AttachedChatArtifact[];
  attachedSkillRuns: AttachedChatSkillRun[];

  toggle: () => void;
  open: () => void;
  close: () => void;

  sendMessage: (text: string, context?: ChatContext, options?: SendMessageOptions) => Promise<void>;
  cancelStream: () => void;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  newChat: () => void;
  clearError: () => void;
  attachArtifact: (artifact: AttachedChatArtifact) => AttachArtifactResult;
  detachArtifact: (artifactId: string) => void;
  clearAttachedArtifacts: () => void;
  attachSkillRun: (skillRun: AttachedChatSkillRun) => AttachSkillRunResult;
  detachSkillRun: (skillRunId: string) => void;
  clearAttachedSkillRuns: () => void;
  updateToolApproval: (
    messageId: string,
    toolId: string,
    localStatus: 'approved' | 'rejected' | 'applied' | 'failed'
  ) => void;
}

let activeAbortController: AbortController | null = null;

export const useAIChatStore = create<AIChatState>()(
  devtools(
    (set, get) => ({
      isOpen: false,
      isStreaming: false,
      messages: [],
      sessionId: undefined,
      sessions: [],
      error: null,
      attachedArtifacts: [],
      attachedSkillRuns: [],

      toggle: () => set(s => ({ isOpen: !s.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      clearError: () => set({ error: null }),

      newChat: () =>
        set({
          messages: [],
          sessionId: undefined,
          error: null,
          attachedArtifacts: [],
          attachedSkillRuns: [],
        }),

      attachArtifact: artifact => {
        const state = get();
        if (state.attachedArtifacts.some(item => item.id === artifact.id)) {
          return 'duplicate';
        }
        if (state.attachedArtifacts.length >= MAX_ATTACHED_CHAT_ARTIFACTS) {
          return 'max_reached';
        }
        set({
          attachedArtifacts: [...state.attachedArtifacts, artifact],
          error: null,
        });
        return 'attached';
      },

      detachArtifact: artifactId =>
        set(s => ({
          attachedArtifacts: s.attachedArtifacts.filter(item => item.id !== artifactId),
        })),

      clearAttachedArtifacts: () => set({ attachedArtifacts: [] }),

      attachSkillRun: skillRun => {
        const state = get();
        if (state.attachedSkillRuns.some(item => item.id === skillRun.id)) {
          return 'duplicate';
        }
        if (state.attachedSkillRuns.length >= MAX_ATTACHED_CHAT_SKILL_RUNS) {
          return 'max_reached';
        }
        set({
          attachedSkillRuns: [...state.attachedSkillRuns, skillRun],
          error: null,
        });
        return 'attached';
      },

      detachSkillRun: skillRunId =>
        set(s => ({
          attachedSkillRuns: s.attachedSkillRuns.filter(item => item.id !== skillRunId),
        })),

      clearAttachedSkillRuns: () => set({ attachedSkillRuns: [] }),

      cancelStream: () => {
        if (activeAbortController) {
          activeAbortController.abort();
          activeAbortController = null;
        }
        set({ isStreaming: false });
      },

      sendMessage: async (text: string, context?: ChatContext, options?: SendMessageOptions) => {
        const turn: ChatTurnPayload | undefined = options?.turn;
        const userMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
          ...(turn?.display.length ? { attachmentDisplay: turn.display } : {}),
        };

        set(s => ({
          messages: [...s.messages, userMsg],
          isStreaming: true,
          error: null,
        }));

        let assistantContent = '';
        const assistantMsgId = nextMsgId();
        const toolCalls = new Map<string, ToolCallInfo>();

        const abortController = new AbortController();
        activeAbortController = abortController;

        try {
          const attachedArtifacts = get().attachedArtifacts;
          const attachedArtifactIds = turn?.artifactIds ?? attachedArtifacts.map(item => item.id);
          const attachedSkillRunIds = get().attachedSkillRuns.map(item => item.id);
          const attachments =
            turn?.attachments ??
            attachedArtifacts
              .map(item => item.attachment)
              .filter((item): item is NonNullable<typeof item> => Boolean(item));
          const chatContext: ChatContext | undefined =
            attachedArtifactIds.length > 0 ||
            attachedSkillRunIds.length > 0 ||
            attachments.length > 0 ||
            context
              ? {
                  ...context,
                  ...(attachedArtifactIds.length > 0 ? { artifactIds: attachedArtifactIds } : {}),
                  ...(attachedSkillRunIds.length > 0 ? { skillRunIds: attachedSkillRunIds } : {}),
                  ...(attachments.length > 0 ? { attachments } : {}),
                }
              : undefined;

          await sendChatMessage(
            text,
            get().sessionId,
            {
              onContent: chunk => {
                assistantContent += chunk;
                set(s => {
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].id === assistantMsgId) {
                    msgs[lastIdx] = { ...msgs[lastIdx], content: assistantContent };
                  } else {
                    msgs.push({
                      id: assistantMsgId,
                      role: 'assistant',
                      content: assistantContent,
                      toolCalls: [],
                      timestamp: Date.now(),
                    });
                  }
                  return { messages: msgs };
                });
              },

              onToolCall: (toolId, toolName, _args) => {
                const tc: ToolCallInfo = {
                  id: toolId,
                  name: toolName,
                  status: 'executing',
                };
                toolCalls.set(toolId, tc);
                set(s => {
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].id === assistantMsgId) {
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      toolCalls: Array.from(toolCalls.values()),
                    };
                  } else {
                    msgs.push({
                      id: assistantMsgId,
                      role: 'assistant',
                      content: assistantContent,
                      toolCalls: Array.from(toolCalls.values()),
                      timestamp: Date.now(),
                    });
                  }
                  return { messages: msgs };
                });
              },

              onToolResult: (toolId, toolName, result) => {
                let tc = toolCalls.get(toolId);
                if (!tc) {
                  tc = { id: toolId, name: toolName, status: 'executing' };
                  toolCalls.set(toolId, tc);
                }
                const approvalPayload = parseApprovalRequiredResult(result);
                if (approvalPayload) {
                  tc.status = 'approval_required';
                  tc.approval = {
                    id: approvalPayload.approval.id,
                    action: approvalPayload.approval.action,
                    summary: approvalPayload.approval.summary,
                    localStatus: 'pending',
                  };
                } else {
                  tc.status =
                    typeof result === 'object' && result !== null && 'error' in result
                      ? 'error'
                      : 'done';
                }
                if (toolName === 'agent_product_import_ingest') {
                  const runId = extractProductImportRunId(result);
                  if (runId) {
                    options?.onProductImportRun?.(runId);
                  }
                }
                toolCalls.set(toolId, tc);
                set(s => {
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].id === assistantMsgId) {
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      toolCalls: Array.from(toolCalls.values()),
                    };
                  } else {
                    msgs.push({
                      id: assistantMsgId,
                      role: 'assistant',
                      content: assistantContent,
                      toolCalls: Array.from(toolCalls.values()),
                      timestamp: Date.now(),
                    });
                  }
                  return { messages: msgs };
                });
              },

              onDone: sessionId => {
                activeAbortController = null;
                set({
                  isStreaming: false,
                  sessionId: sessionId || get().sessionId,
                  attachedArtifacts: [],
                  attachedSkillRuns: [],
                });
              },

              onError: error => {
                activeAbortController = null;
                set({ isStreaming: false, error });
              },
            },
            abortController.signal,
            chatContext
          );
        } catch (err) {
          activeAbortController = null;
          if (err instanceof DOMException && err.name === 'AbortError') {
            set({ isStreaming: false });
            return;
          }
          set({
            isStreaming: false,
            error: err instanceof Error ? err.message : 'Failed to send message',
          });
        } finally {
          if (activeAbortController === abortController) {
            activeAbortController = null;
          }
          if (get().isStreaming) {
            set({ isStreaming: false });
          }
        }
      },

      loadSessions: async () => {
        try {
          const sessions = await listChatSessions();
          set({ sessions });
        } catch {
          // silently ignore
        }
      },

      loadSession: async (sessionId: string) => {
        try {
          const { getChatSession } = await import('../services/ai/chatService');
          const session = await getChatSession(sessionId);
          const msgs = normalizeVisibleMessages(session.messages || []);
          set({
            sessionId: session.id,
            messages: msgs,
            error: null,
            attachedArtifacts: [],
            attachedSkillRuns: [],
          });
        } catch {
          set({ error: 'Failed to load session' });
        }
      },

      deleteSession: async (sessionId: string) => {
        try {
          await deleteChatSession(sessionId);
          set(s => ({
            sessions: s.sessions.filter(sess => sess.id !== sessionId),
            ...(s.sessionId === sessionId ? { sessionId: undefined, messages: [] } : {}),
          }));
        } catch {
          set({ error: 'Failed to delete session' });
        }
      },

      updateToolApproval: (messageId, toolId, localStatus) => {
        set(s => ({
          messages: s.messages.map(msg => {
            if (msg.id !== messageId || !msg.toolCalls?.length) return msg;
            return {
              ...msg,
              toolCalls: msg.toolCalls.map(tc => {
                if (tc.id !== toolId || !tc.approval) return tc;
                const next: ToolCallInfo = {
                  ...tc,
                  approval: { ...tc.approval, localStatus },
                };
                if (localStatus === 'applied') next.status = 'approval_applied';
                else if (localStatus === 'rejected') next.status = 'approval_rejected';
                else if (localStatus === 'failed') next.status = 'approval_required';
                return next;
              }),
            };
          }),
        }));
      },
    }),
    { name: 'ai-chat-store' }
  )
);
