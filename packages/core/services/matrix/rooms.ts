/**
 * Matrix 房间模块
 * 房间 CRUD + 格式化 + 成员 + 邀请策略 + Profile 同步
 */

import type {
  MatrixContext,
  MatrixRoom,
  MatrixUser,
  MatrixMessage,
  InvitePolicy,
  RoomType,
} from './types';
import { MATRIX_EVENTS } from './types';
import { matrixEvents } from './events';
import { mxcToHttp, formatTimelineEvent } from './messages';

const INVITE_POLICY_STORAGE_KEY = 'matrix_invite_policy';

declare const localStorage: typeof globalThis.localStorage | undefined;

// ============ Pure helpers ============

export function extractPeerIdFromUserId(userId: string): string | null {
  const match = userId.match(/@peer_([^:]+):/);
  return match ? match[1] : null;
}

export function getMemberPeerID(
  ctx: MatrixContext,
  room: unknown,
  userId: string
): string | undefined {
  if (ctx.peerIdCache.has(userId)) {
    return ctx.peerIdCache.get(userId);
  }

  const r = room as {
    currentState?: {
      getStateEvents?: (type: string, stateKey?: string) => unknown;
    };
  };

  if (r.currentState?.getStateEvents) {
    try {
      const stateEvent = r.currentState.getStateEvents('org.mobazha.member_peerid', userId) as {
        getContent?: () => { peer_id?: string };
      } | null;
      if (stateEvent?.getContent) {
        const peerID = stateEvent.getContent().peer_id;
        if (peerID) {
          ctx.peerIdCache.set(userId, peerID);
          return peerID;
        }
      }
    } catch {
      // ignore
    }
  }

  const parsed = extractPeerIdFromUserId(userId);
  if (parsed) {
    ctx.peerIdCache.set(userId, parsed);
    return parsed;
  }

  return undefined;
}

export function isMobazhaUser(ctx: MatrixContext, userId: string): boolean {
  if (!ctx.serverConfig?.serverName) return false;
  return userId.endsWith(`:${ctx.serverConfig.serverName}`);
}

// ============ Room introspection ============

function isRoomEncrypted(room: unknown): boolean {
  const r = room as {
    currentState?: {
      getStateEvents?: (type: string, stateKey?: string) => unknown;
    };
  };

  if (r.currentState?.getStateEvents) {
    try {
      const encryptionEvent = r.currentState.getStateEvents('m.room.encryption', '');
      return !!encryptionEvent;
    } catch {
      return false;
    }
  }
  return false;
}

function getRoomUnreadCount(room: unknown): number {
  const r = room as {
    getUnreadNotificationCount?: (type?: string) => number;
  };
  if (r.getUnreadNotificationCount) {
    return r.getUnreadNotificationCount('total') || 0;
  }
  return 0;
}

