import type { MatrixRoom, MatrixUser } from './types';
import { isMobazhaUser } from './rooms';
import {
  getOrderThreadContext,
  isOrderThreadRoom,
  parseProductTitleFromRoomName,
} from './orderPresentation';

export interface MatrixMemberPresentation {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  rawMxcAvatarUrl?: string;
  peerID?: string;
  isExternal: boolean;
  canOpenStore: boolean;
}

export interface MatrixRoomPresentation {
  roomId: string;
  title: string;
  avatarUrl?: string;
  rawMxcAvatarUrl?: string;
  peerID?: string;
  isExternal: boolean;
  counterpart?: MatrixMemberPresentation;
  orderThread?: ReturnType<typeof getOrderThreadContext>;
}

export interface MatrixSenderFallback {
  displayName?: string;
  avatarUrl?: string;
  rawMxcAvatarUrl?: string;
}

function hasMeaningfulName(name?: string | null): boolean {
  const normalized = name?.trim().toLowerCase();
  return Boolean(normalized && normalized !== 'chat' && normalized !== '聊天');
}

function normalizeUserID(userId?: string | null): string {
  return userId?.trim() || '';
}

function getResolvedPeerID(member: MatrixUser, room?: MatrixRoom): string | undefined {
  return member.peerID || room?.memberPeerIDs?.[member.userId] || undefined;
}

function getMemberFallbackName(member: MatrixUser): string {
  return member.displayName?.trim() || member.userId || 'User';
}

function buildPresentationFromFields(input: {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  rawMxcAvatarUrl?: string;
  peerID?: string;
  isExternal?: boolean;
}): MatrixMemberPresentation {
  const displayName = input.displayName?.trim() || input.userId || 'User';
  const isExternal = input.isExternal ?? !isMobazhaUser(input.userId);
  const peerID = input.peerID;

  return {
    userId: input.userId,
    displayName,
    avatarUrl: input.avatarUrl,
    rawMxcAvatarUrl: input.rawMxcAvatarUrl,
    peerID,
    isExternal,
    canOpenStore: Boolean(peerID) && !isExternal,
  };
}

export function getMemberPresentation(
  member: MatrixUser,
  room?: MatrixRoom
): MatrixMemberPresentation {
  return buildPresentationFromFields({
    userId: member.userId,
    displayName: getMemberFallbackName(member),
    avatarUrl: member.avatarUrl,
    rawMxcAvatarUrl: member.rawMxcAvatarUrl,
    peerID: getResolvedPeerID(member, room),
    isExternal: member.isExternal ?? !isMobazhaUser(member.userId),
  });
}

export function getMessageSenderPresentation(
  room: MatrixRoom | undefined,
  senderId: string,
  currentUserId?: string | null,
  fallback?: MatrixSenderFallback
): MatrixMemberPresentation {
  if (!senderId) {
    return buildPresentationFromFields({
      userId: '',
      displayName: fallback?.displayName || 'User',
      avatarUrl: fallback?.avatarUrl,
      rawMxcAvatarUrl: fallback?.rawMxcAvatarUrl,
      isExternal: false,
    });
  }

  if (!room) {
    return buildPresentationFromFields({
      userId: senderId,
      displayName: fallback?.displayName,
      avatarUrl: fallback?.avatarUrl,
      rawMxcAvatarUrl: fallback?.rawMxcAvatarUrl,
    });
  }

  const member = room.members.find(m => m.userId === senderId);
  if (member) {
    const memberPresentation = getMemberPresentation(member, room);
    return buildPresentationFromFields({
      userId: memberPresentation.userId,
      displayName: memberPresentation.displayName || fallback?.displayName,
      avatarUrl: memberPresentation.avatarUrl || fallback?.avatarUrl,
      rawMxcAvatarUrl: memberPresentation.rawMxcAvatarUrl || fallback?.rawMxcAvatarUrl,
      peerID: memberPresentation.peerID,
      isExternal: memberPresentation.isExternal,
    });
  }

  const normalizedCurrentUserID = normalizeUserID(currentUserId);
  const canUseDirectCounterpartFallback = room.isDirect && senderId !== normalizedCurrentUserID;
  const counterpart = canUseDirectCounterpartFallback
    ? getDirectCounterpart(room, currentUserId)
    : undefined;
  const counterpartPresentation = counterpart
    ? getMemberPresentation(counterpart, room)
    : undefined;

  return buildPresentationFromFields({
    userId: senderId,
    displayName:
      fallback?.displayName ||
      counterpartPresentation?.displayName ||
      (canUseDirectCounterpartFallback && hasMeaningfulName(room.name)
        ? room.name?.trim()
        : undefined),
    avatarUrl:
      fallback?.avatarUrl ||
      counterpartPresentation?.avatarUrl ||
      (canUseDirectCounterpartFallback ? room.avatarUrl : undefined),
    rawMxcAvatarUrl:
      fallback?.rawMxcAvatarUrl ||
      counterpartPresentation?.rawMxcAvatarUrl ||
      (canUseDirectCounterpartFallback ? room.rawMxcAvatarUrl : undefined),
    peerID:
      room.memberPeerIDs?.[senderId] ||
      (canUseDirectCounterpartFallback ? counterpartPresentation?.peerID : undefined),
    isExternal: counterpartPresentation?.isExternal ?? room.isExternal ?? !isMobazhaUser(senderId),
  });
}

