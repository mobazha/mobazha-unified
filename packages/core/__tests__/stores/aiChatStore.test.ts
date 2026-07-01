import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_ATTACHED_CHAT_ARTIFACTS,
  MAX_ATTACHED_CHAT_SKILL_RUNS,
} from '../../types/agentArtifact';
import { normalizeVisibleMessages, useAIChatStore } from '../../stores/aiChatStore';
import type { ChatMessage } from '../../services/ai/chatService';

vi.mock('../../services/ai/chatService', () => ({
  sendChatMessage: vi.fn(),
  listChatSessions: vi.fn().mockResolvedValue([]),
  getChatSession: vi.fn(),
  deleteChatSession: vi.fn().mockResolvedValue(undefined),
}));

import { getChatSession, sendChatMessage } from '../../services/ai/chatService';

const mockSendChatMessage = vi.mocked(sendChatMessage);
const mockGetChatSession = vi.mocked(getChatSession);

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

  it('preserves user attachment display metadata for session history replay', () => {
    const messages: ChatMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'Import from this image',
        timestamp: 1,
        attachmentDisplay: [
          {
            artifactId: 'art_img',
            name: 'cover.jpg',
            contentType: 'image/jpeg',
          },
        ],
      },
    ];

    expect(normalizeVisibleMessages(messages)).toEqual([
      {
        id: 'user-1',
        role: 'user',
        content: 'Import from this image',
        timestamp: 1,
        attachmentDisplay: [
          {
            artifactId: 'art_img',
            name: 'cover.jpg',
            contentType: 'image/jpeg',
          },
        ],
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
      attachedSkillRuns: [],
      isStreaming: false,
      error: null,
    });
    mockSendChatMessage.mockReset();
    mockGetChatSession.mockReset();
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

  it('sends attachments metadata with the next message when present', async () => {
    useAIChatStore.getState().attachArtifact({
      id: 'artifact-img',
      name: 'cover.jpg',
      attachment: {
        name: 'cover.jpg',
        contentType: 'image/jpeg',
        contentBase64: 'abc123',
      },
    });

    mockSendChatMessage.mockImplementation(async (_text, _sessionId, callbacks) => {
      callbacks.onDone('session-1');
    });

    await useAIChatStore.getState().sendMessage('Import from this image');

    expect(mockSendChatMessage).toHaveBeenCalledWith(
      'Import from this image',
      undefined,
      expect.any(Object),
      expect.any(AbortSignal),
      {
        artifactIds: ['artifact-img'],
        attachments: [
          {
            name: 'cover.jpg',
            contentType: 'image/jpeg',
            contentBase64: 'abc123',
          },
        ],
      }
    );
  });

  it('prefers explicit turn payload over store attachments', async () => {
    useAIChatStore.getState().attachArtifact({ id: 'stale-artifact', name: 'Stale' });

    mockSendChatMessage.mockImplementation(async (_text, _sessionId, callbacks) => {
      callbacks.onDone('session-1');
    });

    await useAIChatStore.getState().sendMessage('Import from this image', undefined, {
      turn: {
        artifactIds: ['artifact-img'],
        attachments: [
          {
            name: 'cover.jpg',
            contentType: 'image/jpeg',
            contentBase64: 'abc123',
          },
        ],
        display: [{ name: 'cover.jpg', contentType: 'image/jpeg', previewUrl: 'blob:preview' }],
      },
    });

    expect(mockSendChatMessage).toHaveBeenCalledWith(
      'Import from this image',
      undefined,
      expect.any(Object),
      expect.any(AbortSignal),
      {
        artifactIds: ['artifact-img'],
        attachments: [
          {
            name: 'cover.jpg',
            contentType: 'image/jpeg',
            contentBase64: 'abc123',
          },
        ],
      }
    );
    expect(useAIChatStore.getState().messages.at(-1)?.attachmentDisplay).toEqual([
      { name: 'cover.jpg', contentType: 'image/jpeg', previewUrl: 'blob:preview' },
    ]);
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

describe('useAIChatStore attached skill runs', () => {
  beforeEach(() => {
    useAIChatStore.setState({
      messages: [],
      sessionId: undefined,
      attachedArtifacts: [],
      attachedSkillRuns: [],
      isStreaming: false,
      error: null,
    });
    mockSendChatMessage.mockReset();
  });

  it('returns max_reached when attaching more than the limit', () => {
    const skillRuns = Array.from({ length: MAX_ATTACHED_CHAT_SKILL_RUNS }, (_, index) => ({
      id: `run-${index}`,
      label: `Import run ${index}`,
    }));
    useAIChatStore.setState({ attachedSkillRuns: skillRuns });

    const result = useAIChatStore.getState().attachSkillRun({
      id: 'run-overflow',
      label: 'Overflow',
    });

    expect(result).toBe('max_reached');
    expect(useAIChatStore.getState().attachedSkillRuns).toHaveLength(MAX_ATTACHED_CHAT_SKILL_RUNS);
  });

  it('sends skillRunIds with the next message and clears attachments after success', async () => {
    useAIChatStore.getState().attachSkillRun({
      id: 'run_import',
      label: 'Import run (2 rows)',
      skillId: 'product.import',
    });

    mockSendChatMessage.mockImplementation(async (_text, _sessionId, callbacks) => {
      callbacks.onDone('session-1');
    });

    await useAIChatStore.getState().sendMessage('Continue this import');

    expect(mockSendChatMessage).toHaveBeenCalledWith(
      'Continue this import',
      undefined,
      expect.any(Object),
      expect.any(AbortSignal),
      { skillRunIds: ['run_import'] }
    );
    expect(useAIChatStore.getState().attachedSkillRuns).toEqual([]);
  });

  it('keeps skill run attachments when the stream errors', async () => {
    useAIChatStore.getState().attachSkillRun({
      id: 'run_import',
      label: 'Import run (2 rows)',
    });

    mockSendChatMessage.mockImplementation(async (_text, _sessionId, callbacks) => {
      callbacks.onError('upstream failed');
    });

    await useAIChatStore.getState().sendMessage('Continue this import');

    expect(useAIChatStore.getState().attachedSkillRuns).toEqual([
      { id: 'run_import', label: 'Import run (2 rows)' },
    ]);
  });

  it('sends both artifactIds and skillRunIds when both are attached', async () => {
    useAIChatStore.getState().attachArtifact({ id: 'artifact-1', name: 'Supplier notes' });
    useAIChatStore.getState().attachSkillRun({ id: 'run_import', label: 'Import run' });

    mockSendChatMessage.mockImplementation(async (_text, _sessionId, callbacks) => {
      callbacks.onDone('session-1');
    });

    await useAIChatStore.getState().sendMessage('Continue');

    expect(mockSendChatMessage).toHaveBeenCalledWith(
      'Continue',
      undefined,
      expect.any(Object),
      expect.any(AbortSignal),
      { artifactIds: ['artifact-1'], skillRunIds: ['run_import'] }
    );
  });
});

describe('useAIChatStore delivery events', () => {
  beforeEach(() => {
    useAIChatStore.setState({
      messages: [],
      sessionId: undefined,
      attachedArtifacts: [],
      attachedSkillRuns: [],
      isStreaming: false,
      error: null,
    });
    mockSendChatMessage.mockReset();
    mockGetChatSession.mockReset();
  });

  it('renders delivery-only assistant turns without waiting for content', async () => {
    const onProductImportRun = vi.fn();
    mockSendChatMessage.mockImplementation(async (_text, _sessionId, callbacks) => {
      callbacks.onDelivery({
        state: 'needs_review',
        skillId: 'product.import',
        skillRunId: 'run_delivery',
        messageKey: 'product_import.needs_review',
        data: {
          reviewableCount: 1,
          nextActions: [{ type: 'review_proposals', sourceArtifactId: 'art_1' }],
        },
      });
      callbacks.onDone('session-1');
    });

    await useAIChatStore
      .getState()
      .sendMessage('Import products', undefined, { onProductImportRun });

    const assistant = useAIChatStore.getState().messages.find(msg => msg.role === 'assistant');
    expect(assistant?.deliveries).toEqual([
      {
        state: 'needs_review',
        skillId: 'product.import',
        skillRunId: 'run_delivery',
        messageKey: 'product_import.needs_review',
        data: {
          reviewableCount: 1,
          nextActions: [{ type: 'review_proposals', sourceArtifactId: 'art_1' }],
        },
      },
    ]);
    expect(assistant?.content).toBe('');
    expect(useAIChatStore.getState().isStreaming).toBe(false);
    expect(onProductImportRun).toHaveBeenCalledWith('run_delivery');
  });

  it('preserves assistant delivery metadata when normalizing session history', () => {
    const messages: ChatMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: '',
        timestamp: 1,
        deliveries: [
          {
            state: 'completed',
            skillId: 'product.import',
            skillRunId: 'run_done',
            messageKey: 'product_import.completed',
          },
        ],
      },
    ];

    expect(normalizeVisibleMessages(messages)).toEqual(messages);
  });

  it('restores persisted delivery-only messages when loading a session', async () => {
    mockGetChatSession.mockResolvedValue({
      id: 'session-delivery',
      role: 'seller',
      title: 'Import products',
      created_at: '2026-06-27T00:00:00Z',
      updated_at: '2026-06-27T00:01:00Z',
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: 'Import products',
        },
        {
          id: 'assistant-delivery',
          role: 'assistant',
          content: '',
          deliveries: [
            {
              state: 'needs_review',
              skillId: 'product.import',
              skillRunId: 'run_persisted',
              messageKey: 'product_import.needs_review',
              data: { reviewableCount: 2 },
            },
          ],
        },
      ],
    });

    await useAIChatStore.getState().loadSession('session-delivery');

    expect(useAIChatStore.getState().messages[1]).toMatchObject({
      role: 'assistant',
      content: '',
      deliveries: [
        {
          state: 'needs_review',
          skillRunId: 'run_persisted',
          data: { reviewableCount: 2 },
        },
      ],
    });
  });
});