export function isDirectRoom(ctx: MatrixContext, roomId: string): boolean {
  if (!ctx.client) return false;

  try {
    const matrixClient = ctx.client as {
      getRoom?: (roomId: string) => {
        getDMInviter?: () => string | null;
        getJoinedMemberCount?: () => number;
      } | null;
      getAccountData?: (type: string) => { getContent: () => Record<string, string[]> } | null;
    };

    const room = matrixClient.getRoom?.(roomId);

    if (room?.getDMInviter?.()) {
      return true;
    }

    if (matrixClient.getAccountData) {
      const directEvent = matrixClient.getAccountData('m.direct');
      if (directEvent) {
        const directContent = directEvent.getContent();
        for (const roomIds of Object.values(directContent)) {
          if (roomIds.includes(roomId)) {
            return true;
          }
        }
      }
    }

    // Fallback: untyped 2-member rooms are likely DMs.
    // Safe because formatRoom only calls this when mobazha.room.type is absent;
    // store/order/group rooms always have the state event set by the bot.
    if (room?.getJoinedMemberCount?.() === 2) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ============ Room members ============

export function getRoomMembers(ctx: MatrixContext, room: unknown): MatrixUser[] {
  const r = room as {
    getJoinedMembers?: () => Array<{
      userId: string;
      name?: string;
      getMxcAvatarUrl?: () => string | null;
    }>;
    getMembersWithMembership?: (membership: string) => Array<{
      userId: string;
      name?: string;
      getMxcAvatarUrl?: () => string | null;
    }>;
  };

  if (!r.getJoinedMembers) {
    return [];
  }

  try {
    const formatMember = (m: {
      userId: string;
      name?: string;
      getMxcAvatarUrl?: () => string | null;
    }): MatrixUser => {
      const rawMxcUrl = m.getMxcAvatarUrl?.() || undefined;
      const avatarUrl = rawMxcUrl ? mxcToHttp(ctx, rawMxcUrl, 48, 48) : undefined;
      const peerID = getMemberPeerID(ctx, room, m.userId);
      const serverName = ctx.serverConfig?.serverName;
      const isExternal = serverName ? !m.userId.endsWith(`:${serverName}`) : false;

      return {
        userId: m.userId,
        displayName: m.name,
        avatarUrl,
        rawMxcAvatarUrl: rawMxcUrl,
        peerID,
        isExternal,
      };
    };

    const joined = r.getJoinedMembers();
    const result = joined.filter(m => m.userId !== ctx.config?.userId).map(formatMember);

    if (result.length === 0 && r.getMembersWithMembership) {
      const invited = r.getMembersWithMembership('invite');
      const invitedOthers = invited.filter(m => m.userId !== ctx.config?.userId).map(formatMember);
      result.push(...invitedOthers);
    }

    return result;
  } catch {
    return [];
  }
}

// ============ Room formatting ============

export function formatRoom(ctx: MatrixContext, room: unknown): MatrixRoom {
  const r = room as {
    roomId: string;
    name?: string;
    normalizedName?: string;
    getMyMembership?: () => string;
    getDMInviter?: () => string | undefined;
    getJoinedMembers?: () => unknown[];
    getMxcAvatarUrl?: () => string | null;
    currentState?: {
      getStateEvents?: (type: string, stateKey?: string) => unknown;
    };
  };

  const membership = (r.getMyMembership?.() || 'join') as MatrixRoom['membership'];
  const inviter = r.getDMInviter?.();

  const roomMxcUrl = r.getMxcAvatarUrl?.() || null;
  const avatarUrl = roomMxcUrl ? mxcToHttp(ctx, roomMxcUrl, 64, 64) : undefined;

  let roomType: RoomType | undefined;
  let orderId: string | undefined;
  let storeId: string | undefined;
  let moderatorId: string | undefined;

  if (r.currentState?.getStateEvents) {
    try {
      const typeEvent = r.currentState.getStateEvents('mobazha.room.type', '') as {
        getContent?: () => {
          type?: string;
          orderId?: string;
          storeId?: string;
          moderatorId?: string;
        };
      } | null;

      if (typeEvent?.getContent) {
        const content = typeEvent.getContent();
        roomType = content.type as RoomType;
        orderId = content.orderId;
        storeId = content.storeId;
        moderatorId = content.moderatorId;
      }
    } catch {
      // Ignore state event errors
    }
  }

  const isDirect = roomType === 'direct' || (!roomType && isDirectRoom(ctx, r.roomId));

  const members = getRoomMembers(ctx, room);

  const memberPeerIDs: Record<string, string> = {};
  for (const m of members) {
    if (m.peerID) {
      memberPeerIDs[m.userId] = m.peerID;
    }
  }

  let roomName = r.name || r.normalizedName;
  if (isDirect && members.length > 0) {
    const partner = members[0];
    if (partner.displayName && partner.displayName !== partner.userId) {
      roomName = partner.displayName;
    }
  }

  let finalAvatarUrl = avatarUrl;
  let finalMxcUrl = roomMxcUrl;
  if (!finalAvatarUrl && members.length > 0) {
    finalAvatarUrl = members[0].avatarUrl;
    finalMxcUrl = members[0].rawMxcAvatarUrl || null;
  }

  // Extract last message from timeline for initial room list display
  let lastMessage: import('./types').MatrixMessage | undefined;
  let timestamp: number | undefined;
  try {
    const tlRoom = room as { getLiveTimeline?: () => { getEvents: () => unknown[] } };
    const events = tlRoom.getLiveTimeline?.()?.getEvents();
    if (events) {
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i] as { getType?: () => string };
        if (ev.getType?.() === 'm.room.message') {
          const msg = formatTimelineEvent(ctx, events[i], r.roomId);
          if (msg) {
            lastMessage = msg;
            timestamp = msg.timestamp;
            break;
          }
        }
      }
    }
  } catch {
    // Timeline not yet available during initial sync
  }

  return {
    roomId: r.roomId,
    name: roomName,
    avatarUrl: finalAvatarUrl,
    rawMxcAvatarUrl: finalMxcUrl || undefined,
    isDirect,
    isEncrypted: isRoomEncrypted(room),
    unreadCount: getRoomUnreadCount(room),
    lastMessage,
    timestamp,
    members,
    membership,
    inviter,
    roomType: isDirect ? 'direct' : roomType,
    orderId,
    storeId,
    moderatorId,
    memberPeerIDs,
  };
}

