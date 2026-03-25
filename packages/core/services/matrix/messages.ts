/**
 * Matrix 消息模块
 * 消息发送/加载/格式化 + 媒体上传 + 编辑/反应 + 辅助函数
 */

import type { MatrixContext, MatrixMessage, MessageType, RoomEventType } from './types';
import { MATRIX_EVENTS, MESSAGE_STATUS } from './types';
import { matrixEvents } from './events';

// Module-level image cache (singleton, cleared on logout)
const imageCache = new Map<string, string>();

/** Clear module-level state (called on logout) */
export function resetMessageState(): void {
  imageCache.clear();
}

// ============ Pure helpers (no context needed) ============

export function extractDisplayName(userId: string): string {
  const match = userId.match(/@(?:peer_)?([^:]+):/);
  if (match) {
    const name = match[1];
    if (name.length > 12) {
      return name.substring(0, 6) + '…' + name.substring(name.length - 4);
    }
    return name;
  }
  return userId;
}

export function getMessageType(msgtype: string): MessageType {
  switch (msgtype) {
    case 'm.image':
      return 'image';
    case 'm.file':
      return 'file';
    case 'm.audio':
      return 'audio';
    case 'm.video':
      return 'video';
    case 'm.location':
      return 'location';
    default:
      return 'text';
  }
}

// ============ Context-aware helpers ============

export function getBaseUrl(ctx: MatrixContext): string {
  if (!ctx.client) {
    return ctx.config?.homeserverUrl || '';
  }
  const matrixClient = ctx.client as { baseUrl?: string };
  return matrixClient.baseUrl || ctx.config?.homeserverUrl || '';
}

/**
 * Convert mxc:// URL to authenticated media URL.
 * Uses /_matrix/client/v1/media/download/ endpoint (requires auth).
 */
export function mxcToHttp(
  ctx: MatrixContext,
  mxcUrl: string | null | undefined,
  _width = 48,
  _height = 48
): string | undefined {
  if (!mxcUrl || !mxcUrl.startsWith('mxc://')) {
    return undefined;
  }
  if (!ctx.client) {
    return undefined;
  }

  const parts = mxcUrl.replace('mxc://', '').split('/');
  if (parts.length < 2) {
    return undefined;
  }
  const [mediaServer, mediaId] = parts;

  const baseUrl = getBaseUrl(ctx);
  return `${baseUrl}/_matrix/client/v1/media/download/${mediaServer}/${mediaId}`;
}

/**
 * Download an authenticated image and return a blob URL.
 */
