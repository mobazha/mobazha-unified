import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isMobazhaUser, loadInvitePolicy, saveInvitePolicy } from '../rooms';

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

vi.mock('../../profileCache', () => ({
  batchGetProfileDisplayInfo: vi.fn(),
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
    vi.clearAllMocks();
    localStorage.clear();
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
      expect(rooms[0].members[0].peerID).toBeUndefined();
      expect(rooms[0].memberPeerIDs).toEqual({});
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

    it('hydrates direct-room counterpart member info from peer profile', async () => {
      const { authGet } = await import('../../api/helpers');
      const { batchGetProfileDisplayInfo } = await import('../../profileCache');
      const mockAuthGet = vi.mocked(authGet);
      const mockBatchGetProfileDisplayInfo = vi.mocked(batchGetProfileDisplayInfo);

      mockAuthGet.mockResolvedValueOnce([
        {
          roomId: '!room1:test',
          name: 'Alice',
          isDirect: true,
          encrypted: true,
          unreadCount: 0,
          roomType: 'direct',
          members: [
            { userId: '@peer_me:test', displayName: 'Me', peerID: 'mepeer', membership: 'join' },
            {
              userId: '@peer_alice:test',
              displayName: 'Alice',
              peerID: 'alicepeer',
              membership: 'join',
            },
          ],
        },
      ]);
      mockBatchGetProfileDisplayInfo.mockResolvedValueOnce(
        new Map([
          [
            'alicepeer',
            {
              name: "Alice's Digital Shop",
              avatar: '/v1/media/images/bafy-avatar?store=alicepeer',
            },
          ],
        ])
      );

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms('@peer_me:test');

      expect(mockBatchGetProfileDisplayInfo).toHaveBeenCalledWith(['alicepeer']);
      expect(rooms[0].name).toBe('Alice');
      expect(rooms[0].avatarUrl).toBeUndefined();
      expect(rooms[0].members[1].displayName).toBe("Alice's Digital Shop");
      expect(rooms[0].members[1].avatarUrl).toBe('/v1/media/images/bafy-avatar?store=alicepeer');
    });

    it('preserves explicit backend peer IDs for direct rooms', async () => {
      const { authGet } = await import('../../api/helpers');
      const { batchGetProfileDisplayInfo } = await import('../../profileCache');
      const mockAuthGet = vi.mocked(authGet);
      const mockBatchGetProfileDisplayInfo = vi.mocked(batchGetProfileDisplayInfo);

      mockAuthGet.mockResolvedValueOnce([
        {
          roomId: '!room1:test',
          name: 'DM',
          isDirect: true,
          encrypted: true,
          unreadCount: 0,
          roomType: 'direct',
          members: [
            {
              userId: '@peer_me:test',
              displayName: 'Me',
              peerID: '12D3KooWMe',
              membership: 'join',
            },
            {
              userId: '@peer_alice:test',
              displayName: 'Alice',
              peerID: '12D3KooWAlice',
              membership: 'join',
            },
          ],
        },
      ]);
      mockBatchGetProfileDisplayInfo.mockResolvedValueOnce(new Map());

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms('@peer_me:test');

      expect(rooms[0].members[1].peerID).toBe('12D3KooWAlice');
      expect(rooms[0].memberPeerIDs).toEqual({
        '@peer_me:test': '12D3KooWMe',
        '@peer_alice:test': '12D3KooWAlice',
      });
    });

    it('uses direct_target_peer_id metadata when member peer IDs are missing', async () => {
      const { authGet } = await import('../../api/helpers');
      const { batchGetProfileDisplayInfo } = await import('../../profileCache');
      const mockAuthGet = vi.mocked(authGet);
      const mockBatchGetProfileDisplayInfo = vi.mocked(batchGetProfileDisplayInfo);

      mockAuthGet.mockResolvedValueOnce([
        {
          roomId: '!room1:test',
          name: 'Chat',
          isDirect: true,
          encrypted: true,
          unreadCount: 0,
          roomType: 'direct',
          metadata: {
            type: 'direct',
            direct_target_peer_id: '12D3KooWAlice',
          },
          members: [
            { userId: '@peer_me:test', displayName: 'Me', membership: 'join' },
            { userId: '@peer_alice:test', displayName: 'Alice', membership: 'join' },
          ],
        },
      ]);
      mockBatchGetProfileDisplayInfo.mockResolvedValueOnce(
        new Map([
          [
            '12D3KooWAlice',
            {
              name: "Alice's Digital Shop",
              avatar: '/v1/media/images/bafy-avatar?store=12D3KooWAlice',
            },
          ],
        ])
      );

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms('@peer_me:test');

      expect(mockBatchGetProfileDisplayInfo).toHaveBeenCalledWith(['12D3KooWAlice']);
      expect(rooms[0].members[1].displayName).toBe("Alice's Digital Shop");
      expect(rooms[0].members[1].avatarUrl).toBe(
        '/v1/media/images/bafy-avatar?store=12D3KooWAlice'
      );
      expect(rooms[0].memberPeerIDs?.['@peer_alice:test']).toBe('12D3KooWAlice');
    });

    it('ignores direct_target_peer_id metadata when it matches current user peerID', async () => {
      const { authGet } = await import('../../api/helpers');
      const { batchGetProfileDisplayInfo } = await import('../../profileCache');
      const mockAuthGet = vi.mocked(authGet);
      const mockBatchGetProfileDisplayInfo = vi.mocked(batchGetProfileDisplayInfo);

      mockAuthGet.mockResolvedValueOnce([
        {
          roomId: '!room1:test',
          name: 'Chat',
          isDirect: true,
          encrypted: true,
          unreadCount: 0,
          roomType: 'direct',
          metadata: {
            type: 'direct',
            direct_target_peer_id: '12D3KooWMe',
          },
          members: [
            {
              userId: '@peer_me:test',
              displayName: 'Me',
              peerID: '12D3KooWMe',
              membership: 'join',
            },
            { userId: '@peer_other:test', displayName: 'Other', membership: 'join' },
          ],
        },
      ]);
      mockBatchGetProfileDisplayInfo.mockResolvedValueOnce(new Map());

      const { getRooms } = await import('../rooms');
      const rooms = await getRooms('@peer_me:test');

      expect(mockBatchGetProfileDisplayInfo).not.toHaveBeenCalled();
      expect(rooms[0].members[1].peerID).toBeUndefined();
    });
  });

  describe('createDirectRoom', () => {
    it('creates a direct room by target peerID and returns roomId', async () => {
      const { authPost } = await import('../../api/helpers');
      const mockAuthPost = vi.mocked(authPost);
      mockAuthPost.mockResolvedValueOnce({ roomId: '!new_room:test' });

      const { createDirectRoom } = await import('../rooms');
      const roomId = await createDirectRoom('', '12D3KooWAbc');

      expect(roomId).toBe('!new_room:test');
      expect(mockAuthPost).toHaveBeenCalledWith(expect.any(String), {
        targetUserID: undefined,
        targetPeerID: '12D3KooWAbc',
        isDM: true,
      });
    });

    it('creates a direct room by target userID and returns roomId', async () => {
      const { authPost } = await import('../../api/helpers');
      const mockAuthPost = vi.mocked(authPost);
      mockAuthPost.mockResolvedValueOnce({ roomId: '!new_room:test' });

      const { createDirectRoom } = await import('../rooms');
      const roomId = await createDirectRoom('@alice:matrix.org');

      expect(roomId).toBe('!new_room:test');
      expect(mockAuthPost).toHaveBeenCalledWith(expect.any(String), {
        targetUserID: '@alice:matrix.org',
        targetPeerID: undefined,
        isDM: true,
      });
    });

    it('returns null when both targets are provided', async () => {
      const { authPost } = await import('../../api/helpers');
      const mockAuthPost = vi.mocked(authPost);

      const { createDirectRoom } = await import('../rooms');
      const roomId = await createDirectRoom('@alice:matrix.org', '12D3KooWAbc');

      expect(roomId).toBeNull();
      expect(mockAuthPost).not.toHaveBeenCalled();
    });

    it('returns null on request failure', async () => {
      const { authPost } = await import('../../api/helpers');
      const mockAuthPost = vi.mocked(authPost);
      mockAuthPost.mockRejectedValueOnce(new Error('Network error'));

      const { createDirectRoom } = await import('../rooms');
      const roomId = await createDirectRoom('', '12D3KooWAbc');

      expect(roomId).toBeNull();
    });
  });

  describe('getOrCreateDirectRoom', () => {
    it('reuses an existing direct room for the same peerID', async () => {
      const { authGet, authPost } = await import('../../api/helpers');
      const { batchGetProfileDisplayInfo } = await import('../../profileCache');
      const mockAuthGet = vi.mocked(authGet);
      const mockAuthPost = vi.mocked(authPost);
      const mockBatchGetProfileDisplayInfo = vi.mocked(batchGetProfileDisplayInfo);

      mockAuthGet.mockResolvedValueOnce([
        {
          roomId: '!dm_existing:test',
          name: 'Alice',
          isDirect: true,
          encrypted: true,
          unreadCount: 0,
          roomType: 'direct',
          members: [
            {
              userId: '@peer_me:test',
              displayName: 'Me',
              peerID: '12D3KooWMe',
              membership: 'join',
            },
            {
              userId: '@peer_alice:test',
              displayName: 'Alice',
              peerID: '12D3KooWAlice',
              membership: 'join',
            },
          ],
        },
      ]);
      mockBatchGetProfileDisplayInfo.mockResolvedValueOnce(new Map());

      const { getOrCreateDirectRoom } = await import('../rooms');
      const roomId = await getOrCreateDirectRoom('12D3KooWAlice', '@peer_me:test', null);

      expect(roomId).toBe('!dm_existing:test');
      expect(mockAuthPost).not.toHaveBeenCalled();
    });

    it('deduplicates concurrent creation requests for the same peerID', async () => {
      const { authGet, authPost } = await import('../../api/helpers');
      const mockAuthGet = vi.mocked(authGet);
      const mockAuthPost = vi.mocked(authPost);

      mockAuthGet.mockResolvedValueOnce([]);

      let resolveCreate: ((value: { roomId: string }) => void) | undefined;
      mockAuthPost.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveCreate = resolve;
          })
      );

      const { getOrCreateDirectRoom } = await import('../rooms');
      const req1 = getOrCreateDirectRoom('12D3KooWAlice', '@peer_me:test', null);
      const req2 = getOrCreateDirectRoom('12D3KooWAlice', '@peer_me:test', null);
      await vi.waitFor(() => {
        expect(mockAuthPost).toHaveBeenCalledTimes(1);
      });

      if (!resolveCreate) {
        throw new Error('expected create resolver to be set');
      }
      resolveCreate({ roomId: '!dm_created:test' });

      await expect(req1).resolves.toBe('!dm_created:test');
      await expect(req2).resolves.toBe('!dm_created:test');
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
