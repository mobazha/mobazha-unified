import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MATRIX_EVENTS } from '../types';

let mockWsMessageHandlers: Array<(msg: { type: string; data: unknown }) => void> = [];
let mockWsStatusHandlers: Array<(status: string) => void> = [];

vi.mock('../../websocket', () => ({
  onWebSocketMessage: vi.fn((handler: (msg: { type: string; data: unknown }) => void) => {
    mockWsMessageHandlers.push(handler);
    return () => {
      mockWsMessageHandlers = mockWsMessageHandlers.filter(h => h !== handler);
    };
  }),
  onWebSocketStatusChange: vi.fn((handler: (status: string) => void) => {
    mockWsStatusHandlers.push(handler);
    return () => {
      mockWsStatusHandlers = mockWsStatusHandlers.filter(h => h !== handler);
    };
  }),
}));

vi.mock('../../api/config', () => ({
  getMyGatewayUrl: () => 'https://gateway.test.com',
  getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
}));

vi.mock('../../api/helpers', () => ({
  authGet: vi.fn(),
  authPost: vi.fn().mockResolvedValue({}),
  authPut: vi.fn(),
  authDel: vi.fn(),
}));

const mockEmit = vi.fn();
vi.mock('../events', () => ({
  matrixEvents: {
    emit: (...args: unknown[]) => mockEmit(...args),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

import { setupChatEventListeners, type EventListenerCallbacks } from '../event-listeners';

describe('event-listeners module', () => {
  let cleanup: () => void;
  let processedIds: Set<string>;
  let syncStateCallback: ReturnType<typeof vi.fn>;

  function createCallbacks(): EventListenerCallbacks {
    return {
      processedMessageIds: processedIds,
      onSyncStateChange: syncStateCallback,
    };
  }

  function simulateWsMessage(type: string, data: unknown) {
    for (const handler of mockWsMessageHandlers) {
      handler({ type, data });
    }
  }

  function simulateWsStatus(status: string) {
    for (const handler of mockWsStatusHandlers) {
      handler(status);
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockWsMessageHandlers = [];
    mockWsStatusHandlers = [];
    processedIds = new Set<string>();
    syncStateCallback = vi.fn();
    cleanup = setupChatEventListeners(createCallbacks());
  });

  afterEach(() => {
    cleanup();
  });

  describe('chat.message', () => {
    it('emits MESSAGE_RECEIVED for new message', () => {
      simulateWsMessage('chat.message', {
        id: '$evt1',
        roomId: '!room:test',
        sender: '@peer_abc:test',
        content: 'Hello',
        msgType: 'm.text',
        timestamp: '2026-03-25T12:00:00Z',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.MESSAGE_RECEIVED,
        expect.objectContaining({
          id: '$evt1',
          content: 'Hello',
          type: 'text',
        })
      );
    });

    it('deduplicates by event ID', () => {
      const payload = {
        id: '$dup1',
        roomId: '!room:test',
        sender: '@peer_abc:test',
        content: 'Dup',
        msgType: 'm.text',
        timestamp: '2026-03-25T12:00:00Z',
      };

      simulateWsMessage('chat.message', payload);
      simulateWsMessage('chat.message', payload);

      const msgEvents = mockEmit.mock.calls.filter(c => c[0] === MATRIX_EVENTS.MESSAGE_RECEIVED);
      expect(msgEvents).toHaveLength(1);
    });

    it('respects pre-existing processedIds', () => {
      processedIds.add('$already');

      simulateWsMessage('chat.message', {
        id: '$already',
        roomId: '!room:test',
        sender: '@peer_abc:test',
        content: 'Seen before',
        msgType: 'm.text',
        timestamp: '2026-03-25T12:00:00Z',
      });

      const msgEvents = mockEmit.mock.calls.filter(c => c[0] === MATRIX_EVENTS.MESSAGE_RECEIVED);
      expect(msgEvents).toHaveLength(0);
    });

    it('ignores null payload', () => {
      simulateWsMessage('chat.message', null);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('handles eventID field variant for dedup', () => {
      simulateWsMessage('chat.message', {
        eventID: '$evt_variant',
        roomID: '!room:test',
        sender: '@user:test',
        content: 'Hi',
        msgType: 'm.text',
        timestamp: '2026-01-01T00:00:00Z',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.MESSAGE_RECEIVED,
        expect.objectContaining({ content: 'Hi', sender: '@user:test' })
      );

      // Dedup works with eventID variant
      mockEmit.mockClear();
      simulateWsMessage('chat.message', {
        eventID: '$evt_variant',
        roomID: '!room:test',
        sender: '@user:test',
        content: 'Hi',
        msgType: 'm.text',
        timestamp: '2026-01-01T00:00:00Z',
      });
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('chat.message_edit', () => {
    it('emits MESSAGE_EDITED', () => {
      simulateWsMessage('chat.message_edit', {
        roomId: '!room:test',
        eventId: '$evt1',
        newContent: 'Updated text',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.MESSAGE_EDITED,
        expect.objectContaining({
          roomId: '!room:test',
          eventId: '$evt1',
          newContent: 'Updated text',
        })
      );
    });

    it('handles roomID/eventID variant', () => {
      simulateWsMessage('chat.message_edit', {
        roomID: '!room:test',
        eventID: '$evt2',
        content: 'v2',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.MESSAGE_EDITED,
        expect.objectContaining({
          roomId: '!room:test',
          eventId: '$evt2',
          newContent: 'v2',
        })
      );
    });
  });

  describe('chat.message_redact', () => {
    it('emits MESSAGE_UPDATED with redacted flag', () => {
      simulateWsMessage('chat.message_redact', {
        roomId: '!room:test',
        eventId: '$evt1',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.MESSAGE_UPDATED,
        expect.objectContaining({
          roomId: '!room:test',
          eventId: '$evt1',
          redacted: true,
        })
      );
    });
  });

  describe('chat.typing', () => {
    it('emits TYPING with user IDs', () => {
      simulateWsMessage('chat.typing', {
        roomId: '!room:test',
        userIds: ['@user1:test', '@user2:test'],
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.TYPING,
        expect.objectContaining({
          roomId: '!room:test',
          userIds: ['@user1:test', '@user2:test'],
        })
      );
    });

    it('handles userIDs variant', () => {
      simulateWsMessage('chat.typing', {
        roomID: '!room:test',
        userIDs: ['@u1:t'],
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.TYPING,
        expect.objectContaining({
          userIds: ['@u1:t'],
        })
      );
    });
  });

  describe('chat.read_receipt', () => {
    it('emits READ_RECEIPT', () => {
      simulateWsMessage('chat.read_receipt', {
        roomId: '!room:test',
        userId: '@peer_abc:test',
        eventId: '$evt5',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.READ_RECEIPT,
        expect.objectContaining({
          roomId: '!room:test',
          userId: '@peer_abc:test',
          eventId: '$evt5',
        })
      );
    });
  });

  describe('chat.room_member', () => {
    it('emits MEMBER_CHANGED', () => {
      simulateWsMessage('chat.room_member', {
        roomId: '!room:test',
        userId: '@peer_abc:test',
        membership: 'join',
        displayName: 'Alice',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.MEMBER_CHANGED,
        expect.objectContaining({
          roomId: '!room:test',
          userId: '@peer_abc:test',
          membership: 'join',
          displayName: 'Alice',
        })
      );
    });
  });

  describe('chat.invite', () => {
    it('emits ROOM_INVITE for all invites (policy handled by backend)', () => {
      simulateWsMessage('chat.invite', {
        roomId: '!invited:test',
        inviter: '@peer_abc:test',
        roomName: 'A room',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.ROOM_INVITE,
        expect.objectContaining({
          roomId: '!invited:test',
          inviter: '@peer_abc:test',
          roomName: 'A room',
        })
      );
    });
  });

  describe('chat.room_state', () => {
    it('emits MEMBER_PEERID_UPDATED', () => {
      simulateWsMessage('chat.room_state', {
        roomId: '!room:test',
        userId: '@peer_abc:test',
        peerID: 'QmABC123',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.MEMBER_PEERID_UPDATED,
        expect.objectContaining({
          roomId: '!room:test',
          userId: '@peer_abc:test',
          peerID: 'QmABC123',
        })
      );
    });
  });

  describe('chat.presence', () => {
    it('emits PRESENCE_CHANGED', () => {
      simulateWsMessage('chat.presence', {
        userId: '@peer_abc:test',
        presence: 'online',
        lastActive: 1711360000000,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.PRESENCE_CHANGED,
        expect.objectContaining({
          userId: '@peer_abc:test',
          presence: 'online',
          lastActive: 1711360000000,
        })
      );
    });
  });

  describe('WebSocket status changes', () => {
    it('handles connected status', () => {
      simulateWsStatus('connected');
      expect(syncStateCallback).toHaveBeenCalledWith(true);
      expect(mockEmit).toHaveBeenCalledWith(MATRIX_EVENTS.CONNECTED);
    });

    it('handles disconnected status', () => {
      simulateWsStatus('disconnected');
      expect(syncStateCallback).toHaveBeenCalledWith(false);
      expect(mockEmit).toHaveBeenCalledWith(MATRIX_EVENTS.DISCONNECTED);
    });

    it('handles error status', () => {
      simulateWsStatus('error');
      expect(syncStateCallback).toHaveBeenCalledWith(false);
      expect(mockEmit).toHaveBeenCalledWith(MATRIX_EVENTS.DISCONNECTED);
    });
  });

  describe('cleanup', () => {
    it('removes WebSocket listeners on cleanup', () => {
      cleanup();

      mockEmit.mockClear();
      simulateWsMessage('chat.message', {
        id: '$after_cleanup',
        roomId: '!room:test',
        sender: '@u:t',
        content: 'Too late',
        msgType: 'm.text',
        timestamp: '2026-01-01T00:00:00Z',
      });
      simulateWsStatus('connected');

      expect(mockEmit).not.toHaveBeenCalled();
      expect(syncStateCallback).toHaveBeenCalledTimes(0);
    });
  });

  describe('chat.verification.request', () => {
    it('emits VERIFICATION_REQUEST_RECEIVED with payload', () => {
      const payload = {
        transactionId: 'txn_001',
        userId: '@alice:test',
        deviceId: 'DEVICE_A',
      };
      simulateWsMessage('chat.verification.request', payload);

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.VERIFICATION_REQUEST_RECEIVED,
        expect.objectContaining({
          transactionId: 'txn_001',
          userId: '@alice:test',
          deviceId: 'DEVICE_A',
        })
      );
    });
  });

  describe('chat.verification.ready', () => {
    it('emits VERIFICATION_READY with payload', () => {
      const payload = {
        transactionId: 'txn_001',
        deviceId: 'DEVICE_B',
        supportsSAS: true,
      };
      simulateWsMessage('chat.verification.ready', payload);

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.VERIFICATION_READY,
        expect.objectContaining({
          transactionId: 'txn_001',
          supportsSAS: true,
        })
      );
    });
  });

  describe('chat.verification.show_sas', () => {
    it('emits VERIFICATION_SHOW_SAS with emoji data', () => {
      const payload = {
        transactionId: 'txn_001',
        emoji: [
          { number: 0, description: 'Dog' },
          { number: 1, description: 'Cat' },
        ],
        decimals: [1234, 5678, 9012],
      };
      simulateWsMessage('chat.verification.show_sas', payload);

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.VERIFICATION_SHOW_SAS,
        expect.objectContaining({
          transactionId: 'txn_001',
          emoji: expect.arrayContaining([expect.objectContaining({ description: 'Dog' })]),
        })
      );
    });
  });

  describe('chat.verification.done', () => {
    it('emits VERIFICATION_COMPLETED', () => {
      const payload = { transactionId: 'txn_001' };
      simulateWsMessage('chat.verification.done', payload);

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.VERIFICATION_COMPLETED,
        expect.objectContaining({ transactionId: 'txn_001' })
      );
    });
  });

  describe('chat.verification.cancelled', () => {
    it('emits VERIFICATION_CANCELLED with code and reason', () => {
      const payload = {
        transactionId: 'txn_001',
        code: 'm.user',
        reason: 'User cancelled',
      };
      simulateWsMessage('chat.verification.cancelled', payload);

      expect(mockEmit).toHaveBeenCalledWith(
        MATRIX_EVENTS.VERIFICATION_CANCELLED,
        expect.objectContaining({
          transactionId: 'txn_001',
          code: 'm.user',
          reason: 'User cancelled',
        })
      );
    });
  });

  describe('unknown event types', () => {
    it('ignores unknown event types silently', () => {
      simulateWsMessage('chat.unknown_event', { foo: 'bar' });
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });
});