export async function downloadAuthenticatedImage(
  ctx: MatrixContext,
  url: string
): Promise<string | null> {
  if (!url) return null;
  if (!ctx.client) {
    console.warn('[Matrix:media] downloadAuthenticatedImage: client not ready, url=', url);
    return null;
  }

  if (imageCache.has(url)) {
    return imageCache.get(url) || null;
  }

  try {
    let mediaUrl: string | undefined;

    if (url.startsWith('mxc://')) {
      mediaUrl = mxcToHttp(ctx, url);
    } else if (url.includes('/_matrix/client/v1/media/')) {
      mediaUrl = url;
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (!mediaUrl) {
      console.warn(
        '[Matrix:media] downloadAuthenticatedImage: mxcToHttp returned undefined for',
        url
      );
      return null;
    }

    const matrixClient = ctx.client as { getAccessToken?: () => string | null };
    const accessToken = matrixClient.getAccessToken?.();

    if (!accessToken) {
      console.warn('[Matrix:media] downloadAuthenticatedImage: no access token available');
      return null;
    }

    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.warn(
        '[Matrix:media] downloadAuthenticatedImage: fetch failed',
        response.status,
        mediaUrl
      );
      return null;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    imageCache.set(url, blobUrl);

    return blobUrl;
  } catch (err) {
    console.warn('[Matrix:media] downloadAuthenticatedImage: exception for', url, err);
    return null;
  }
}

export function getSenderInfo(
  ctx: MatrixContext,
  roomId: string,
  senderId: string
): { displayName?: string; avatarUrl?: string; rawMxcAvatarUrl?: string } | null {
  if (!ctx.client) {
    return null;
  }

  try {
    const matrixClient = ctx.client as {
      getRoom?: (roomId: string) => {
        getMember?: (userId: string) => {
          name?: string;
          getAvatarUrl?: (
            baseUrl: string,
            width: number,
            height: number,
            resizeMethod: string,
            allowDefault: boolean
          ) => string | null;
          getMxcAvatarUrl?: () => string | null;
        } | null;
      } | null;
    };

    const room = matrixClient.getRoom?.(roomId);
    if (!room) {
      return null;
    }

    const member = room.getMember?.(senderId);
    if (!member) {
      return null;
    }

    const rawMxcAvatarUrl = member.getMxcAvatarUrl?.() || undefined;
    const avatarUrl = rawMxcAvatarUrl ? mxcToHttp(ctx, rawMxcAvatarUrl, 48, 48) : undefined;

    return {
      displayName: member.name,
      avatarUrl,
      rawMxcAvatarUrl,
    };
  } catch {
    return null;
  }
}

// ============ Message formatting ============

function buildAttachments(
  ctx: MatrixContext,
  content: Record<string, unknown>
): MatrixMessage['attachments'] {
  const mxcUrl = content.url as string | undefined;
  const info = content.info as
    | { mimetype?: string; size?: number; w?: number; h?: number; thumbnail_url?: string }
    | undefined;
  if (!mxcUrl) return undefined;
  return [
    {
      url: mxcToHttp(ctx, mxcUrl) || mxcUrl,
      filename: (content.body as string) || undefined,
      mimetype: info?.mimetype,
      size: info?.size,
      width: info?.w,
      height: info?.h,
      thumbnailUrl: info?.thumbnail_url
        ? mxcToHttp(ctx, info.thumbnail_url) || info.thumbnail_url
        : undefined,
    },
  ];
}

export function formatTimelineEvent(
  ctx: MatrixContext,
  event: unknown,
  roomId: string
): MatrixMessage | null {
  const e = event as {
    getId: () => string;
    getType: () => string;
    getWireType?: () => string;
    getSender: () => string;
    getContent: () => Record<string, unknown>;
    getClearContent?: () => Record<string, unknown> | null;
    getPrevContent: () => Record<string, unknown>;
    getTs: () => number;
    getStateKey: () => string | undefined;
    isDecryptionFailure?: () => boolean;
  };

  const eventType = e.getType();
  const wireType = e.getWireType?.() || eventType;

  const isEncrypted = wireType === 'm.room.encrypted';
  const clearContent = isEncrypted ? e.getClearContent?.() : null;
  const content = clearContent || e.getContent();

  const senderInfo = getSenderInfo(ctx, roomId, e.getSender());

  // Normal or decrypted message
  if (eventType === 'm.room.message' || (isEncrypted && clearContent?.body)) {
    const relatesTo = content['m.relates_to'] as
      | { rel_type?: string; event_id?: string }
      | undefined;
    if (relatesTo?.rel_type === 'm.replace' || relatesTo?.rel_type === 'm.annotation') {
      return null;
    }

    if (e.isDecryptionFailure?.()) {
      return {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        senderName: senderInfo?.displayName,
        senderAvatar: senderInfo?.avatarUrl,
        senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
        content: '⚠️ Unable to decrypt message',
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
      };
    }

    const msgtype = (content.msgtype as string) || 'm.text';
    const messageType = getMessageType(msgtype);

    const msg: MatrixMessage = {
      id: e.getId(),
      roomId,
      sender: e.getSender(),
      senderName: senderInfo?.displayName,
      senderAvatar: senderInfo?.avatarUrl,
      senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
      content: (content.body as string) || '',
      type: messageType,
      timestamp: e.getTs(),
    };

    if (
      messageType === 'image' ||
      messageType === 'file' ||
      messageType === 'audio' ||
      messageType === 'video'
    ) {
      msg.attachments = buildAttachments(ctx, content);
    }

    return msg;
  }

  // Encrypted but not yet decrypted
  if (isEncrypted && !clearContent) {
    if (e.isDecryptionFailure?.()) {
      return {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        senderName: senderInfo?.displayName,
        senderAvatar: senderInfo?.avatarUrl,
        senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
        content: '⚠️ Unable to decrypt message',
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
      };
    }
    return {
      id: e.getId(),
      roomId,
      sender: e.getSender(),
      senderName: senderInfo?.displayName,
      senderAvatar: senderInfo?.avatarUrl,
      senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
      content: '🔐 Decrypting...',
      type: 'text',
      timestamp: e.getTs(),
      isSystem: true,
    };
  }

  // Room creation event
  if (eventType === 'm.room.create') {
    const creator = e.getSender();
    return {
      id: e.getId(),
      roomId,
      sender: creator,
      content: `${extractDisplayName(creator)} created this DM`,
      type: 'text',
      timestamp: e.getTs(),
      isSystem: true,
      isRoomEvent: true,
      roomEventType: 'room_created',
    };
  }

  // Encryption enabled event
  if (eventType === 'm.room.encryption') {
    return {
      id: e.getId(),
      roomId,
      sender: e.getSender(),
      content: `${extractDisplayName(e.getSender())} enabled end-to-end encryption`,
      type: 'text',
      timestamp: e.getTs(),
      isSystem: true,
      isRoomEvent: true,
      roomEventType: 'encryption',
    };
  }

  // Member change event
  if (eventType === 'm.room.member') {
    const targetUserId = e.getStateKey();
    if (!targetUserId) return null;

    const membership = content.membership as string;
    const prevContent = e.getPrevContent();
    const prevMembership = prevContent?.membership as string | undefined;
    const displayName = (content.displayname as string) || extractDisplayName(targetUserId);
    const sender = e.getSender();

    let eventText = '';
    let roomEventType: RoomEventType | null = null;

    if (membership === 'join') {
      if (prevMembership === 'invite') {
        eventText = `${displayName} joined the room`;
        roomEventType = 'join';
      } else if (prevMembership === 'join') {
        const prevDisplayName = prevContent?.displayname as string | undefined;
        if (displayName !== prevDisplayName && prevDisplayName) {
          eventText = `${prevDisplayName} changed their name to ${displayName}`;
          roomEventType = 'name_change';
        } else {
          return null;
        }
      } else {
        eventText = `${displayName} joined the room`;
        roomEventType = 'join';
      }
    } else if (membership === 'leave') {
      if (sender === targetUserId) {
        eventText = `${displayName} left the room`;
        roomEventType = 'leave';
      } else {
        eventText = `${extractDisplayName(sender)} kicked ${displayName}`;
        roomEventType = 'kick';
      }
    } else if (membership === 'invite') {
      eventText = `${extractDisplayName(sender)} invited ${displayName}`;
      roomEventType = 'invite';
    } else if (membership === 'ban') {
      eventText = `${extractDisplayName(sender)} banned ${displayName}`;
      roomEventType = 'ban';
    } else {
      return null;
    }

    if (!eventText || !roomEventType) return null;

    return {
      id: e.getId(),
      roomId,
      sender,
      content: eventText,
      type: 'text',
      timestamp: e.getTs(),
      isSystem: true,
      isRoomEvent: true,
      roomEventType,
      targetUserId,
      targetUserName: displayName,
    };
  }

  return null;
}

export function formatMessage(ctx: MatrixContext, event: unknown, roomId: string): MatrixMessage {
  const e = event as {
    getId: () => string;
    getSender: () => string;
    getType: () => string;
    getWireType?: () => string;
    getContent: () => Record<string, unknown>;
    getClearContent?: () => Record<string, unknown> | null;
    getTs: () => number;
    isDecryptionFailure?: () => boolean;
  };

  const wireType = e.getWireType?.() || e.getType();
  const isEncrypted = wireType === 'm.room.encrypted';

  const clearContent = isEncrypted ? e.getClearContent?.() : null;
  const content = clearContent || e.getContent();

  const senderInfo = getSenderInfo(ctx, roomId, e.getSender());

  if (e.isDecryptionFailure?.()) {
    return {
      id: e.getId(),
      roomId,
      sender: e.getSender(),
      senderName: senderInfo?.displayName,
      senderAvatar: senderInfo?.avatarUrl,
      senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
      content: '⚠️ Unable to decrypt message',
      type: 'text',
      timestamp: e.getTs(),
      isSystem: true,
    };
  }

  if (isEncrypted && !clearContent?.body) {
    return {
      id: e.getId(),
      roomId,
      sender: e.getSender(),
      senderName: senderInfo?.displayName,
      senderAvatar: senderInfo?.avatarUrl,
      senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
      content: '🔐 Decrypting...',
      type: 'text',
      timestamp: e.getTs(),
      isSystem: true,
    };
  }

  const msgtype = (content.msgtype as string) || 'm.text';
  const messageType = getMessageType(msgtype);

  const msg: MatrixMessage = {
    id: e.getId(),
    roomId,
    sender: e.getSender(),
    senderName: senderInfo?.displayName,
    senderAvatar: senderInfo?.avatarUrl,
    senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
    content: (content.body as string) || '',
    type: messageType,
    timestamp: e.getTs(),
  };

  if (
    messageType === 'image' ||
    messageType === 'file' ||
    messageType === 'audio' ||
    messageType === 'video'
  ) {
    msg.attachments = buildAttachments(ctx, content);
  }

  return msg;
}

export function formatMembershipEvent(
  event: unknown,
  member: unknown,
  prevMembership?: string
): MatrixMessage | null {
  const e = event as {
    getId: () => string;
    getSender: () => string;
    getTs: () => number;
    getContent: () => { displayname?: string; avatar_url?: string };
    getPrevContent: () => { displayname?: string; avatar_url?: string; membership?: string };
  };
  const m = member as {
    roomId: string;
    userId: string;
    name?: string;
    membership: string;
  };

  const senderId = e.getSender();
  const targetUserId = m.userId;
  const membership = m.membership;
  const content = e.getContent();
  const prevContent = e.getPrevContent();

  let roomEventType: RoomEventType | null = null;
  let displayContent = '';

  switch (membership) {
    case 'join':
      if (prevMembership === 'join') {
        if (content.displayname !== prevContent.displayname) {
          roomEventType = 'name_change';
          displayContent = content.displayname || '';
        } else if (content.avatar_url !== prevContent.avatar_url) {
          roomEventType = 'avatar_change';
        } else {
          return null;
        }
      } else {
        roomEventType = 'join';
      }
      break;

    case 'invite':
      roomEventType = 'invite';
      break;

    case 'leave':
      if (senderId === targetUserId) {
        roomEventType = 'leave';
      } else if (prevMembership === 'ban') {
        roomEventType = 'unban';
      } else {
        roomEventType = 'kick';
      }
      break;

    case 'ban':
      roomEventType = 'ban';
      break;

    default:
      return null;
  }

  if (!roomEventType) return null;

  return {
    id: e.getId(),
    roomId: m.roomId,
    sender: senderId,
    senderName: undefined,
    content: displayContent,
    type: 'system',
    timestamp: e.getTs(),
    isRoomEvent: true,
    roomEventType,
    targetUserId,
    targetUserName: m.name || content.displayname,
  };
}

// ============ Message CRUD ============

export async function getMessages(
  ctx: MatrixContext,
  roomId: string,
  limit = 50
): Promise<MatrixMessage[]> {
  if (!ctx.client) return [];

  const sdk = await import('matrix-js-sdk');
  const matrixClient = ctx.client;
  const room = matrixClient.getRoom(roomId);

  if (!room) {
    console.warn('[Matrix] Room not found for getMessages:', roomId);
    return [];
  }

  const timeline = room.getLiveTimeline();
  let events = timeline.getEvents();

  const displayableEventTypes = [
    'm.room.message',
    'm.room.member',
    'm.room.create',
    'm.room.encryption',
  ];
  let displayableEvents = events.filter(event => {
    const eventType = event.getType();
    if (!displayableEventTypes.includes(eventType)) return false;
    if (eventType === 'm.room.message') {
      const msgtype = event.getContent()?.msgtype || '';
      if ((msgtype as string).startsWith('m.key.verification')) return false;
    }
    return true;
  });

  const paginationToken = timeline.getPaginationToken(sdk.Direction.Backward);
  if (displayableEvents.length < limit && paginationToken) {
    try {
      await matrixClient.paginateEventTimeline(timeline, { backwards: true, limit });

      events = timeline.getEvents();
      displayableEvents = events.filter(event => {
        const eventType = event.getType();
        if (!displayableEventTypes.includes(eventType)) return false;
        if (eventType === 'm.room.message') {
          const msgtype = event.getContent()?.msgtype || '';
          if ((msgtype as string).startsWith('m.key.verification')) return false;
        }
        return true;
      });
    } catch (error) {
      console.warn('[Matrix] Failed to paginate initial timeline:', error);
    }
  }

  // State events (creation, encryption)
  const stateEvents: MatrixMessage[] = [];

  const createEvent = room.currentState.getStateEvents('m.room.create', '');
  if (createEvent) {
    const formatted = formatTimelineEvent(ctx, createEvent, roomId);
    if (formatted) {
      stateEvents.push(formatted);
    }
  }

  const encryptionEvent = room.currentState.getStateEvents('m.room.encryption', '');
  if (encryptionEvent) {
    const formatted = formatTimelineEvent(ctx, encryptionEvent, roomId);
    if (formatted) {
      stateEvents.push(formatted);
    }
  }

  const timelineMessages = displayableEvents
    .slice(-limit)
    .map(event => formatTimelineEvent(ctx, event, roomId))
    .filter((msg): msg is MatrixMessage => msg !== null);

  const allMessages = [...stateEvents, ...timelineMessages]
    .filter((msg, index, self) => index === self.findIndex(m => m.id === msg.id))
    .sort((a, b) => a.timestamp - b.timestamp);

  allMessages.forEach(msg => {
    if (msg.id) {
      ctx.processedMessageIds.add(msg.id);
    }
  });

  return allMessages;
}

export async function loadOlderMessages(
  ctx: MatrixContext,
  roomId: string,
  limit = 50
): Promise<MatrixMessage[]> {
  if (!ctx.client) return [];

  const sdk = await import('matrix-js-sdk');
  const matrixClient = ctx.client;
  const room = matrixClient.getRoom(roomId);
  if (!room) return [];

  const timeline = room.getLiveTimeline();
  const token = timeline.getPaginationToken(sdk.Direction.Backward);
  if (!token) return [];

  const eventsBefore = new Set(
    timeline
      .getEvents()
      .map(e => e.getId())
      .filter((id): id is string => !!id)
  );

  try {
    await matrixClient.paginateEventTimeline(timeline, { backwards: true, limit });
  } catch (error) {
    console.warn('[Matrix] Failed to paginate backward:', error);
    return [];
  }

  const displayableTypes = ['m.room.message', 'm.room.member', 'm.room.encryption'];
  const newEvents = timeline.getEvents().filter(event => {
    const eventId = event.getId();
    if (eventId && eventsBefore.has(eventId)) return false;
    const type = event.getType();
    if (!displayableTypes.includes(type)) return false;
    if (type === 'm.room.message') {
      const msgtype = (event.getContent()?.msgtype as string) || '';
      if (msgtype.startsWith('m.key.verification')) return false;
    }
    return true;
  });

  const messages = newEvents
    .map((event: unknown) => formatTimelineEvent(ctx, event, roomId))
    .filter((msg: MatrixMessage | null): msg is MatrixMessage => msg !== null)
    .sort((a: MatrixMessage, b: MatrixMessage) => a.timestamp - b.timestamp);

  messages.forEach((msg: MatrixMessage) => {
    if (msg.id) ctx.processedMessageIds.add(msg.id);
  });

  return messages;
}

export async function sendMessage(
  ctx: MatrixContext,
  roomId: string,
  content: string
): Promise<MatrixMessage | null> {
  if (!ctx.client) return null;

  const localId = `local_${Date.now()}`;
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, { localId, roomId });

  try {
    const sdk = await import('matrix-js-sdk');
    const matrixClient = ctx.client;

    const room = matrixClient.getRoom(roomId);
    if (room) {
      const membership = room.getMyMembership();
      if (membership === 'invite') {
        await matrixClient.joinRoom(roomId);
        matrixEvents.emit(MATRIX_EVENTS.ROOM_JOINED, { roomId });
      }
    }

    const response = await matrixClient.sendMessage(roomId, {
      msgtype: sdk.MsgType.Text,
      body: content,
    });

    ctx.processedMessageIds.add(response.event_id);

    const message: MatrixMessage = {
      id: response.event_id,
      localId,
      roomId,
      sender: ctx.config.userId!,
      content,
      type: 'text',
      timestamp: Date.now(),
      status: MESSAGE_STATUS.SENT,
    };

    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, message);
    return message;
  } catch (error) {
    console.error('[Matrix] Send message failed:', error);
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, { localId, roomId, error });
    return null;
  }
}

