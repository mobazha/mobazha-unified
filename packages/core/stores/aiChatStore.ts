/**
 * AI Chat Store — Zustand state for the AI assistant panel.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatMessage, ToolCallInfo, ChatSession } from '../services/ai/chatService';
import { sendChatMessage, listChatSessions, deleteChatSession } from '../services/ai/chatService';

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${Date.now()}-${++msgCounter}`;
}

interface AIChatState {
  isOpen: boolean;
  isStreaming: boolean;
  messages: ChatMessage[];
  sessionId: string | undefined;
  sessions: ChatSession[];
  error: string | null;

  toggle: () => void;
  open: () => void;
  close: () => void;

  sendMessage: (
    text: string,
    context?: {
      currentPage?: string;
      selectedListingSlug?: string;
      selectedOrderId?: string;
      locale?: string;
    }
  ) => Promise<void>;
  cancelStream: () => void;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  newChat: () => void;
  clearError: () => void;
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

      toggle: () => set(s => ({ isOpen: !s.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      clearError: () => set({ error: null }),

      newChat: () => set({ messages: [], sessionId: undefined, error: null }),

      cancelStream: () => {
        if (activeAbortController) {
          activeAbortController.abort();
          activeAbortController = null;
        }
        set({ isStreaming: false });
      },

      sendMessage: async (
        text: string,
        context?: {
          currentPage?: string;
          selectedListingSlug?: string;
          selectedOrderId?: string;
          locale?: string;
        }
      ) => {
        const userMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
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

              onToolCall: (toolId, toolName, args) => {
                const tc: ToolCallInfo = {
                  id: toolId,
                  name: toolName,
                  args,
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
                  }
                  return { messages: msgs };
                });
              },

              onToolResult: (toolId, _toolName, result) => {
                const tc = toolCalls.get(toolId);
                if (tc) {
                  tc.result = result;
                  tc.status = 'done';
                  toolCalls.set(toolId, tc);
                  set(s => {
                    const msgs = [...s.messages];
                    const lastIdx = msgs.length - 1;
                    if (lastIdx >= 0 && msgs[lastIdx].id === assistantMsgId) {
                      msgs[lastIdx] = {
                        ...msgs[lastIdx],
                        toolCalls: Array.from(toolCalls.values()),
                      };
                    }
                    return { messages: msgs };
                  });
                }
              },

              onDone: sessionId => {
                activeAbortController = null;
                set({ isStreaming: false, sessionId: sessionId || get().sessionId });
              },

              onError: error => {
                activeAbortController = null;
                set({ isStreaming: false, error });
              },
            },
            abortController.signal,
            context
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
          const msgs = (session.messages || []).map(m => ({
            ...m,
            id: m.id || nextMsgId(),
          }));
          set({
            sessionId: session.id,
            messages: msgs,
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
    }),
    { name: 'ai-chat-store' }
  )
);