export function getDirectCounterpart(
  room: MatrixRoom,
  currentUserId?: string | null
): MatrixUser | undefined {
  if (!room.members.length) return undefined;

  const normalizedCurrentUserID = normalizeUserID(currentUserId);
  if (normalizedCurrentUserID) {
    const hasCurrentUserInRoom = room.members.some(
      member => member.userId === normalizedCurrentUserID
    );
    if (hasCurrentUserInRoom) {
      return room.members.find(member => member.userId !== normalizedCurrentUserID);
    }
  }

  const targetPeerID = room.metadata?.direct_target_peer_id?.trim();
  if (targetPeerID) {
    const metadataCounterpart = room.members.find(
      member => getResolvedPeerID(member, room) === targetPeerID
    );
    if (metadataCounterpart) {
      return metadataCounterpart;
    }
  }

  if (room.members.length <= 1) {
    return undefined;
  }

  return room.members[0];
}

export function getRoomPresentation(
  room: MatrixRoom,
  currentUserId?: string | null,
  defaultTitle = 'Chat'
): MatrixRoomPresentation {
  if (isOrderThreadRoom(room)) {
    const orderThread = getOrderThreadContext(room, currentUserId);
    const counterpart = resolveOrderCounterpartForPresentation(room, currentUserId);
    return {
      roomId: room.roomId,
      title:
        orderThread?.productTitle ||
        parseProductTitleFromRoomName(room.name) ||
        room.name?.trim() ||
        defaultTitle,
      avatarUrl: counterpart?.avatarUrl || room.avatarUrl,
      rawMxcAvatarUrl: counterpart?.rawMxcAvatarUrl || room.rawMxcAvatarUrl,
      peerID: counterpart?.peerID,
      isExternal: counterpart?.isExternal ?? Boolean(room.isExternal),
      counterpart,
      orderThread: orderThread ?? undefined,
    };
  }

  if (!room.isDirect) {
    return {
      roomId: room.roomId,
      title: room.name?.trim() || defaultTitle,
      avatarUrl: room.avatarUrl,
      rawMxcAvatarUrl: room.rawMxcAvatarUrl,
      isExternal: Boolean(room.isExternal),
    };
  }

  const counterpart = getDirectCounterpart(room, currentUserId);
  const counterpartPresentation = counterpart
    ? getMemberPresentation(counterpart, room)
    : undefined;

  return {
    roomId: room.roomId,
    title:
      counterpartPresentation?.displayName ||
      (hasMeaningfulName(room.name) ? room.name?.trim() : undefined) ||
      defaultTitle,
    avatarUrl: counterpartPresentation?.avatarUrl || room.avatarUrl,
    rawMxcAvatarUrl: counterpartPresentation?.rawMxcAvatarUrl || room.rawMxcAvatarUrl,
    peerID: counterpartPresentation?.peerID,
    isExternal: counterpartPresentation?.isExternal ?? Boolean(room.isExternal),
    counterpart: counterpartPresentation,
  };
}

function resolveOrderCounterpartForPresentation(
  room: MatrixRoom,
  currentUserId?: string | null
): MatrixMemberPresentation | undefined {
  const normalizedCurrentUserID = normalizeUserID(currentUserId);
  if (normalizedCurrentUserID) {
    const otherMember = room.members.find(member => member.userId !== normalizedCurrentUserID);
    if (otherMember) {
      return getMemberPresentation(otherMember, room);
    }
  }
  const counterpart = getDirectCounterpart(room, currentUserId);
  return counterpart ? getMemberPresentation(counterpart, room) : undefined;
}
