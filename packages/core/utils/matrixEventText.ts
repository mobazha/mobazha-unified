/**
 * Matrix 房间事件文本生成
 * 参考 Element Web 的 TextForEvent.tsx
 */

import type { RoomEventType, MatrixMessage } from '../services/matrix/types';

// 翻译函数类型
type TranslateFunction = (key: string, params?: Record<string, string>) => string;

/**
 * 获取房间成员事件的显示文本
 */
export function getTextForMemberEvent(event: MatrixMessage, t: TranslateFunction): string {
  const { roomEventType, senderName, targetUserName, content } = event;
  const name = senderName || event.sender;
  const target = targetUserName || event.targetUserId || '';

  switch (roomEventType) {
    case 'join':
      return t('matrix.events.join', { name });

    case 'leave':
      if (event.sender === event.targetUserId) {
        // 主动离开
        return t('matrix.events.left', { name });
      }
      // 被踢出（由其他人操作）
      return t('matrix.events.kicked', { name: target, by: name });

    case 'invite':
      return t('matrix.events.invited', { name: target, by: name });

    case 'kick':
      return t('matrix.events.kicked', { name: target, by: name });

    case 'ban':
      return t('matrix.events.banned', { name: target, by: name });

    case 'unban':
      return t('matrix.events.unbanned', { name: target, by: name });

    case 'name_change':
      return t('matrix.events.nameChanged', { name, newName: content });

    case 'avatar_change':
      return t('matrix.events.avatarChanged', { name });

    case 'room_name':
      return t('matrix.events.roomNameChanged', { name, roomName: content });

    case 'room_topic':
      return t('matrix.events.roomTopicChanged', { name, topic: content });

    case 'encryption':
      return t('matrix.events.encryptionEnabled');

    case 'room_created':
      return t('matrix.events.roomCreated', { name });

    default:
      return content || '';
  }
}

/**
 * 获取房间事件类型的图标类名或 emoji
 */
export function getIconForRoomEvent(eventType: RoomEventType): string {
  switch (eventType) {
    case 'join':
      return '👋';
    case 'leave':
    case 'kick':
      return '👋';
    case 'invite':
      return '📨';
    case 'ban':
      return '🚫';
    case 'unban':
      return '✅';
    case 'name_change':
    case 'avatar_change':
      return '✏️';
    case 'room_name':
    case 'room_topic':
      return '📝';
    case 'encryption':
      return '🔒';
    case 'room_created':
      return '🎉';
    default:
      return 'ℹ️';
  }
}

/**
 * 判断事件是否应该在时间线中显示
 */
export function shouldShowRoomEvent(eventType: RoomEventType): boolean {
  // 这些事件默认显示
  const showByDefault: RoomEventType[] = [
    'join',
    'leave',
    'invite',
    'kick',
    'ban',
    'encryption',
    'room_created',
  ];

  return showByDefault.includes(eventType);
}

/**
 * 从 Matrix SDK 成员事件中提取事件类型
 */
export function getMemberEventType(
  membership: string,
  prevMembership?: string,
  senderId?: string,
  targetUserId?: string
): RoomEventType | null {
  switch (membership) {
    case 'join':
      if (prevMembership === 'join') {
        // 用户资料变更（名称或头像）
        return null; // 需要进一步检查内容变化
      }
      return 'join';

    case 'invite':
      return 'invite';

    case 'leave':
      if (senderId === targetUserId) {
        return 'leave';
      }
      if (prevMembership === 'ban') {
        return 'unban';
      }
      return 'kick';

    case 'ban':
      return 'ban';

    default:
      return null;
  }
}

export default {
  getTextForMemberEvent,
  getIconForRoomEvent,
  shouldShowRoomEvent,
  getMemberEventType,
};
