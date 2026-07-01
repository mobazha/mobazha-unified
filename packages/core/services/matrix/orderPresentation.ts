import type { MatrixRoom, RoomMetadata } from './types';
import { getDirectCounterpart, getMemberPresentation } from './presentation';

export interface OrderThreadContext {
  orderId: string;
  productTitle?: string;
  orderState?: string;
  contractType?: string;
  counterpartName?: string;
  counterpartPeerID?: string;
  viewType: 'sale' | 'purchase';
  isDispute: boolean;
}

export function isOrderThreadRoom(room: MatrixRoom): boolean {
  return (
    room.roomType === 'order' ||
    room.roomType === 'moderator' ||
    Boolean(room.orderId || room.metadata?.orderId)
  );
}

export function parseProductTitleFromRoomName(name?: string): string | undefined {
  if (!name) return undefined;
  const trimmed = name.trim();
  const prefixed = trimmed.match(/^Order:\s*(.+)$/i);
  if (prefixed?.[1]) return prefixed[1].trim();
  if (trimmed.startsWith('Order ') && trimmed.length > 6) {
    return trimmed.slice(6).trim();
  }
  return undefined;
}

function normalizeUserID(userId?: string | null): string {
  return userId?.trim() || '';
}

function readMetadataTitle(metadata?: RoomMetadata): string | undefined {
  if (!metadata) return undefined;
  const customTitle = metadata.customData?.productTitle;
  if (typeof customTitle === 'string' && customTitle.trim()) {
    return customTitle.trim();
  }
  if (typeof metadata.title === 'string' && metadata.title.trim()) {
    return metadata.title.trim();
  }
  return undefined;
}

function readMetadataContractType(metadata?: RoomMetadata): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata.contractType === 'string' && metadata.contractType.trim()) {
    return metadata.contractType.trim();
  }
  const custom = metadata.customData?.contractType;
  if (typeof custom === 'string' && custom.trim()) {
    return custom.trim();
  }
  return undefined;
}

export function getOrderDetailViewType(
  currentPeerID: string | undefined,
  metadata?: RoomMetadata
): 'sale' | 'purchase' {
  if (metadata?.vendorId && currentPeerID === metadata.vendorId) return 'sale';
  if (metadata?.buyerId && currentPeerID === metadata.buyerId) return 'purchase';
  return 'purchase';
}

export function buildOrderDetailHref(
  orderId: string,
  viewType: 'sale' | 'purchase',
  tab?: 'discussion' | 'dispute'
): string {
  const params = new URLSearchParams({ type: viewType });
  if (tab) params.set('tab', tab);
  return `/orders/${orderId}?${params.toString()}`;
}

function resolveOrderCounterpart(
  room: MatrixRoom,
  currentMatrixUserId?: string | null,
  currentPeerID?: string | null
) {
  const normalizedCurrentUserID = normalizeUserID(currentMatrixUserId);
  const metadata = room.metadata;
  const preferredPeerID =
    currentPeerID && metadata?.vendorId === currentPeerID
      ? metadata.buyerId
      : currentPeerID && metadata?.buyerId === currentPeerID
        ? metadata.vendorId
        : metadata?.vendorId || metadata?.buyerId;

  if (preferredPeerID) {
    const preferredMember = room.members.find(
      member => getMemberPresentation(member, room).peerID === preferredPeerID
    );
    if (preferredMember) {
      return getMemberPresentation(preferredMember, room);
    }
  }

  if (normalizedCurrentUserID) {
    const otherMember = room.members.find(member => member.userId !== normalizedCurrentUserID);
    if (otherMember) {
      return getMemberPresentation(otherMember, room);
    }
  }

  const counterpart = getDirectCounterpart(room, currentMatrixUserId);
  return counterpart ? getMemberPresentation(counterpart, room) : undefined;
}

export function getOrderThreadContext(
  room: MatrixRoom,
  currentMatrixUserId?: string | null,
  currentPeerID?: string | null
): OrderThreadContext | null {
  if (!isOrderThreadRoom(room)) return null;

  const orderId = room.orderId || room.metadata?.orderId;
  if (!orderId) return null;

  const productTitle =
    readMetadataTitle(room.metadata) || parseProductTitleFromRoomName(room.name) || undefined;
  const counterpart = resolveOrderCounterpart(room, currentMatrixUserId, currentPeerID);

  return {
    orderId,
    productTitle,
    orderState: room.metadata?.orderState,
    contractType: readMetadataContractType(room.metadata),
    counterpartName: counterpart?.displayName,
    counterpartPeerID: counterpart?.peerID,
    viewType: getOrderDetailViewType(currentPeerID ?? undefined, room.metadata),
    isDispute: room.roomType === 'moderator' || room.metadata?.type === 'moderator',
  };
}
