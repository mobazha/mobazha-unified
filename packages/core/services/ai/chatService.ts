/**
 * AI Chat Service — SSE streaming client for the seller AI assistant.
 * Connects to POST /v1/ai/chat and parses SSE events.
 */

import { NODE_API } from '../../config/apiPaths';
import { getGatewayUrl, getAuthHeaders } from '../api/config';
import { nodeAuthGet, nodeAuthDel } from '../api/helpers';

// --- Types ---

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCallInfo[];
  toolCallId?: string;
  toolName?: string;
  timestamp?: number;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  args?: unknown;
  result?: unknown;
  status: 'pending' | 'executing' | 'done' | 'error';
}

export interface ChatSession {
  id: string;
  role: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface ChatSSEEvent {
  type: 'thinking' | 'content' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  tool?: string;
  toolId?: string;
  args?: unknown;
  result?: unknown;
  sessionId?: string;
  error?: string;
}

export interface ChatStreamCallbacks {
  onContent: (text: string) => void;
  onToolCall: (toolId: string, toolName: string, args: unknown) => void;
  onToolResult: (toolId: string, toolName: string, result: unknown) => void;
  onDone: (sessionId: string) => void;
  onError: (error: string) => void;
}

// --- Streaming Chat ---

export interface ChatContext {
  currentPage?: string;
  selectedListingSlug?: string;
  selectedOrderId?: string;
  locale?: string;
}

export async function sendChatMessage(
  message: string,
  sessionId: string | undefined,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
  context?: ChatContext
): Promise<void> {
  const url = `${getGatewayUrl()}${NODE_API.AI_CHAT}`;
  const headers = {
    ...getAuthHeaders(),
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({
    message,
    ...(sessionId && { sessionId }),
    ...(context && { context }),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    let errMsg = `HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(text);
      errMsg = errJson.error?.message || errMsg;
    } catch {
      if (text) errMsg = text;
    }
    callbacks.onError(errMsg);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event: ChatSSEEvent = JSON.parse(data);
            handleSSEEvent(event, eventType, callbacks);
          } catch {
            // skip unparseable lines
          }
          eventType = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function handleSSEEvent(event: ChatSSEEvent, _eventType: string, callbacks: ChatStreamCallbacks) {
  switch (event.type) {
    case 'content':
      if (event.content) callbacks.onContent(event.content);
      break;
    case 'tool_call':
      if (event.toolId && event.tool) {
        callbacks.onToolCall(event.toolId, event.tool, event.args);
      }
      break;
    case 'tool_result':
      if (event.toolId && event.tool) {
        callbacks.onToolResult(event.toolId, event.tool, event.result);
      }
      break;
    case 'done':
      callbacks.onDone(event.sessionId || '');
      break;
    case 'error':
      callbacks.onError(event.error || 'Unknown error');
      break;
  }
}

// --- Session Management ---

export async function listChatSessions(limit = 20, offset = 0): Promise<ChatSession[]> {
  const sessions = await nodeAuthGet<ChatSession[]>(
    `${NODE_API.AI_CHAT_SESSIONS}?limit=${limit}&offset=${offset}`
  );
  return sessions || [];
}

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  return nodeAuthGet<ChatSession>(NODE_API.AI_CHAT_SESSION(sessionId));
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await nodeAuthDel(NODE_API.AI_CHAT_SESSION(sessionId));
}
