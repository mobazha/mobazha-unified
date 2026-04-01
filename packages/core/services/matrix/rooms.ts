/**
 * Matrix 房间模块 — REST API 实现
 *
 * v1.2: 所有操作通过后端 REST API 完成，无 matrix-js-sdk 依赖。
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authPut } from '../api/helpers';
import { mxcToHttp, convertMessage } from './messages';
import { batchGetProfileDisplayInfo } from '../profileCache';
import type {
  MatrixRoom,
  MatrixUser,
  RoomType,
  InvitePolicy,
  BackendRoom,
  BackendMember,
} from './types';

const pendingDirectRoomCreates = new Map<string, Promise<string | null>>();

// ============ Public API ============

export async function getRooms(currentUserId?: string | null): Promise<MatrixRoom[]> {
  const backendRooms = await authGet<BackendRoom[]>(NODE_API.CHAT_ROOMS);
  const rooms = (backendRooms || []).map(r => convertRoom(r, 'join'));
  return enrichDirectRoomsWithProfiles(rooms, currentUserId);
}

export async function getInvitedRooms(): Promise<MatrixRoom[]> {
  const backendRooms = await authGet<BackendRoom[]>(NODE_API.CHAT_INVITES);
  return (backendRooms || []).map(r => convertRoom(r, 'invite'));
}

export async function getRoomsByType(type: RoomType): Promise<MatrixRoom[]> {
  const rooms = await getRooms();
  return rooms.filter(r => r.roomType === type);
}

export async function getOrCreateDirectRoom(
  peerID: string,
  currentUserId?: string | null,
  _serverName?: string | null,
  _displayName?: string
): Promise<string | null> {
  const targetPeerID = peerID?.trim();
  if (!targetPeerID) return null;

  const inFlight = pendingDirectRoomCreates.get(targetPeerID);
  if (inFlight) {
    return inFlight;
  }

  const request = (async (): Promise<string | null> => {
    try {
      const existingRoomId = await findExistingDirectRoomIdByPeerID(targetPeerID, currentUserId);
      if (existingRoomId) {
        return existingRoomId;
      }
    } catch (error) {
      console.warn('[Chat] getOrCreateDirectRoom fallback to create after lookup failure:', error);
    }

    return createDirectRoom('', targetPeerID);
  })();

  pendingDirectRoomCreates.set(targetPeerID, request);
  return request.finally(() => {
    pendingDirectRoomCreates.delete(targetPeerID);
  });
}

export async function createDirectRoom(userId: string, peerID?: string): Promise<string | null> {
  try {
    const targetUserID = userId?.trim();
    const targetPeerID = peerID?.trim();
    if (!targetUserID && !targetPeerID) return null;
    if (targetUserID && targetPeerID) return null;

    const resp = await authPost<{ roomId: string }>(NODE_API.CHAT_ROOMS, {
      targetUserID: targetUserID || undefined,
      targetPeerID: targetPeerID || undefined,
      isDM: true,
    });
    return resp.roomId;
  } catch (error) {
    console.error('[Chat] createDirectRoom failed:', error);
    return null;
  }
}

async function findExistingDirectRoomIdByPeerID(
  targetPeerID: string,
  currentUserId?: string | null
): Promise<string | null> {
  const rooms = await getRooms(currentUserId);
  for (const room of rooms) {
    if (!room.isDirect && room.roomType !== 'direct') continue;

    const counterpartyPeerID = getDirectCounterpartyPeerID(room, currentUserId);
    if (counterpartyPeerID === targetPeerID) {
      return room.roomId;
    }
  }
  return null;
}

export async function joinRoom(roomIdOrAlias: string): Promise<boolean> {
  try {
    await authPost(NODE_API.CHAT_ROOM_JOIN(roomIdOrAlias), {});
    return true;
  } catch (error) {
    console.error('[Chat] joinRoom failed:', error);
    return false;
  }
}

export async function leaveRoom(roomId: string): Promise<boolean> {
  try {
    await authPost(NODE_API.CHAT_ROOM_LEAVE(roomId), {});
    return true;
  } catch (error) {
    console.error('[Chat] leaveRoom failed:', error);
    return false;
  }
}

export async function inviteToRoom(roomId: string, userId: string): Promise<boolean> {
  try {
    await authPost(NODE_API.CHAT_ROOM_INVITE(roomId), { userID: userId });
    return true;
  } catch (error) {
    console.error('[Chat] inviteToRoom failed:', error);
    return false;
  }
}

export async function kickFromRoom(
  roomId: string,
  userId: string,
  _reason?: string
): Promise<boolean> {
  try {
    await authPost(NODE_API.CHAT_ROOM_KICK(roomId), { userID: userId });
    return true;
  } catch (error) {
    console.error('[Chat] kickFromRoom failed:', error);
    return false;
  }
}

export async function setRoomName(roomId: string, name: string): Promise<boolean> {
  try {
    await authPut(NODE_API.CHAT_ROOM_SETTINGS(roomId), { name });
    return true;
  } catch (error) {
    console.error('[Chat] setRoomName failed:', error);
    return false;
  }
}

export async function setRoomTopic(roomId: string, topic: string): Promise<boolean> {
  try {
    await authPut(NODE_API.CHAT_ROOM_SETTINGS(roomId), { topic });
    return true;
  } catch (error) {
    console.error('[Chat] setRoomTopic failed:', error);
    return false;
  }
}

export async function createGroupRoom(
  name: string,
  members: string[],
  _options?: { topic?: string; isEncrypted?: boolean }
): Promise<string | null> {
  try {
    const resp = await authPost<{ roomId: string }>(NODE_API.CHAT_ROOMS, {
      name,
      memberIDs: members,
      isDM: false,
    });
    return resp.roomId;
  } catch (error) {
    console.error('[Chat] createGroupRoom failed:', error);
    return null;
  }
}

export async function createOrderRoom(
  orderId: string,
  participants: string[],
  orderInfo?: { title?: string; vendorId?: string; buyerId?: string }
): Promise<string | null> {
  try {
    const resp = await authPost<{ roomId: string }>(NODE_API.CHAT_ROOMS, {
      name: orderInfo?.title ? `Order: ${orderInfo.title}` : `Order ${orderId}`,
      memberIDs: participants,
      isDM: false,
      metadata: { orderId, type: 'order', ...orderInfo },
    });
    return resp.roomId;
  } catch (error) {
    console.error('[Chat] createOrderRoom failed:', error);
    return null;
  }
}

export async function getOrderRoom(orderId: string): Promise<MatrixRoom | null> {
  const rooms = await getRooms();
  return rooms.find(r => r.orderId === orderId || r.metadata?.orderId === orderId) || null;
}

export async function createStoreRoom(
  storeId: string,
  storeInfo: { name: string; description?: string; ownerId: string }
): Promise<string | null> {
  try {
    const resp = await authPost<{ roomId: string }>(NODE_API.CHAT_ROOMS, {
      name: storeInfo.name,
      memberIDs: [storeInfo.ownerId],
      isDM: false,
      metadata: { storeId, type: 'store', storeName: storeInfo.name },
    });
    return resp.roomId;
  } catch (error) {
    console.error('[Chat] createStoreRoom failed:', error);
    return null;
  }
}

export async function getStoreRoom(storeId: string): Promise<MatrixRoom | null> {
  const rooms = await getRooms();
  return rooms.find(r => r.storeId === storeId || r.metadata?.storeId === storeId) || null;
}

export async function createModeratorRoom(
  orderId: string,
  moderatorId: string,
  participants: string[]
): Promise<string | null> {
  try {
    const resp = await authPost<{ roomId: string }>(NODE_API.CHAT_ROOMS, {
      name: `Dispute: Order ${orderId}`,
      memberIDs: participants,
      isDM: false,
      metadata: { orderId, moderatorId, type: 'moderator' },
    });
    return resp.roomId;
  } catch (error) {
    console.error('[Chat] createModeratorRoom failed:', error);
    return null;
  }
}

// ============ Profile ============

export async function setDisplayName(displayName: string): Promise<void> {
  await authPost(NODE_API.CHAT_PRESENCE, { displayName });
}

export async function syncProfileToMatrix(displayName: string, avatarHash?: string): Promise<void> {
  try {
    await authPost(NODE_API.CHAT_PRESENCE, {
      displayName,
      avatarHash: avatarHash || undefined,
    });
  } catch {
    // Profile sync is best-effort
  }
}

export function setMyPeerIDInRoom(_roomId: string): Promise<void> {
  // In v1.2, peerID state events are set by the backend during room creation
  return Promise.resolve();
}

export function isMobazhaUser(userId: string): boolean {
  return /^@peer_[a-z0-9]+:/i.test(userId);
}

// ============ Invite Policy ============

export async function loadInvitePolicy(): Promise<InvitePolicy> {
  try {
    const settings = await authGet<{ invitePolicy?: string }>(NODE_API.CHAT_SETTINGS);
    const p = settings?.invitePolicy;
    if (p === 'auto_all' || p === 'auto_mobazha' || p === 'always_confirm') {
      return p;
    }
  } catch {
    /* fallback on error */
  }
  return 'auto_mobazha';
}

