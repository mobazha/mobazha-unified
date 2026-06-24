import { describe, expect, it } from 'vitest';
import { normalizeVisibleMessages } from '../../stores/aiChatStore';
import type { ChatMessage } from '../../services/ai/chatService';

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
