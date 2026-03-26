/**
 * Matrix 消息模块 — REST API 实现
 *
 * v1.2: 所有操作通过后端 REST API 完成，无 matrix-js-sdk 依赖。
 * 后端 mautrix-go 透明处理 E2EE 加解密。
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authPut, authDel } from '../api/helpers';
import { getMyGatewayUrl, getAuthHeaders } from '../api/config';
import { matrixEvents } from './events';
import {
  MATRIX_EVENTS,
  MESSAGE_STATUS,
  type MatrixMessage,
  type MessageType,
  type MatrixAttachment,
  type BackendMessage,
  type BackendMediaInfo,
  type ChatMessagesResponse,
} from './types';

// Per-room pagination tokens for loadOlderMessages
const paginationTokens = new Map<string, string>();

let localIdCounter = 0;
function nextLocalId(): string {
  return `local_${Date.now()}_${++localIdCounter}`;
}

// ============ Public API ============

export function resetPaginationState(): void {
  paginationTokens.clear();
  localIdCounter = 0;
}

export async function getMessages(
  roomId: string,
  limit: number,
  processedIds: Set<string>
): Promise<MatrixMessage[]> {
  const resp = await authGet<ChatMessagesResponse>(
    `${NODE_API.CHAT_ROOM_MESSAGES(roomId)}?limit=${limit}`
  );
  if (resp.end) {
    paginationTokens.set(roomId, resp.end);
  }
  const messages = (resp.messages || []).map(convertMessage);
  for (const m of messages) processedIds.add(m.id);
  return messages;
}

export async function loadOlderMessages(
  roomId: string,
  limit: number,
  processedIds: Set<string>
): Promise<MatrixMessage[]> {
  const before = paginationTokens.get(roomId);
  let url = `${NODE_API.CHAT_ROOM_MESSAGES(roomId)}?limit=${limit}`;
  if (before) url += `&before=${encodeURIComponent(before)}`;

  const resp = await authGet<ChatMessagesResponse>(url);
  if (resp.end) {
    paginationTokens.set(roomId, resp.end);
  }
  const messages = (resp.messages || []).map(convertMessage);
  for (const m of messages) processedIds.add(m.id);
  return messages;
}

export async function sendMessage(
  roomId: string,
  content: string,
  userId: string | null
): Promise<MatrixMessage | null> {
  const localId = nextLocalId();
  const optimistic: MatrixMessage = {
    id: localId,
    localId,
    roomId,
    sender: userId || '',
    content,
    type: 'text',
    timestamp: Date.now(),
    status: MESSAGE_STATUS.SENDING,
  };
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, optimistic);

  try {
    const resp = await authPost<{ eventId: string }>(NODE_API.CHAT_ROOM_MESSAGES(roomId), {
      body: content,
    });
    const sent: MatrixMessage = {
      ...optimistic,
      id: resp.eventId,
      status: MESSAGE_STATUS.SENT,
    };
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, sent);
    return sent;
  } catch (error) {
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, {
      ...optimistic,
      status: MESSAGE_STATUS.FAILED,
      error,
    });
    return null;
  }
}

export async function sendImage(
  roomId: string,
  file: File,
  userId: string | null,
  externalLocalId?: string
): Promise<MatrixMessage | null> {
  const localId = externalLocalId || nextLocalId();
  const optimistic: MatrixMessage = {
    id: localId,
    localId,
    roomId,
    sender: userId || '',
    content: file.name,
    type: 'image',
    timestamp: Date.now(),
    status: MESSAGE_STATUS.SENDING,
    attachments: [
      { url: URL.createObjectURL(file), filename: file.name, mimetype: file.type, size: file.size },
    ],
  };
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, optimistic);

  try {
    const resp = await uploadMedia(roomId, file, progress => {
      matrixEvents.emit(MATRIX_EVENTS.UPLOAD_PROGRESS, { localId, roomId, progress });
    });
    const sent: MatrixMessage = { ...optimistic, id: resp.eventId, status: MESSAGE_STATUS.SENT };
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, sent);
    return sent;
  } catch (error) {
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, {
      ...optimistic,
      status: MESSAGE_STATUS.FAILED,
      error,
    });
    return null;
  }
}

export async function sendFile(
  roomId: string,
  file: File,
  userId: string | null,
  externalLocalId?: string
): Promise<MatrixMessage | null> {
  const localId = externalLocalId || nextLocalId();
  const optimistic: MatrixMessage = {
    id: localId,
    localId,
    roomId,
    sender: userId || '',
    content: file.name,
    type: 'file',
    timestamp: Date.now(),
    status: MESSAGE_STATUS.SENDING,
    attachments: [{ url: '', filename: file.name, mimetype: file.type, size: file.size }],
  };
  matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, optimistic);

  try {
    const resp = await uploadMedia(roomId, file, progress => {
      matrixEvents.emit(MATRIX_EVENTS.UPLOAD_PROGRESS, { localId, roomId, progress });
    });
    const sent: MatrixMessage = { ...optimistic, id: resp.eventId, status: MESSAGE_STATUS.SENT };
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, sent);
    return sent;
  } catch (error) {
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, {
      ...optimistic,
      status: MESSAGE_STATUS.FAILED,
      error,
    });
    return null;
  }
}

export async function editMessage(
  roomId: string,
  eventId: string,
  newContent: string
): Promise<void> {
  await authPut(NODE_API.CHAT_ROOM_MESSAGE(roomId, eventId), { body: newContent });
}

export async function redactEvent(roomId: string, eventId: string): Promise<void> {
  await authDel(NODE_API.CHAT_ROOM_MESSAGE(roomId, eventId));
}

export async function sendReaction(roomId: string, eventId: string, emoji: string): Promise<void> {
  await authPost(NODE_API.CHAT_ROOM_REACTION(roomId, eventId), { key: emoji });
}

export async function sendTyping(roomId: string, isTyping: boolean): Promise<void> {
  await authPost(NODE_API.CHAT_ROOM_TYPING(roomId), { typing: isTyping });
}

export async function markRoomAsRead(roomId: string, eventId?: string): Promise<boolean> {
  if (!eventId) return false;
  try {
    await authPost(NODE_API.CHAT_ROOM_READ(roomId), { eventId });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert mxc:// URL to a backend proxy URL.
 * The resulting URL requires Authorization header for access — use
 * downloadAuthenticatedImage() for fetching, or pass to components
 * that support authenticated image loading.
 */