export async function sendImage(
  ctx: MatrixContext,
  roomId: string,
  file: File,
  externalLocalId?: string
): Promise<MatrixMessage | null> {
  if (!ctx.client) return null;

  const localId = externalLocalId || `local_${Date.now()}`;
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, { localId, roomId });

  try {
    const sdk = await import('matrix-js-sdk');
    const matrixClient = ctx.client;

    const uploadResponse = await matrixClient.uploadContent(file, {
      type: file.type,
      progressHandler: (progress: { loaded: number; total: number }) => {
        const percent =
          progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
        matrixEvents.emit(MATRIX_EVENTS.UPLOAD_PROGRESS, { localId, roomId, progress: percent });
      },
    });

    const mxcUrl =
      typeof uploadResponse === 'string'
        ? uploadResponse
        : (uploadResponse as { content_uri: string }).content_uri;

    const response = await matrixClient.sendMessage(roomId, {
      msgtype: sdk.MsgType.Image,
      body: file.name || 'image',
      url: mxcUrl,
      info: {
        mimetype: file.type,
        size: file.size,
      },
    });

    const eventId = (response as { event_id: string }).event_id;
    ctx.processedMessageIds.add(eventId);

    const message: MatrixMessage = {
      id: eventId,
      localId,
      roomId,
      sender: ctx.config.userId!,
      content: file.name || 'image',
      type: 'image',
      timestamp: Date.now(),
      status: MESSAGE_STATUS.SENT,
      attachments: [{ url: mxcUrl, filename: file.name, mimetype: file.type, size: file.size }],
    };

    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, message);
    return message;
  } catch (error) {
    console.error('[Matrix] Send image failed:', error);
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, { localId, roomId, error });
    return null;
  }
}