export async function saveInvitePolicy(policy: InvitePolicy): Promise<void> {
  await authPut(NODE_API.CHAT_SETTINGS, { invitePolicy: policy });
}

// ============ Converters ============

function getDirectCounterpartyPeerID(
  room: MatrixRoom,
  currentUserId?: string | null
): string | undefined {
  const selfPeerID =
    room.members.find(member => member.userId === currentUserId)?.peerID ||
    (currentUserId ? room.memberPeerIDs?.[currentUserId] : undefined);

  const otherMember = room.members.find(member => member.userId !== currentUserId && member.peerID);
  if (otherMember?.peerID) {
    return otherMember.peerID;
  }

  if (room.memberPeerIDs) {
    for (const [userId, peerID] of Object.entries(room.memberPeerIDs)) {
      if (userId !== currentUserId && peerID) {
        return peerID;
      }
    }
  }

  const metadataPeerID = room.metadata?.direct_target_peer_id;
  if (metadataPeerID && (!selfPeerID || metadataPeerID !== selfPeerID)) {
    return metadataPeerID;
  }

  return undefined;
}

async function enrichDirectRoomsWithProfiles(
  rooms: MatrixRoom[],
  currentUserId?: string | null
): Promise<MatrixRoom[]> {
  if (!currentUserId) {
    return rooms;
  }

  const roomPeerIDs = new Map<string, string>();
  for (const room of rooms) {
    if (!room.isDirect) continue;

    const peerID = getDirectCounterpartyPeerID(room, currentUserId);
    if (peerID) {
      roomPeerIDs.set(room.roomId, peerID);
    }
  }

  if (roomPeerIDs.size === 0) {
    return rooms;
  }

  const profileMap = await batchGetProfileDisplayInfo([...new Set(roomPeerIDs.values())]);

  return rooms.map(room => {
    const peerID = roomPeerIDs.get(room.roomId);
    if (!peerID) return room;

    const profile = profileMap.get(peerID);
    if (!profile) {
      return room;
    }

    let membersChanged = false;
    const members = room.members.map(member => {
      if (member.userId === currentUserId) {
        return member;
      }

      const nextPeerID = member.peerID || peerID;
      const nextDisplayName = profile.name || member.displayName;
      const nextAvatarUrl = profile.avatar || member.avatarUrl;

      if (
        nextPeerID === member.peerID &&
        nextDisplayName === member.displayName &&
        nextAvatarUrl === member.avatarUrl
      ) {
        return member;
      }

      membersChanged = true;
      return {
        ...member,
        peerID: nextPeerID,
        ...(nextDisplayName ? { displayName: nextDisplayName } : {}),
        ...(nextAvatarUrl ? { avatarUrl: nextAvatarUrl } : {}),
      };
    });

    let memberPeerIDsChanged = false;
    let memberPeerIDs = room.memberPeerIDs || {};
    for (const member of room.members) {
      if (member.userId === currentUserId) {
        continue;
      }
      if (memberPeerIDs[member.userId] === peerID) {
        continue;
      }
      if (!memberPeerIDsChanged) {
        memberPeerIDs = { ...memberPeerIDs };
      }
      memberPeerIDsChanged = true;
      memberPeerIDs[member.userId] = peerID;
    }

    if (!membersChanged && !memberPeerIDsChanged) {
      return room;
    }

    return {
      ...room,
      members,
      memberPeerIDs,
    };
  });
}