export function mxcToHttp(mxcUrl: string | null | undefined): string | undefined {
  if (!mxcUrl) return undefined;
  const match = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/);
  if (!match) return undefined;
  const [, server, mediaId] = match;
  const baseUrl = getMyGatewayUrl();
  return `${baseUrl}${NODE_API.CHAT_MEDIA(server, mediaId)}`;
}

/**
 * Fetch media with auth headers and return a blob URL.
 * Preferred for large or sensitive media.
 */
export async function downloadAuthenticatedImage(url: string): Promise<string | null> {
  try {
    let fetchUrl = url;
    if (url.startsWith('mxc://')) {
      const converted = mxcToHttp(url);
      if (!converted) return null;
      fetchUrl = converted;
    }
    const headers = getAuthHeaders();
    const response = await fetch(fetchUrl, { headers });
    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ============ Converters ============

export function convertMessage(msg: BackendMessage): MatrixMessage {
  const ts = new Date(msg.timestamp).getTime();
  const msgType = mapMsgType(msg.msgType);
  const attachments = msg.media ? [convertMedia(msg.media)] : undefined;

  return {
    id: msg.id,
    roomId: msg.roomId,
    sender: msg.sender,
    senderName: msg.metadata?.senderName,
    content: msg.content,
    type: msgType,
    timestamp: ts,
    replyTo: msg.replyTo || undefined,
    isEdited: !!msg.editedAt,
    attachments,
  };
}

function convertMedia(media: BackendMediaInfo): MatrixAttachment {
  return {
    url: mxcToHttp(media.url) || media.url,
    filename: media.filename,
    mimetype: media.mimeType,
    size: media.size,
    width: media.width,
    height: media.height,
    thumbnailUrl: media.thumbnailUrl ? mxcToHttp(media.thumbnailUrl) : undefined,
  };
}

function mapMsgType(backendType: string): MessageType {
  switch (backendType) {
    case 'm.text':
      return 'text';
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

// ============ Helpers ============

function uploadMedia(
  roomId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ eventId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${getMyGatewayUrl()}${NODE_API.CHAT_MEDIA_UPLOAD}`;
    const headers = getAuthHeaders();

    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json.data || json);
        } catch {
          reject(new Error('Invalid upload response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload network error'));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);

    xhr.open('POST', url);
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== 'content-type') {
        xhr.setRequestHeader(key, value);
      }
    }
    xhr.send(formData);
  });
}