// ============ Room CRUD ============

function isSpaceRoom(room: unknown): boolean {
  const r = room as {
    currentState?: {
      getStateEvents?: (type: string, stateKey?: string) => unknown;
    };
    getType?: () => string | undefined;
  };

  if (r.getType?.() === 'm.space') return true;

  if (r.currentState?.getStateEvents) {
    try {
      const createEvent = r.currentState.getStateEvents('m.room.create', '') as {
        getContent?: () => { type?: string };
      } | null;
      if (createEvent?.getContent?.().type === 'm.space') return true;
    } catch {
      // ignore
    }
  }
  return false;
}

export async function getRooms(ctx: MatrixContext): Promise<MatrixRoom[]> {
  if (!ctx.client) return [];
  const rooms = ctx.client.getRooms();
  return rooms.filter(room => !isSpaceRoom(room)).map(room => formatRoom(ctx, room));
}

export async function getRoomsByType(
  ctx: MatrixContext,
  type: 'direct' | 'group' | 'order' | 'store' | 'moderator'
): Promise<MatrixRoom[]> {
  const rooms = await getRooms(ctx);
  return rooms.filter(r => {
    if (type === 'direct') return r.isDirect;
    return r.roomType === type;
  });
}

export async function findDirectRoom(ctx: MatrixContext, userId: string): Promise<string | null> {
  if (!ctx.client) return null;

  try {
    const matrixClient = ctx.client as unknown as {
      getAccountData: (type: string) => { getContent: () => Record<string, string[]> } | null;
      getRoom: (roomId: string) => { getMyMembership: () => string } | null;
    };

    const directEvent = matrixClient.getAccountData('m.direct');
    if (!directEvent) return null;

    const directContent = directEvent.getContent();
    const roomIds = directContent[userId];

    if (!roomIds || roomIds.length === 0) return null;

    let inviteRoomId: string | null = null;
    for (const roomId of roomIds) {
      const room = matrixClient.getRoom(roomId);
      if (!room) continue;
      const membership = room.getMyMembership();
      if (membership === 'join') return roomId;
      if (membership === 'invite' && !inviteRoomId) inviteRoomId = roomId;
    }

    return inviteRoomId;
  } catch (error) {
    console.warn('[Matrix] Failed to find direct room:', error);
    return null;
  }
}

async function updateDirectRoomMapping(
  ctx: MatrixContext,
  userId: string,
  roomId: string
): Promise<void> {
  if (!ctx.client) return;

  try {
    const matrixClient = ctx.client as unknown as {
      getAccountData: (type: string) => { getContent: () => Record<string, string[]> } | null;
      setAccountData: (type: string, content: Record<string, string[]>) => Promise<void>;
    };

    const directEvent = matrixClient.getAccountData('m.direct');
    const directContent: Record<string, string[]> = directEvent?.getContent() || {};

    if (!directContent[userId]) {
      directContent[userId] = [];
    }
    if (!directContent[userId].includes(roomId)) {
      directContent[userId].push(roomId);
    }

    await matrixClient.setAccountData('m.direct', directContent);
  } catch (error) {
    console.warn('[Matrix] Failed to update m.direct:', error);
  }
}

