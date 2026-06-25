import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_ATTACHED_CHAT_ARTIFACTS } from '../../types/agentArtifact';
import { normalizeVisibleMessages, useAIChatStore } from '../../stores/aiChatStore';
import type { ChatMessage } from '../../services/ai/chatService';

vi.mock('../../services/ai/chatService', () => ({
  sendChatMessage: vi.fn(),
  listChatSessions: vi.fn().mockResolvedValue([]),
  deleteChatSession: vi.fn().mockResolvedValue(undefined),
}));

import { sendChatMessage } from '../../services/ai/chatService';

const mockSendChatMessage = vi.mocked(sendChatMessage);

describe('normalizeVisibleMessages', () => {
  it('keeps legitimate assistant JSON while hiding tool and system messages', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'Return JSON', timestamp: 1 },
      { id: 'tool-1', role: 'tool', content: '{"data":[1]}', timestamp: 2 },
      { id: 'system-1', role: 'system', content: 'hidden', timestamp: 3 },
      { id: 'assistant-empty', role: 'assistant', content: '   ', timestamp: 4 },
      {
        id: 'assistant-json',
        role: 'assistant',
        content: '{"recommendations":["discount","bundle"]}',
        timestamp: 5,
      },
    ];

    expect(normalizeVisibleMessages(messages)).toEqual([
      { id: 'user-1', role: 'user', content: 'Return JSON', timestamp: 1 },
      {
        id: 'assistant-json',
        role: 'assistant',
        content: '{"recommendations":["discount","bundle"]}',
        timestamp: 5,
      },
    ]);
  });
});

describe('useAIChatStore attached artifacts', () => {
  beforeEach(() => {
    useAIChatStore.setState({
      messages: [],
      sessionId: undefined,
      attachedArtifacts: [],
      isStreaming: false,
      error: null,
    });
    mockSendChatMessage.mockReset();
  });

  it('returns max_reached when attaching more than the limit', () => {
    const artifacts = Array.from({ length: MAX_ATTACHED_CHAT_ARTIFACTS }, (_, index) => ({
      id: `artifact-${index}`,
      name: `Material ${index}`,
    }));
    useAIChatStore.setState({ attachedArtifacts: artifacts });

    const result = useAIChatStore.getState().attachArtifact({
      id: 'artifact-overflow',
      name: 'Overflow',
    });

    expect(result).toBe('max_reached');
    expect(useAIChatStore.getState().attachedArtifacts).toHaveLength(MAX_ATTACHED_CHAT_ARTIFACTS);
  });

  it('sends artifactIds with the next message and clears attachments after success', async () => {
    useAIChatStore.getState().attachArtifact({ id: 'artifact-1', name: 'Supplier notes' });

    mockSendChatMessage.mockImplementation(async (_text, _sessionId, callbacks) => {
      callbacks.onDone('session-1');
    });

    await useAIChatStore.getState().sendMessage('Import this product');

    expect(mockSendChatMessage).toHaveBeenCalledWith(
      'Import this product',
      undefined,
      expect.any(Object),
      expect.any(AbortSignal),
      { artifactIds: ['artifact-1'] }
    );
    expect(useAIChatStore.getState().attachedArtifacts).toEqual([]);
    expect(useAIChatStore.getState().sessionId).toBe('session-1');
  });

  it('keeps attachments when the stream errors', async () => {
    useAIChatStore.getState().attachArtifact({ id: 'artifact-1', name: 'Supplier notes' });

    mockSendChatMessage.mockImplementation(async (_text, _sessionId, callbacks) => {
      callbacks.onError('upstream failed');
    });

    await useAIChatStore.getState().sendMessage('Import this product');

    expect(useAIChatStore.getState().attachedArtifacts).toEqual([
      { id: 'artifact-1', name: 'Supplier notes' },
    ]);
  });
});
