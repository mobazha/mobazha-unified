/**
 * Matrix 事件监听器 — WebSocket 实现
 *
 * v1.2: 监听后端通过 WebSocket 推送的 chat.* 事件，
 * 映射到前端 MATRIX_EVENTS，UI 组件无需改动。
 */

import { matrixEvents } from './events';
import { MATRIX_EVENTS } from './types';
import { convertMessage } from './messages';
import { onWebSocketMessage, onWebSocketStatusChange, type WebSocketMessage } from '../websocket';

export interface EventListenerCallbacks {
  processedMessageIds: Set<string>;
  onSyncStateChange: (connected: boolean) => void;
}

/**
 * Subscribe to backend WebSocket chat events and forward them to matrixEvents.
 * Returns a cleanup function.
 */
export function setupChatEventListeners(callbacks: EventListenerCallbacks): () => void {
  const { processedMessageIds, onSyncStateChange } = callbacks;
  const cleanups: (() => void)[] = [];

  const handleWsMessage = (msg: WebSocketMessage) => {
    const wsType = msg.type || '';
    const payload = msg.data;

    switch (wsType) {
      case 'chat.message':
        handleChatMessage(payload, processedMessageIds);
        break;
      case 'chat.message_edit':
        handleChatEdit(payload);
        break;
      case 'chat.message_redact':
        handleChatRedact(payload);
        break;
      case 'chat.typing':
        handleChatTyping(payload);
        break;
      case 'chat.read_receipt':
        handleChatReadReceipt(payload);
        break;
      case 'chat.room_member':
        handleChatRoomMember(payload);
        break;
      case 'chat.invite':
        handleChatInvite(payload);
        break;
      case 'chat.room_state':
        handleChatRoomState(payload);
        break;
      case 'chat.verification.request':
        matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_REQUEST_RECEIVED, payload);
        break;
      case 'chat.verification.ready':
        matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_READY, payload);
        break;
      case 'chat.verification.show_sas':
        matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_SHOW_SAS, payload);
        break;
      case 'chat.verification.done':
        matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_COMPLETED, payload);
        break;
      case 'chat.verification.cancelled':
        matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_CANCELLED, payload);
        break;
      default:
        break;
    }
  };

  const handleWsStatus = (status: string) => {
    if (status === 'disconnected' || status === 'error') {
      onSyncStateChange(false);
      matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
    } else if (status === 'connected') {
      onSyncStateChange(true);
      matrixEvents.emit(MATRIX_EVENTS.CONNECTED);
    }
  };

  cleanups.push(onWebSocketMessage(handleWsMessage));
  cleanups.push(onWebSocketStatusChange(handleWsStatus));

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

// ============ Event Handlers ============

function handleChatMessage(payload: unknown, processedIds: Set<string>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = payload as any;
  if (!p) return;
  const eventId = p.eventID || p.eventId || p.id;
  if (!eventId) return;
  if (processedIds.has(eventId)) return;
  processedIds.add(eventId);

  if (p.msgType || p.content !== undefined) {
    const message = convertMessage(p);
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_RECEIVED, message);
  } else {
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_RECEIVED, {
      id: eventId,
      roomId: p.roomID || p.roomId,
      sender: p.sender,
      content: p.content || '',
      type: 'text',
      timestamp: p.timestamp ? new Date(p.timestamp).getTime() : Date.now(),
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatEdit(payload: any): void {
  if (!payload) return;
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_EDITED, {
    roomId: payload.roomID || payload.roomId,
    eventId: payload.eventID || payload.eventId,
    newContent: payload.newContent || payload.content,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatRedact(payload: any): void {
  if (!payload) return;
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_UPDATED, {
    roomId: payload.roomID || payload.roomId,
    eventId: payload.eventID || payload.eventId,
    redacted: true,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatTyping(payload: any): void {
  if (!payload) return;
  matrixEvents.emit(MATRIX_EVENTS.TYPING, {
    roomId: payload.roomID || payload.roomId,
    userIds: payload.userIDs || payload.userIds || [],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatReadReceipt(payload: any): void {
  if (!payload) return;
  matrixEvents.emit(MATRIX_EVENTS.READ_RECEIPT, {
    roomId: payload.roomID || payload.roomId,
    userId: payload.userID || payload.userId,
    eventId: payload.eventID || payload.eventId,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatRoomMember(payload: any): void {
  if (!payload) return;
  matrixEvents.emit(MATRIX_EVENTS.MEMBER_CHANGED, {
    roomId: payload.roomID || payload.roomId,
    userId: payload.userID || payload.userId,
    membership: payload.membership,
    displayName: payload.displayName,
  });
}

// Backend applies invite policy (auto-join / auto-mobazha).
// Only invites requiring user confirmation are forwarded here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatInvite(payload: any): void {
  if (!payload) return;
  matrixEvents.emit(MATRIX_EVENTS.ROOM_INVITE, {
    roomId: payload.roomID || payload.roomId,
    inviter: payload.inviter,
    roomName: payload.roomName,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatRoomState(payload: any): void {
  if (!payload) return;
  matrixEvents.emit(MATRIX_EVENTS.MEMBER_PEERID_UPDATED, {
    roomId: payload.roomID || payload.roomId,
    userId: payload.userID || payload.userId,
    peerID: payload.peerID || payload.peerId,
  });
}