export async function setMyPeerIDInRoom(ctx: MatrixContext, roomId: string): Promise<void> {
  if (!ctx.client || !ctx.currentPeerID || !ctx.config?.userId) return;
  try {
    const matrixClient = ctx.client;
    const room = matrixClient.getRoom(roomId);

    if (room) {
      const state = (
        room as { currentState?: { getStateEvents?: (t: string, k?: string) => unknown } }
      ).currentState;
      if (state?.getStateEvents) {
        const existing = state.getStateEvents('org.mobazha.member_peerid', ctx.config.userId) as {
          getContent?: () => { peer_id?: string };
        } | null;
        if (existing?.getContent?.().peer_id === ctx.currentPeerID) return;

        const plEvent = state.getStateEvents('m.room.power_levels', '') as {
          getContent?: () => {
            users?: Record<string, number>;
            users_default?: number;
            state_default?: number;
            events?: Record<string, number>;
          };
        } | null;
        if (plEvent?.getContent) {
          const pl = plEvent.getContent();
          const myLevel = pl.users?.[ctx.config.userId] ?? pl.users_default ?? 0;
          const requiredLevel = pl.events?.['org.mobazha.member_peerid'] ?? pl.state_default ?? 50;
          if (myLevel < requiredLevel) return;
        }
      }
    }

    await (
      matrixClient as unknown as {
        sendStateEvent(
          roomId: string,
          eventType: string,
          content: Record<string, unknown>,
          stateKey: string
        ): Promise<unknown>;
      }
    ).sendStateEvent(
      roomId,
      'org.mobazha.member_peerid',
      { peer_id: ctx.currentPeerID },
      ctx.config.userId
    );
  } catch (e) {
    console.warn('[Matrix] setMyPeerIDInRoom failed:', e);
  }
}

export async function createDirectRoom(
  ctx: MatrixContext,
  userId: string,
  displayName?: string
): Promise<string | null> {
  if (!ctx.client) return null;

  try {
    const sdk = await import('matrix-js-sdk');

    const existingRoom = await findDirectRoom(ctx, userId);
    if (existingRoom) return existingRoom;

    const response = await ctx.client.createRoom({
      is_direct: true,
      invite: [userId],
      name: displayName,
      preset: sdk.Preset.TrustedPrivateChat,
      power_level_content_override: {
        events: {
          'org.mobazha.member_peerid': 0,
        },
      },
    });

    await updateDirectRoomMapping(ctx, userId, response.room_id);
    await setMyPeerIDInRoom(ctx, response.room_id);

    return response.room_id;
  } catch (error) {
    console.error('[Matrix] Create room failed:', error);
    return null;
  }
}

export async function getOrCreateDirectRoom(
  ctx: MatrixContext,
  peerID: string,
  displayName?: string
): Promise<string | null> {
  if (!ctx.serverConfig) return null;
  if (ctx.currentPeerID && peerID === ctx.currentPeerID) {
    console.warn('[Matrix] Blocked self-DM creation');
    return null;
  }
  const matrixUserId = `@peer_${peerID.toLowerCase()}:${ctx.serverConfig.serverName}`;
  return createDirectRoom(ctx, matrixUserId, displayName);
}

export async function joinRoom(ctx: MatrixContext, roomIdOrAlias: string): Promise<boolean> {
  if (!ctx.client) return false;

  try {
    await ctx.client.joinRoom(roomIdOrAlias);
    matrixEvents.emit(MATRIX_EVENTS.ROOM_JOINED, { roomId: roomIdOrAlias });
    return true;
  } catch (error) {
    console.error('[Matrix] Join room failed:', error);
    return false;
  }
}

export async function leaveRoom(ctx: MatrixContext, roomId: string): Promise<boolean> {
  if (!ctx.client) return false;

  try {
    await ctx.client.leave(roomId);
    matrixEvents.emit(MATRIX_EVENTS.ROOM_LEFT, { roomId });
    return true;
  } catch (error) {
    console.error('[Matrix] Leave room failed:', error);
    return false;
  }
}

export async function inviteToRoom(
  ctx: MatrixContext,
  roomId: string,
  userId: string
): Promise<boolean> {
  if (!ctx.client) return false;

  try {
    await ctx.client.invite(roomId, userId);
    return true;
  } catch (error) {
    console.error('[Matrix] Invite to room failed:', error);
    return false;
  }
}

export async function kickFromRoom(
  ctx: MatrixContext,
  roomId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  if (!ctx.client) return false;

  try {
    await ctx.client.kick(roomId, userId, reason);
    return true;
  } catch (error) {
    console.error('[Matrix] Kick from room failed:', error);
    return false;
  }
}

