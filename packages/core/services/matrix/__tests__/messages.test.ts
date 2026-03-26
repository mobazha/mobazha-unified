import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertMessage, mxcToHttp, resetPaginationState } from '../messages';
import type { BackendMessage } from '../types';

vi.mock('../../api/config', () => ({
  getMyGatewayUrl: () => 'https://gateway.test.com',
  getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
}));

vi.mock('../../api/helpers', () => ({
  authGet: vi.fn(),
  authPost: vi.fn(),
  authPut: vi.fn(),
  authDel: vi.fn(),
}));

vi.mock('../events', () => ({
  matrixEvents: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

describe('messages module', () => {
  beforeEach(() => {
    resetPaginationState();
  });

  describe('convertMessage', () => {
    it('converts a text message correctly', () => {
      const backend: BackendMessage = {
        id: '$evt1',
        roomId: '!room1:test',
        sender: '@peer_abc:test',
        content: 'Hello world',
        msgType: 'm.text',
        timestamp: '2026-03-25T12:00:00Z',
      };

      const result = convertMessage(backend);

      expect(result.id).toBe('$evt1');
      expect(result.roomId).toBe('!room1:test');
      expect(result.sender).toBe('@peer_abc:test');
      expect(result.content).toBe('Hello world');
      expect(result.type).toBe('text');
      expect(result.timestamp).toBe(new Date('2026-03-25T12:00:00Z').getTime());
      expect(result.isEdited).toBe(false);
      expect(result.attachments).toBeUndefined();
    });

    it('converts an image message with media', () => {
      const backend: BackendMessage = {
        id: '$img1',
        roomId: '!room1:test',
        sender: '@peer_abc:test',
        content: 'photo.jpg',
        msgType: 'm.image',
        timestamp: '2026-03-25T12:00:00Z',
        media: {
          url: 'mxc://matrix.mobazha.org/abcdef123',
          mimeType: 'image/jpeg',
          size: 1024,
          width: 800,
          height: 600,
          filename: 'photo.jpg',
        },
      };

      const result = convertMessage(backend);

      expect(result.type).toBe('image');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments![0].filename).toBe('photo.jpg');
      expect(result.attachments![0].mimetype).toBe('image/jpeg');
      expect(result.attachments![0].width).toBe(800);
      expect(result.attachments![0].url).toContain('/chat/media/matrix.mobazha.org/abcdef123');
    });

    it('marks edited messages', () => {
      const backend: BackendMessage = {
        id: '$evt2',
        roomId: '!room1:test',
        sender: '@peer_abc:test',
        content: 'Edited text',
        msgType: 'm.text',
        timestamp: '2026-03-25T12:00:00Z',
        editedAt: '2026-03-25T12:05:00Z',
      };

      const result = convertMessage(backend);
      expect(result.isEdited).toBe(true);
    });

    it('maps all known message types', () => {
      const types: Array<[string, string]> = [
        ['m.text', 'text'],
        ['m.image', 'image'],
        ['m.file', 'file'],
        ['m.audio', 'audio'],
        ['m.video', 'video'],
        ['m.location', 'location'],
        ['m.unknown', 'text'],
      ];

      for (const [input, expected] of types) {
        const backend: BackendMessage = {
          id: `$t_${input}`,
          roomId: '!r:t',
          sender: '@u:t',
          content: '',
          msgType: input,
          timestamp: '2026-01-01T00:00:00Z',
        };
        expect(convertMessage(backend).type).toBe(expected);
      }
    });

    it('preserves replyTo field', () => {
      const backend: BackendMessage = {
        id: '$reply1',
        roomId: '!room1:test',
        sender: '@peer_abc:test',
        content: 'This is a reply',
        msgType: 'm.text',
        timestamp: '2026-03-25T12:00:00Z',
        replyTo: '$original_evt',
      };

      const result = convertMessage(backend);
      expect(result.replyTo).toBe('$original_evt');
    });

    it('extracts senderName from metadata', () => {
      const backend: BackendMessage = {
        id: '$sn1',
        roomId: '!room1:test',
        sender: '@peer_abc:test',
        content: 'Hi',
        msgType: 'm.text',
        timestamp: '2026-03-25T12:00:00Z',
        metadata: { senderName: 'Alice' },
      };

      const result = convertMessage(backend);
      expect(result.senderName).toBe('Alice');
    });
  });

  describe('mxcToHttp', () => {
    it('converts mxc URL to backend proxy URL', () => {
      const result = mxcToHttp('mxc://matrix.mobazha.org/abcdef123');
      expect(result).toBe('https://gateway.test.com/chat/media/matrix.mobazha.org/abcdef123');
    });

    it('returns undefined for null', () => {
      expect(mxcToHttp(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(mxcToHttp(undefined)).toBeUndefined();
    });

    it('returns undefined for non-mxc URL', () => {
      expect(mxcToHttp('https://example.com/image.jpg')).toBeUndefined();
    });

    it('returns undefined for malformed mxc URL', () => {
      expect(mxcToHttp('mxc://noslash')).toBeUndefined();
    });

    it('handles empty string', () => {
      expect(mxcToHttp('')).toBeUndefined();
    });
  });
});