export async function sendFile(
  ctx: MatrixContext,
  roomId: string,
  file: File,
  externalLocalId?: string
): Promise<MatrixMessage | null> {
  if (!ctx.client) return null;

  const localId = externalLocalId || `local_${Date.now()}`;
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, { localId, roomId });

  try {
    const sdk = await import('matrix-js-sdk');
    const matrixClient = ctx.client;

    const uploadResponse = await matrixClient.uploadContent(file, {
      type: file.type,
      progressHandler: (progress: { loaded: number; total: number }) => {
        const percent =
          progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
        matrixEvents.emit(MATRIX_EVENTS.UPLOAD_PROGRESS, { localId, roomId, progress: percent });
      },
    });

    const mxcUrl =
      typeof uploadResponse === 'string'
        ? uploadResponse
        : (uploadResponse as { content_uri: string }).content_uri;

    const body = file.name || 'file';
    const info = { mimetype: file.type, size: file.size };

    let messageType: MessageType;
    let response: { event_id: string };

    if (file.type.startsWith('image/')) {
      messageType = 'image';
      response = await matrixClient.sendMessage(roomId, {
        msgtype: sdk.MsgType.Image,
        body,
        url: mxcUrl,
        info,
      });
    } else if (file.type.startsWith('audio/')) {
      messageType = 'audio';
      response = await matrixClient.sendMessage(roomId, {
        msgtype: sdk.MsgType.Audio,
        body,
        url: mxcUrl,
        info,
      });
    } else if (file.type.startsWith('video/')) {
      messageType = 'video';
      response = await matrixClient.sendMessage(roomId, {
        msgtype: sdk.MsgType.Video,
        body,
        url: mxcUrl,
        info,
      });
    } else {
      messageType = 'file';
      response = await matrixClient.sendMessage(roomId, {
        msgtype: sdk.MsgType.File,
        body,
        url: mxcUrl,
        info,
      });
    }

    ctx.processedMessageIds.add(response.event_id);

    const message: MatrixMessage = {
      id: response.event_id,
      localId,
      roomId,
      sender: ctx.config.userId!,
      content: file.name || 'file',
      type: messageType,
      timestamp: Date.now(),
      status: MESSAGE_STATUS.SENT,
      attachments: [{ url: mxcUrl, filename: file.name, mimetype: file.type, size: file.size }],
    };

    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, message);
    return message;
  } catch (error) {
    console.error('[Matrix] Send file failed:', error);
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, { localId, roomId, error });
    return null;
  }
}

