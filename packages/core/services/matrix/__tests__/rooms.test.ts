import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractPeerIdFromUserId,
  isMobazhaUser,
  loadInvitePolicy,
  saveInvitePolicy,
} from '../rooms';

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

describe('rooms module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('extractPeerIdFromUserId', () => {
    it('extracts peer ID from standard Matrix user ID', () => {
      expect(extractPeerIdFromUserId('@peer_qmabc123:matrix.mobazha.org')).toBe('qmabc123');
    });

    it('handles uppercase peer ID', () => {
      expect(extractPeerIdFromUserId('@peer_QmABC123:matrix.mobazha.org')).toBe('QmABC123');
    });

    it('returns null for non-mobazha user ID', () => {
      expect(extractPeerIdFromUserId('@alice:matrix.org')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractPeerIdFromUserId('')).toBeNull();
    });

    it('returns null for user ID without peer_ prefix', () => {
      expect(extractPeerIdFromUserId('@user_abc:test')).toBeNull();
    });

    it('handles different server names', () => {
      expect(extractPeerIdFromUserId('@peer_abc123:custom.server')).toBe('abc123');
    });
  });

  describe('isMobazhaUser', () => {
    it('returns true for mobazha user', () => {
      expect(isMobazhaUser('@peer_abc123:matrix.mobazha.org')).toBe(true);
    });

    it('returns false for external user', () => {
      expect(isMobazhaUser('@alice:matrix.org')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isMobazhaUser('')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isMobazhaUser('@PEER_ABC123:test')).toBe(true);
    });
  });

  describe('invite policy', () => {
    it('defaults to auto_mobazha when API returns empty', async () => {
      const { authGet } = await import('../../api/helpers');
      vi.mocked(authGet).mockResolvedValueOnce({});
      expect(await loadInvitePolicy()).toBe('auto_mobazha');
    });

    it('loads auto_all from API', async () => {
      const { authGet } = await import('../../api/helpers');
      vi.mocked(authGet).mockResolvedValueOnce({ invitePolicy: 'auto_all' });
      expect(await loadInvitePolicy()).toBe('auto_all');
    });

    it('loads always_confirm from API', async () => {
      const { authGet } = await import('../../api/helpers');
      vi.mocked(authGet).mockResolvedValueOnce({ invitePolicy: 'always_confirm' });
      expect(await loadInvitePolicy()).toBe('always_confirm');
    });

    it('returns default for invalid API value', async () => {
      const { authGet } = await import('../../api/helpers');
      vi.mocked(authGet).mockResolvedValueOnce({ invitePolicy: 'invalid_value' });
      expect(await loadInvitePolicy()).toBe('auto_mobazha');
    });

    it('saves policy via API', async () => {
      const { authPut } = await import('../../api/helpers');
      const mockPut = vi.mocked(authPut).mockResolvedValueOnce(undefined);
      await saveInvitePolicy('auto_all');
      expect(mockPut).toHaveBeenCalledWith(expect.any(String), { invitePolicy: 'auto_all' });
    });
  });

  describe('getRooms with mocked API', () => {
    it('converts backend rooms to frontend format', async () => {
      const { authGet } = await import('../../api/helpers');
      const mockAuthGet = vi.mocked(authGet);
      mockAuthGet.mockResolvedValueOnce([
        {
          roomId: '!room1:test',
          name: 'Test Room',
          isDirect: true,
          encrypted: true,
          unreadCount: 3,
          roomType: 'direct',
          members: [{ userId: '@peer_abc123:test', displayName: 'Alice', membership: 'join' }],
        },
      ]);

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms();

      expect(rooms).toHaveLength(1);
      expect(rooms[0].roomId).toBe('!room1:test');
      expect(rooms[0].name).toBe('Test Room');
      expect(rooms[0].isDirect).toBe(true);
      expect(rooms[0].isEncrypted).toBe(true);
      expect(rooms[0].unreadCount).toBe(3);
      expect(rooms[0].members).toHaveLength(1);
      expect(rooms[0].members[0].peerID).toBe('abc123');
      expect(rooms[0].memberPeerIDs).toEqual({ '@peer_abc123:test': 'abc123' });
    });

    it('handles empty rooms list', async () => {
      const { authGet } = await import('../../api/helpers');
      const mockAuthGet = vi.mocked(authGet);
      mockAuthGet.mockResolvedValueOnce([]);

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms();

      expect(rooms).toHaveLength(0);
    });

    it('handles null response', async () => {
      const { authGet } = await import('../../api/helpers');
      const mockAuthGet = vi.mocked(authGet);
      mockAuthGet.mockResolvedValueOnce(null);

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms();

      expect(rooms).toHaveLength(0);
    });
  });

  describe('createDirectRoom', () => {
    it('creates a direct room and returns roomId', async () => {
      const { authPost } = await import('../../api/helpers');
      const mockAuthPost = vi.mocked(authPost);
      mockAuthPost.mockResolvedValueOnce({ roomId: '!new_room:test' });

      const { createDirectRoom } = await import('../rooms');
      const roomId = await createDirectRoom('@peer_abc:test');

      expect(roomId).toBe('!new_room:test');
      expect(mockAuthPost).toHaveBeenCalledWith(expect.any(String), {
        userID: '@peer_abc:test',
        isDM: true,
      });
    });

    it('returns null on failure', async () => {
      const { authPost } = await import('../../api/helpers');
      const mockAuthPost = vi.mocked(authPost);
      mockAuthPost.mockRejectedValueOnce(new Error('Network error'));

      const { createDirectRoom } = await import('../rooms');
      const roomId = await createDirectRoom('@peer_abc:test');

      expect(roomId).toBeNull();
    });
  });

  describe('room metadata extraction', () => {
    it('extracts orderId from room metadata', async () => {
      const { authGet } = await import('../../api/helpers');
      const mockAuthGet = vi.mocked(authGet);
      mockAuthGet.mockResolvedValueOnce([
        {
          roomId: '!order_room:test',
          name: 'Order: Widget',
          isDirect: false,
          encrypted: true,
          unreadCount: 0,
          roomType: 'order',
          metadata: { orderId: 'QmOrder123', type: 'order' },
        },
      ]);

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms();

      expect(rooms[0].orderId).toBe('QmOrder123');
      expect(rooms[0].metadata?.orderId).toBe('QmOrder123');
    });

    it('extracts storeId and moderatorId', async () => {
      const { authGet } = await import('../../api/helpers');
      const mockAuthGet = vi.mocked(authGet);
      mockAuthGet.mockResolvedValueOnce([
        {
          roomId: '!dispute:test',
          name: 'Dispute',
          isDirect: false,
          encrypted: true,
          unreadCount: 0,
          roomType: 'moderator',
          metadata: { orderId: 'Qm1', moderatorId: 'QmMod', storeId: 'QmStore' },
        },
      ]);

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms();

      expect(rooms[0].storeId).toBe('QmStore');
      expect(rooms[0].moderatorId).toBe('QmMod');
    });
  });
});