function extractInviter(members?: BackendMember[]): string | undefined {
  if (!members) return undefined;
  const inviterMember = members.find(m => m.membership === 'join' || m.membership === 'invite');
  return inviterMember?.displayName || inviterMember?.userId;
}

function convertRoom(r: BackendRoom, membership: 'join' | 'invite' = 'join'): MatrixRoom {
  const members: MatrixUser[] = (r.members || []).map(convertMember);
  const memberPeerIDs: Record<string, string> = {};
  for (const m of members) {
    const pid = m.peerID;
    if (pid) {
      memberPeerIDs[m.userId] = pid;
    }
  }

  const inviter = membership === 'invite' ? extractInviter(r.members) : undefined;

  const room: MatrixRoom = {
    roomId: r.roomId,
    name: r.name || undefined,
    topic: r.topic || undefined,
    avatarUrl: r.avatarUrl ? mxcToHttp(r.avatarUrl) : undefined,
    rawMxcAvatarUrl: r.avatarUrl || undefined,
    isDirect: r.isDirect,
    isEncrypted: r.encrypted,
    unreadCount: r.unreadCount || 0,
    members,
    membership,
    inviter,
    roomType: (r.roomType as MatrixRoom['roomType']) || (r.isDirect ? 'direct' : 'group'),
    memberPeerIDs,
    metadata: r.metadata ? { ...r.metadata } : undefined,
  };

  if (r.metadata?.orderId) room.orderId = r.metadata.orderId;
  if (r.metadata?.storeId) room.storeId = r.metadata.storeId;
  if (r.metadata?.moderatorId) room.moderatorId = r.metadata.moderatorId;

  if (r.lastMessage) {
    room.lastMessage = convertMessage(r.lastMessage);
    room.timestamp = room.lastMessage.timestamp;
  }
  return room;
}

function convertMember(m: BackendMember): MatrixUser {
  return {
    userId: m.userId,
    displayName: m.displayName || undefined,
    avatarUrl: m.avatarUrl ? mxcToHttp(m.avatarUrl) : undefined,
    rawMxcAvatarUrl: m.avatarUrl || undefined,
    peerID: m.peerID || undefined,
  };
}
