/**
 * AI Chat Service — SSE streaming client for the seller AI assistant.
 * Connects to POST /v1/agent/chat and parses SSE events.
 */

import { NODE_API } from '../../config/apiPaths';
import { getGatewayUrl, getAuthHeaders } from '../api/config';
import { nodeAuthGet, nodeAuthDel } from '../api/helpers';

// --- Types ---

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
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
  status:
    | 'pending'
    | 'executing'
    | 'done'
    | 'error'
    | 'approval_required'
    | 'approval_applied'
    | 'approval_rejected';
  approval?: {
    id: string;
    action: string;
    summary: string;
    localStatus: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';
  };
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
  const url = `${getGatewayUrl()}${NODE_API.AGENT_CHAT}`;
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
  let streamFinished = false;
  let streamErrored = false;

  const wrappedCallbacks: ChatStreamCallbacks = {
    onContent: callbacks.onContent,
    onToolCall: callbacks.onToolCall,
    onToolResult: callbacks.onToolResult,
    onDone: sessionId => {
      streamFinished = true;
      callbacks.onDone(sessionId);
    },
    onError: error => {
      streamErrored = true;
      callbacks.onError(error);
    },
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      parseSSEBuffer(buffer, wrappedCallbacks, remaining => {
        buffer = remaining;
      });
    }

    // Flush trailing bytes and any partial line left in buffer.
    buffer += decoder.decode();
    if (buffer) {
      parseSSEBuffer(`${buffer}\n`, wrappedCallbacks, remaining => {
        buffer = remaining;
      });
    }
  } finally {
    reader.releaseLock();
    // Stream closed without explicit done/error — reset UI instead of spinning forever.
    if (!streamFinished && !streamErrored) {
      callbacks.onDone('');
    }
  }
}

function parseSSEBuffer(
  chunk: string,
  callbacks: ChatStreamCallbacks,
  setRemaining: (remaining: string) => void
): void {
  const lines = chunk.split('\n');
  const incomplete = lines.pop() ?? '';
  setRemaining(incomplete);

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
        callbacks.onToolResult(
          event.toolId,
          event.tool,
          event.error ? { error: event.error } : event.result
        );
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
    `${NODE_API.AGENT_CHAT_SESSIONS}?limit=${limit}&offset=${offset}`
  );
  return sessions || [];
}

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  return nodeAuthGet<ChatSession>(NODE_API.AGENT_CHAT_SESSION(sessionId));
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await nodeAuthDel(NODE_API.AGENT_CHAT_SESSION(sessionId));
}