export async function setRoomName(
  ctx: MatrixContext,
  roomId: string,
  name: string
): Promise<boolean> {
  if (!ctx.client) return false;

  try {
    await ctx.client.setRoomName(roomId, name);
    return true;
  } catch (error) {
    console.error('[Matrix] Set room name failed:', error);
    return false;
  }
}

export async function setRoomTopic(
  ctx: MatrixContext,
  roomId: string,
  topic: string
): Promise<boolean> {
  if (!ctx.client) return false;

  try {
    await ctx.client.setRoomTopic(roomId, topic);
    return true;
  } catch (error) {
    console.error('[Matrix] Set room topic failed:', error);
    return false;
  }
}

// ============ Typed room creation ============

export async function createOrderRoom(
  ctx: MatrixContext,
  orderId: string,
  participants: string[],
  orderInfo?: { title?: string; vendorId?: string; buyerId?: string }
): Promise<string | null> {
  if (!ctx.client) return null;

  try {
    const sdk = await import('matrix-js-sdk');

    const roomName = orderInfo?.title
      ? `Order: ${orderInfo.title}`
      : `Order Discussion: ${orderId.slice(0, 8)}`;

    const response = await ctx.client.createRoom({
      name: roomName,
      topic: `Order discussion for ${orderId}`,
      invite: participants,
      preset: sdk.Preset.PrivateChat,
      initial_state: [
        {
          type: 'mobazha.room.type',
          content: { type: 'order', orderId },
          state_key: '',
        },
        {
          type: 'mobazha.order.info',
          content: {
            orderId,
            vendorId: orderInfo?.vendorId,
            buyerId: orderInfo?.buyerId,
          },
          state_key: '',
        },
      ],
    });

    return response.room_id;
  } catch (error) {
    console.error('[Matrix] Create order room failed:', error);
    return null;
  }
}

export async function getOrderRoom(
  ctx: MatrixContext,
  orderId: string
): Promise<MatrixRoom | null> {
  const rooms = await getRooms(ctx);
  return rooms.find(r => r.orderId === orderId) || null;
}

export async function createStoreRoom(
  ctx: MatrixContext,
  storeId: string,
  storeInfo: { name: string; description?: string; ownerId: string }
): Promise<string | null> {
  if (!ctx.client) return null;

  try {
    const sdk = await import('matrix-js-sdk');

    const response = await ctx.client.createRoom({
      name: `${storeInfo.name} Community`,
      topic: storeInfo.description || `Community chat for ${storeInfo.name}`,
      preset: sdk.Preset.PublicChat,
      visibility: sdk.Visibility.Public,
      initial_state: [
        {
          type: 'mobazha.room.type',
          content: { type: 'store', storeId },
          state_key: '',
        },
        {
          type: 'mobazha.store.info',
          content: {
            storeId,
            storeName: storeInfo.name,
            ownerId: storeInfo.ownerId,
          },
          state_key: '',
        },
      ],
    });

    return response.room_id;
  } catch (error) {
    console.error('[Matrix] Create store room failed:', error);
    return null;
  }
}

export async function getStoreRoom(
  ctx: MatrixContext,
  storeId: string
): Promise<MatrixRoom | null> {
  const rooms = await getRooms(ctx);
  return rooms.find(r => r.storeId === storeId) || null;
}

export async function createModeratorRoom(
  ctx: MatrixContext,
  orderId: string,
  moderatorId: string,
  participants: string[]
): Promise<string | null> {
  if (!ctx.client) return null;

  try {
    const sdk = await import('matrix-js-sdk');

    const response = await ctx.client.createRoom({
      name: `Dispute: ${orderId.slice(0, 8)}`,
      topic: `Dispute discussion for order ${orderId}`,
      invite: [moderatorId, ...participants],
      preset: sdk.Preset.TrustedPrivateChat,
      initial_state: [
        {
          type: 'mobazha.room.type',
          content: { type: 'moderator', orderId, moderatorId },
          state_key: '',
        },
      ],
    });

    return response.room_id;
  } catch (error) {
    console.error('[Matrix] Create moderator room failed:', error);
    return null;
  }
}

