import { describe, expect, it } from 'vitest';
import {
  getMemberPresentation,
  getMessageSenderPresentation,
  getRoomPresentation,
} from '../presentation';
import type { MatrixRoom, MatrixUser } from '../types';

describe('matrix presentation selectors', () => {
  it('prefers the direct counterpart identity for direct rooms', () => {
    const room: MatrixRoom = {
      roomId: '!dm:test',
      name: 'Chat',
      isDirect: true,
      isEncrypted: true,
      unreadCount: 0,
      members: [
        {
          userId: '@peer_me:test',
          displayName: 'Me',
          peerID: '12D3KooWMe',
        },
        {
          userId: '@peer_alice:test',
          displayName: "Alice's Digital Shop",
          avatarUrl: '/matrix/alice.jpg',
          peerID: '12D3KooWAlice',
        },
      ],
      memberPeerIDs: {
        '@peer_me:test': '12D3KooWMe',
        '@peer_alice:test': '12D3KooWAlice',
      },
    };

    const presentation = getRoomPresentation(room, '@peer_me:test', 'Chat');

    expect(presentation.title).toBe("Alice's Digital Shop");
    expect(presentation.avatarUrl).toBe('/matrix/alice.jpg');
    expect(presentation.peerID).toBe('12D3KooWAlice');
    expect(presentation.isExternal).toBe(false);
  });

  it('prefers counterpart avatar over room-level avatar for direct rooms', () => {
    const room: MatrixRoom = {
      roomId: '!dm:test',
      name: 'Chat',
      avatarUrl: '/room-avatar.jpg',
      isDirect: true,
      isEncrypted: true,
      unreadCount: 0,
      members: [
        {
          userId: '@peer_me:test',
          displayName: 'Me',
          peerID: '12D3KooWMe',
        },
        {
          userId: '@peer_alice:test',
          displayName: "Alice's Digital Shop",
          avatarUrl: '/profile-avatar.jpg',
          peerID: '12D3KooWAlice',
        },
      ],
      memberPeerIDs: {
        '@peer_me:test': '12D3KooWMe',
        '@peer_alice:test': '12D3KooWAlice',
      },
    };

    const presentation = getRoomPresentation(room, '@peer_me:test', 'Chat');

    expect(presentation.avatarUrl).toBe('/profile-avatar.jpg');
  });

  it('prefers counterpart name over stale room-level name for direct rooms', () => {
    const room: MatrixRoom = {
      roomId: '!dm:test',
      name: 'Bob',
      isDirect: true,
      isEncrypted: true,
      unreadCount: 0,
      members: [
        {
          userId: '@peer_me:test',
          displayName: 'Me',
          peerID: '12D3KooWMe',
        },
        {
          userId: '@peer_alice:test',
          displayName: "Alice's Digital Shop",
          peerID: '12D3KooWAlice',
        },
      ],
      memberPeerIDs: {
        '@peer_me:test': '12D3KooWMe',
        '@peer_alice:test': '12D3KooWAlice',
      },
    };

    const presentation = getRoomPresentation(room, '@peer_me:test', 'Chat');
    expect(presentation.title).toBe("Alice's Digital Shop");
  });

  it('keeps external matrix users displayable without inventing peer ids', () => {
    const room: MatrixRoom = {
      roomId: '!dm:test',
      name: '',
      isDirect: true,
      isEncrypted: true,
      unreadCount: 0,
      members: [
        {
          userId: '@peer_me:test',
          displayName: 'Me',
        },
        {
          userId: '@alice:matrix.org',
          displayName: 'Alice Matrix',
          avatarUrl: 'mxc://matrix.org/abc',
        },
      ],
    };

    const presentation = getRoomPresentation(room, '@peer_me:test', 'Chat');

    expect(presentation.title).toBe('Alice Matrix');
    expect(presentation.peerID).toBeUndefined();
    expect(presentation.isExternal).toBe(true);
  });

  it('falls back to room-level identity when direct room has no counterpart member yet', () => {
    const room: MatrixRoom = {
      roomId: '!dm:test',
      name: "Alice's Digital Shop",
      avatarUrl: '/media/alice.jpg',
      isDirect: true,
      isEncrypted: true,
      unreadCount: 0,
      members: [
        {
          userId: '@peer_me:test',
          displayName: 'Bob',
          peerID: '12D3KooWMe',
        },
      ],
      metadata: {
        type: 'direct',
        direct_target_peer_id: '12D3KooWAlice',
      },
    };

    const presentation = getRoomPresentation(room, '@peer_me:test', 'Chat');

    expect(presentation.title).toBe("Alice's Digital Shop");
    expect(presentation.avatarUrl).toBe('/media/alice.jpg');
    expect(presentation.counterpart).toBeUndefined();
  });

  it('uses metadata peerID to resolve counterpart when current user id is stale', () => {
    const room: MatrixRoom = {
      roomId: '!dm:test',
      name: 'Chat',
      isDirect: true,
      isEncrypted: true,
      unreadCount: 0,
      members: [
        {
          userId: '@peer_me:test',
          displayName: 'Bob',
          peerID: '12D3KooWMe',
        },
        {
          userId: '@peer_alice:test',
          displayName: "Alice's Digital Shop",
          avatarUrl: '/matrix/alice.jpg',
          peerID: '12D3KooWAlice',
        },
      ],
      memberPeerIDs: {
        '@peer_me:test': '12D3KooWMe',
        '@peer_alice:test': '12D3KooWAlice',
      },
      metadata: {
        type: 'direct',
        direct_target_peer_id: '12D3KooWAlice',
      },
    };

    const presentation = getRoomPresentation(room, '@peer_me:test-mismatch-server', 'Chat');

    expect(presentation.title).toBe("Alice's Digital Shop");
    expect(presentation.peerID).toBe('12D3KooWAlice');
  });

  it('marks mobazha members with canonical peer ids as store-openable', () => {
    const member: MatrixUser = {
      userId: '@peer_12d3koowalice:matrix.local',
      displayName: 'Alice',
      avatarUrl: '/alice.jpg',
    };

    const room: MatrixRoom = {
      roomId: '!room:test',
      name: 'Test',
      isDirect: false,
      isEncrypted: true,
      unreadCount: 0,
      members: [member],
      memberPeerIDs: {
        '@peer_12d3koowalice:matrix.local': '12D3KooWAlice',
      },
    };

    const presentation = getMemberPresentation(member, room);

    expect(presentation.peerID).toBe('12D3KooWAlice');
    expect(presentation.isExternal).toBe(false);
    expect(presentation.canOpenStore).toBe(true);
  });

  it('resolves group message sender from room members', () => {
    const room: MatrixRoom = {
      roomId: '!group:test',
      name: 'Group',
      isDirect: false,
      isEncrypted: true,
      unreadCount: 0,
      members: [
        { userId: '@peer_me:test', displayName: 'Me' },
        {
          userId: '@peer_alice:test',
          displayName: 'Alice',
          avatarUrl: '/alice.jpg',
          rawMxcAvatarUrl: 'mxc://matrix.local/alice',
        },
      ],
    };

    const sender = getMessageSenderPresentation(room, '@peer_alice:test', '@peer_me:test');

    expect(sender.displayName).toBe('Alice');
    expect(sender.avatarUrl).toBe('/alice.jpg');
    expect(sender.rawMxcAvatarUrl).toBe('mxc://matrix.local/alice');
  });

  it('resolves direct message sender from counterpart when sender member is not yet loaded', () => {
    const room: MatrixRoom = {
      roomId: '!dm:test',
      name: "Alice's Digital Shop",
      avatarUrl: '/room-avatar.jpg',
      isDirect: true,
      isEncrypted: true,
      unreadCount: 0,
      members: [
        { userId: '@peer_me:test', displayName: 'Me' },
        {
          userId: '@peer_alice:test',
          displayName: "Alice's Digital Shop",
          avatarUrl: '/alice.jpg',
        },
      ],
    };

    const sender = getMessageSenderPresentation(
      room,
      '@peer_unknown:test',
      '@peer_me:test',
      undefined
    );

    expect(sender.displayName).toBe("Alice's Digital Shop");
    expect(sender.avatarUrl).toBe('/alice.jpg');
  });

  it('falls back to message metadata for external sender not in room state', () => {
    const room: MatrixRoom = {
      roomId: '!group:test',
      name: 'Group',
      isDirect: false,
      isEncrypted: true,
      unreadCount: 0,
      members: [{ userId: '@peer_me:test', displayName: 'Me' }],
    };

    const sender = getMessageSenderPresentation(room, '@alice:matrix.org', '@peer_me:test', {
      displayName: 'Alice Matrix',
      avatarUrl: 'https://matrix.org/avatar.jpg',
    });

    expect(sender.displayName).toBe('Alice Matrix');
    expect(sender.avatarUrl).toBe('https://matrix.org/avatar.jpg');
    expect(sender.isExternal).toBe(true);
  });
});
