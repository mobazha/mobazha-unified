/**
 * Matrix 事件监听注册模块
 * 将 matrix-js-sdk 事件桥接到 matrixEvents 事件总线
 */

import type { MatrixContext, InvitePolicy } from './types';
import { MATRIX_EVENTS } from './types';
import { matrixEvents } from './events';
import { formatMessage, formatMembershipEvent } from './messages';
import { handleRoomInvite } from './rooms';

export interface EventListenerCallbacks {
  onSyncStateChange: (connected: boolean) => void;
  getInvitePolicy: () => InvitePolicy;
  scheduleKeyBackup: () => void;
}

/**
 * Register all matrix-js-sdk event listeners on the client.
 * Returns a cleanup function that removes all listeners.
 */
export async function setupEventListeners(
  ctx: MatrixContext,
  callbacks: EventListenerCallbacks
): Promise<() => void> {
  if (!ctx.client) return () => {};

  const sdk = await import('matrix-js-sdk');
  const matrixClient = ctx.client;
  const cleanups: Array<() => void> = [];

  // Sync state
  const onSync = (state: string) => {
    if (state === 'PREPARED') {
      callbacks.onSyncStateChange(true);
      matrixEvents.emit(MATRIX_EVENTS.CONNECTED);
    } else if (state === 'ERROR' || state === 'STOPPED') {
      callbacks.onSyncStateChange(false);
      matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
    }
  };
  matrixClient.on(sdk.ClientEvent.Sync, onSync);
  cleanups.push(() => matrixClient.removeListener(sdk.ClientEvent.Sync, onSync));

  // Timeline events (messages, reactions, edits)
  const onTimeline = (
    event: {
      getType: () => string;
      getId: () => string | undefined;
      getSender: () => string;
      getContent: () => Record<string, unknown>;
      status?: unknown;
    },
    room: { roomId: string } | undefined,
    toStartOfTimeline: boolean | undefined
  ) => {
    const eventType = event.getType();

    if (toStartOfTimeline) return;
    if (!room) return;

    // m.reaction
    if (eventType === 'm.reaction') {
      const content = event.getContent();
      const relatesTo = content['m.relates_to'] as
        | { rel_type?: string; event_id?: string; key?: string }
        | undefined;
      if (relatesTo?.rel_type === 'm.annotation' && relatesTo.event_id && relatesTo.key) {
        matrixEvents.emit(MATRIX_EVENTS.MESSAGE_REACTION, {
          roomId: room.roomId,
          eventId: relatesTo.event_id,
          emoji: relatesTo.key,
          sender: event.getSender(),
        });
      }
      return;
    }

    if (eventType !== 'm.room.message' && eventType !== 'm.room.encrypted') return;

    // Skip local echo events
    if (event.status) return;

    // m.replace (message edit)
    const content = event.getContent();
    const relatesTo = content['m.relates_to'] as
      | { rel_type?: string; event_id?: string }
      | undefined;
    if (relatesTo?.rel_type === 'm.replace' && relatesTo.event_id) {
      const newContent = content['m.new_content'] as { body?: string } | undefined;
      if (newContent?.body) {
        matrixEvents.emit(MATRIX_EVENTS.MESSAGE_EDITED, {
          roomId: room.roomId,
          eventId: relatesTo.event_id,
          newContent: newContent.body,
        });
      }
      return;
    }

    const eventId = event.getId();
    if (!eventId || ctx.processedMessageIds.has(eventId)) return;
    ctx.processedMessageIds.add(eventId);

    const message = formatMessage(ctx, event, room.roomId);
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_RECEIVED, message);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matrixClient.on(sdk.RoomEvent.Timeline, onTimeline as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cleanups.push(() => matrixClient.removeListener(sdk.RoomEvent.Timeline, onTimeline as any));

  // Decrypted event updates
  const onDecrypted = (event: {
    getType: () => string;
    getId: () => string | undefined;
    getRoomId: () => string | undefined;
  }) => {
    if (event.getType() !== 'm.room.message') return;

    const eventId = event.getId();
    const roomId = event.getRoomId();
    if (!eventId || !roomId) return;

    if (ctx.processedMessageIds.has(eventId)) {
      const message = formatMessage(ctx, event, roomId);
      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_UPDATED, message);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matrixClient.on(sdk.MatrixEventEvent.Decrypted, onDecrypted as any);

  cleanups.push(() =>
    matrixClient.removeListener(sdk.MatrixEventEvent.Decrypted, onDecrypted as any)
  );

  // Room membership
  const onMembership = (
    event: {
      getSender: () => string;
      getPrevContent: () => { membership?: string };
    },
    member: { roomId: string; userId: string; name?: string; membership: string }
  ) => {
    const roomId = member.roomId;
    const senderId = event.getSender();
    const targetUserId = member.userId;
    const membership = member.membership;
    const prevMembership = event.getPrevContent()?.membership;

    if (targetUserId === ctx.config?.userId && membership === 'invite') {
      matrixEvents.emit(MATRIX_EVENTS.ROOM_INVITE, {
        roomId,
        inviter: senderId,
      });
      handleRoomInvite(ctx, roomId, senderId, callbacks.getInvitePolicy());
    }

    const roomEvent = formatMembershipEvent(event, member, prevMembership);
    if (roomEvent) {
      matrixEvents.emit(MATRIX_EVENTS.ROOM_EVENT, roomEvent);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matrixClient.on(sdk.RoomMemberEvent.Membership, onMembership as any);

  cleanups.push(() =>
    matrixClient.removeListener(sdk.RoomMemberEvent.Membership, onMembership as any)
  );

  // Presence
  const onPresence = (_event: unknown, user: { userId: string; presence: string } | undefined) => {
    if (!user) return;
    matrixEvents.emit(MATRIX_EVENTS.PRESENCE_CHANGED, {
      userId: user.userId,
      presence: user.presence as 'online' | 'offline' | 'unavailable',
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matrixClient.on(sdk.UserEvent.Presence, onPresence as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cleanups.push(() => matrixClient.removeListener(sdk.UserEvent.Presence, onPresence as any));

  // Typing indicators
  const onTyping = (
    _event: unknown,
    member: { roomId: string; userId: string; typing: boolean }
  ) => {
    if (!member) return;
    const room = matrixClient.getRoom(member.roomId);
    if (!room) return;

    const members = room.getMembers();
    const userIds = members
      .filter(
        (m: { userId: string; typing?: boolean }) => m.typing && m.userId !== ctx.config?.userId
      )
      .map((m: { userId: string }) => m.userId);

    matrixEvents.emit(MATRIX_EVENTS.TYPING, {
      roomId: member.roomId,
      userIds,
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matrixClient.on(sdk.RoomMemberEvent.Typing, onTyping as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cleanups.push(() => matrixClient.removeListener(sdk.RoomMemberEvent.Typing, onTyping as any));

  // Room state events (peerID updates)
  const onStateEvent = (event: {
    getType: () => string;
    getSender: () => string;
    getRoomId: () => string;
    getContent: () => { peer_id?: string };
  }) => {
    const eventType = event.getType();

    if (eventType === 'org.mobazha.member_peerid') {
      const senderId = event.getSender();
      const content = event.getContent();
      if (content.peer_id && senderId) {
        ctx.peerIdCache.set(senderId, content.peer_id);
      }
      if (senderId !== ctx.config?.userId) {
        matrixEvents.emit(MATRIX_EVENTS.MEMBER_PEERID_UPDATED, {
          roomId: event.getRoomId(),
          userId: senderId,
          peerID: content.peer_id,
        });
      }
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matrixClient.on(sdk.RoomStateEvent.Events, onStateEvent as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cleanups.push(() => matrixClient.removeListener(sdk.RoomStateEvent.Events, onStateEvent as any));

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
