/**
 * Matrix 房间模块 — REST API 实现
 *
 * v1.2: 所有操作通过后端 REST API 完成，无 matrix-js-sdk 依赖。
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authPut } from '../api/helpers';
import { mxcToHttp, convertMessage } from './messages';
import type {
  MatrixRoom,
  MatrixUser,
  RoomType,
  InvitePolicy,
  BackendRoom,
  BackendMember,
} from './types';

const INVITE_POLICY_KEY = '@matrix_invite_policy';

// ============ Public API ============

export async function getRooms(): Promise<MatrixRoom[]> {
  const backendRooms = await authGet<BackendRoom[]>(NODE_API.CHAT_ROOMS);
  return (backendRooms || []).map(convertRoom);
}

export async function getRoomsByType(type: RoomType): Promise<MatrixRoom[]> {
  const rooms = await getRooms();
  return rooms.filter(r => r.roomType === type);
}

export async function getOrCreateDirectRoom(
  peerID: string,
  serverName: string | null,
  _displayName?: string
): Promise<string | null> {
  const matrixUserId = peerIdToMatrixUserId(peerID, serverName);
  if (!matrixUserId) return null;
  return createDirectRoom(matrixUserId);
}

export async function createDirectRoom(userId: string): Promise<string | null> {
  try {
    const resp = await authPost<{ roomId: string }>(NODE_API.CHAT_ROOMS, {
      userID: userId,
      isDM: true,
    });
    return resp.roomId;
  } catch (error) {
    console.error('[Chat] createDirectRoom failed:', error);
    return null;
  }
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
  await authPost('/chat/presence', { displayName });
}

export async function syncProfileToMatrix(displayName: string, _avatarUrl?: string): Promise<void> {
  try {
    await setDisplayName(displayName);
  } catch {
    // Profile sync is best-effort
  }
}

export function setMyPeerIDInRoom(_roomId: string): Promise<void> {
  // In v1.2, peerID state events are set by the backend during room creation
  return Promise.resolve();
}

export function extractPeerIdFromUserId(userId: string): string | null {
  const match = userId.match(/^@peer_([a-z0-9]+):/i);
  return match ? match[1] : null;
}

export function isMobazhaUser(userId: string): boolean {
  return /^@peer_[a-z0-9]+:/i.test(userId);
}

// ============ Invite Policy ============

export function loadInvitePolicy(): InvitePolicy {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(INVITE_POLICY_KEY);
      if (stored === 'auto_all' || stored === 'auto_mobazha' || stored === 'always_confirm') {
        return stored;
      }
    }
  } catch {
    /* ignore */
  }
  return 'auto_mobazha';
}

export function saveInvitePolicy(policy: InvitePolicy): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(INVITE_POLICY_KEY, policy);
    }
  } catch {
    /* ignore */
  }
}

// ============ Converters ============

function convertRoom(r: BackendRoom): MatrixRoom {
  const members: MatrixUser[] = (r.members || []).map(convertMember);
  const memberPeerIDs: Record<string, string> = {};
  for (const m of members) {
    const pid = m.peerID || extractPeerIdFromUserId(m.userId);
    if (pid) {
      m.peerID = pid;
      memberPeerIDs[m.userId] = pid;
    }
  }

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
    membership: 'join',
    roomType: (r.roomType as MatrixRoom['roomType']) || (r.isDirect ? 'direct' : 'group'),
    memberPeerIDs,
    metadata: r.metadata
      ? {
          orderId: r.metadata.orderId,
          storeId: r.metadata.storeId,
          moderatorId: r.metadata.moderatorId,
          storeName: r.metadata.storeName,
        }
      : undefined,
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

function peerIdToMatrixUserId(peerID: string, serverName: string | null): string | null {
  if (!peerID) return null;
  const server = serverName || 'matrix.mobazha.org';
  return `@peer_${peerID.toLowerCase()}:${server}`;
}