export async function sendTyping(
  ctx: MatrixContext,
  roomId: string,
  isTyping: boolean,
  timeout = 5000
): Promise<void> {
  if (!ctx.client) return;

  try {
    const matrixClient = ctx.client;
    await matrixClient.sendTyping(roomId, isTyping, timeout);
  } catch (error) {
    console.warn('[Matrix] Send typing failed:', error);
  }
}

export async function markRoomAsRead(ctx: MatrixContext, roomId: string): Promise<boolean> {
  if (!ctx.client) return false;

  try {
    const matrixClient = ctx.client;
    const room = matrixClient.getRoom(roomId);

    if (room) {
      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();
      if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        await matrixClient.sendReadReceipt(lastEvent);
      }
    }
    return true;
  } catch (error) {
    console.error('[Matrix] Mark room as read failed:', error);
    return false;
  }
}

export async function getReadReceiptForRoom(
  ctx: MatrixContext,
  roomId: string
): Promise<Record<string, string>> {
  if (!ctx.client) return {};

  try {
    const matrixClient = ctx.client;
    const room = matrixClient.getRoom(roomId);
    if (!room) return {};

    const receipts: Record<string, string> = {};
    const members = room.getJoinedMembers();
    for (const member of members) {
      const receipt = room.getReadReceiptForUserId(member.userId);
      if (receipt?.eventId) {
        receipts[member.userId] = receipt.eventId;
      }
    }
    return receipts;
  } catch (error) {
    console.warn('[Matrix] Get read receipts failed:', error);
    return {};
  }
}