export async function createGroupRoom(
  ctx: MatrixContext,
  name: string,
  membersList: string[],
  options?: { topic?: string; isEncrypted?: boolean }
): Promise<string | null> {
  if (!ctx.client) return null;

  try {
    const sdk = await import('matrix-js-sdk');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initialState: any[] = [
      {
        type: 'mobazha.room.type',
        content: { type: 'group' },
        state_key: '',
      },
    ];

    if (options?.isEncrypted) {
      initialState.push({
        type: 'm.room.encryption',
        content: { algorithm: 'm.megolm.v1.aes-sha2' },
        state_key: '',
      });
    }

    const response = await ctx.client.createRoom({
      name,
      topic: options?.topic,
      invite: membersList,
      preset: sdk.Preset.PrivateChat,
      initial_state: initialState,
    });

    return response.room_id;
  } catch (error) {
    console.error('[Matrix] Create group room failed:', error);
    return null;
  }
}

// ============ Invite policy ============

export function loadInvitePolicy(): InvitePolicy {
  if (typeof localStorage === 'undefined') return 'auto_mobazha';
  try {
    const saved = localStorage.getItem(INVITE_POLICY_STORAGE_KEY);
    if (saved === 'auto_all' || saved === 'auto_mobazha' || saved === 'always_confirm') {
      return saved;
    }
  } catch {
    // localStorage unavailable
  }
  return 'auto_mobazha';
}

export function saveInvitePolicy(policy: InvitePolicy): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(INVITE_POLICY_STORAGE_KEY, policy);
  } catch {
    // localStorage unavailable or full
  }
}

export async function handleRoomInvite(
  ctx: MatrixContext,
  roomId: string,
  inviter: string | undefined,
  invitePolicy: InvitePolicy
): Promise<void> {
  if (!ctx.client || !inviter) return;

  let shouldAutoAccept = false;
  switch (invitePolicy) {
    case 'auto_all':
      shouldAutoAccept = true;
      break;
    case 'auto_mobazha':
      shouldAutoAccept = isMobazhaUser(ctx, inviter);
      break;
    case 'always_confirm':
      shouldAutoAccept = false;
      break;
    default:
      shouldAutoAccept = isMobazhaUser(ctx, inviter);
  }

  if (shouldAutoAccept) {
    try {
      await ctx.client.joinRoom(roomId);
      matrixEvents.emit(MATRIX_EVENTS.ROOM_JOINED, { roomId });
      console.warn('[Matrix] Auto-joined room based on invite policy:', roomId);
    } catch (error) {
      console.error('[Matrix] Auto-join failed for room:', roomId, error);
    }
  }
}

// ============ Profile sync ============

export async function setDisplayName(ctx: MatrixContext, displayName: string): Promise<void> {
  if (!ctx.client) return;
  await ctx.client.setDisplayName(displayName);
}

export async function syncProfileToMatrix(
  ctx: MatrixContext,
  displayName: string,
  avatarUrl?: string
): Promise<void> {
  if (!ctx.client) return;

  try {
    await ctx.client.setDisplayName(displayName);
  } catch (e) {
    console.warn('[Matrix] setDisplayName failed:', e);
  }

  if (avatarUrl) {
    try {
      const resp = await fetch(avatarUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        const file = new File([blob], 'avatar', { type: blob.type || 'image/jpeg' });
        const uploadResp = await ctx.client.uploadContent(file, { type: file.type });
        const mxcUrl =
          typeof uploadResp === 'string'
            ? uploadResp
            : (uploadResp as { content_uri?: string }).content_uri;
        if (mxcUrl) {
          await ctx.client.setAvatarUrl(mxcUrl);
        }
      }
    } catch (e) {
      console.warn('[Matrix] avatar sync failed:', e);
    }
  }
}

// ============ Room messages (delegated to messages module) ============

export async function getLastMessageForRoom(
  ctx: MatrixContext,
  roomId: string
): Promise<MatrixMessage | null> {
  if (!ctx.client) return null;

  const room = ctx.client.getRoom(roomId);
  if (!room) return null;

  const timeline = room.getLiveTimeline();
  const events = timeline.getEvents();

  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    const type = event.getType();
    if (type === 'm.room.message') {
      const formatted = formatTimelineEvent(ctx, event, roomId);
      if (formatted) return formatted;
    }
  }

  return null;
}