export async function redactEvent(
  ctx: MatrixContext,
  roomId: string,
  eventId: string,
  reason?: string
): Promise<void> {
  if (!ctx.client) throw new Error('Matrix client not initialized');

  const matrixClient = ctx.client;
  await matrixClient.redactEvent(roomId, eventId, undefined, reason ? { reason } : undefined);
}

export async function editMessage(
  ctx: MatrixContext,
  roomId: string,
  originalEventId: string,
  newContent: string
): Promise<void> {
  if (!ctx.client) throw new Error('Matrix client not initialized');

  const sdk = await import('matrix-js-sdk');
  const matrixClient = ctx.client;
  await (
    matrixClient as unknown as {
      sendMessage(roomId: string, content: Record<string, unknown>): Promise<{ event_id: string }>;
    }
  ).sendMessage(roomId, {
    msgtype: sdk.MsgType.Text,
    body: `* ${newContent}`,
    'm.new_content': {
      msgtype: sdk.MsgType.Text,
      body: newContent,
    },
    'm.relates_to': {
      rel_type: 'm.replace',
      event_id: originalEventId,
    },
  });
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_EDITED, {
    roomId,
    eventId: originalEventId,
    newContent,
  });
}

export async function sendReaction(
  ctx: MatrixContext,
  roomId: string,
  eventId: string,
  emoji: string
): Promise<void> {
  if (!ctx.client) throw new Error('Matrix client not initialized');

  const matrixClient = ctx.client;
  await (
    matrixClient as unknown as {
      sendEvent(
        roomId: string,
        eventType: string,
        content: Record<string, unknown>
      ): Promise<{ event_id: string }>;
    }
  ).sendEvent(roomId, 'm.reaction', {
    'm.relates_to': {
      rel_type: 'm.annotation',
      event_id: eventId,
      key: emoji,
    },
  });
}
