/**
 * Matrix 初始化 Hook
 * 在用户登录后自动初始化 Matrix 连接
 * 支持自动重试和断线重连
 */

import { useEffect, useRef, useCallback } from 'react';
import { useUserStore } from '../stores/userStore';
import { useChatStore } from '../stores/chatStore';
import { matrixClient } from '../services/matrix/client';
import { matrixEvents } from '../services/matrix/events';
import { MATRIX_EVENTS } from '../services/matrix/types';
import type { MatrixMessage, MatrixRoom } from '../services/matrix/types';
import { isMatrixEnabled } from '../config';

function splitRoomsAndInvites(allRooms: MatrixRoom[]) {
  const rooms: MatrixRoom[] = [];
  const invites: MatrixRoom[] = [];
  for (const room of allRooms) {
    if (room.membership === 'invite') {
      invites.push(room);
    } else {
      rooms.push(room);
    }
  }
  return { rooms, invites };
}

export interface UseMatrixInitOptions {
  /** 是否启用 Matrix */
  enabled?: boolean;
  /** 自动连接 */
  autoConnect?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
}

export interface UseMatrixInitReturn {
  isInitialized: boolean;
  isConnected: boolean;
  error: string | null;
  retryCount: number;
  initialize: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  retry: () => Promise<boolean>;
}

/**
 * Matrix 初始化 Hook
 * 监听用户登录状态，自动初始化 Matrix
 * 支持自动重试和断线重连
 */
export function useMatrixInit(options: UseMatrixInitOptions = {}): UseMatrixInitReturn {
  const { enabled = true, autoConnect = true, maxRetries = 3, retryInterval = 5000 } = options;

  // Check global Matrix enabled config (for development toggle)
  const globalMatrixEnabled = isMatrixEnabled();
  const effectiveEnabled = enabled && globalMatrixEnabled;

  const initRef = useRef(false);
  const initializingRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User store
  const { isAuthenticated, profile } = useUserStore();
  const peerID = profile?.peerID;

  // Chat store
  const {
    isConnected,
    connectionError,
    setConnected,
    setInitializing,
    setConnectionError,
    setRooms,
    setInvites,
    addMessage,
    updateMessage,
    updateRoom,
    setTypingUsers,
    setUserPresence,
    removeRoom,
    updateRoomMemberPeerID,
    reset: resetChatStore,
  } = useChatStore();

  // 清除重试定时器
  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // 初始化 Matrix
  const initialize = useCallback(async (): Promise<boolean> => {
    // Check if Matrix is globally disabled
    if (!isMatrixEnabled()) {
      // eslint-disable-next-line no-console
      console.info('[Matrix] Matrix is disabled in config, skipping initialization');
      return false;
    }

    if (!peerID || initializingRef.current) {
      return false;
    }

    initializingRef.current = true;
    setInitializing(true);
    setConnectionError(null);
    clearRetryTimer();

    try {
      // 使用 peerID 初始化 Matrix（自动登录）
      const success = await matrixClient.initializeWithPeerID(peerID);

      if (!success) {
        throw new Error('Failed to initialize Matrix client');
      }

      // 启动同步
      await matrixClient.startSync();

      // 加载房间列表（分离已加入和待确认邀请）
      const allRooms = await matrixClient.getRooms();
      const { rooms, invites } = splitRoomsAndInvites(allRooms);
      setRooms(rooms);
      setInvites(invites);

      initRef.current = true;
      retryCountRef.current = 0;
      setConnected(true);

      // Sync Mobazha profile to Matrix (name + avatar)
      const profile = useUserStore.getState().profile;
      if (profile?.name) {
        matrixClient.syncProfileToMatrix(profile.name, undefined).catch(() => {});
      }

      // Write own peerID into all joined rooms
      for (const room of rooms) {
        matrixClient.setMyPeerIDInRoom(room.roomId).catch(() => {});
      }

      // eslint-disable-next-line no-console
      console.info('[Matrix] Initialized successfully with', rooms.length, 'rooms');
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Matrix initialization failed';
      console.error('[Matrix] Initialization failed:', errorMsg);
      setConnectionError(errorMsg);

      // 自动重试逻辑
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.warn(
          `[Matrix] Will retry in ${retryInterval / 1000}s (attempt ${retryCountRef.current}/${maxRetries})`
        );

        retryTimerRef.current = setTimeout(() => {
          if (isAuthenticated && peerID) {
            initialize();
          }
        }, retryInterval);
      }

      return false;
    } finally {
      initializingRef.current = false;
      setInitializing(false);
    }
  }, [
    peerID,
    setInitializing,
    setConnectionError,
    setConnected,
    setRooms,
    setInvites,
    clearRetryTimer,
    maxRetries,
    retryInterval,
    isAuthenticated,
  ]);

  // 手动重试
  const retry = useCallback(async (): Promise<boolean> => {
    retryCountRef.current = 0; // 重置重试计数
    clearRetryTimer();
    return initialize();
  }, [initialize, clearRetryTimer]);

  // 断开连接
  const disconnect = useCallback(async () => {
    clearRetryTimer();

    try {
      await matrixClient.stopSync();
      await matrixClient.logout();
    } catch (err) {
      console.warn('[Matrix] Disconnect error:', err);
    }

    initRef.current = false;
    retryCountRef.current = 0;
    resetChatStore();
  }, [resetChatStore, clearRetryTimer]);

  // 监听 Matrix 事件
  useEffect(() => {
    if (!effectiveEnabled) return;

    // 消息事件
    const onMessageReceived = (data: unknown) => {
      const message = data as MatrixMessage;
      addMessage(message.roomId, message);

      const currentUserId = matrixClient.getUserId();
      const state = useChatStore.getState();
      const isViewingRoom = state.drawerOpen && state.currentRoomId === message.roomId;
      const shouldIncrementUnread = message.sender !== currentUserId && !isViewingRoom;

      const roomUpdate: Partial<MatrixRoom> = {
        lastMessage: message,
        timestamp: message.timestamp,
      };

      if (shouldIncrementUnread) {
        const room = state.rooms.find(r => r.roomId === message.roomId);
        if (room) {
          roomUpdate.unreadCount = room.unreadCount + 1;
        }
      }

      updateRoom(message.roomId, roomUpdate);
    };

    // 本地回显：消息正在发送（乐观 UI）
    const onMessageSending = (data: unknown) => {
      const { localId, roomId } = data as { localId: string; roomId: string };
      const placeholder: MatrixMessage = {
        id: localId,
        localId,
        roomId,
        sender: matrixClient.getUserId() || '',
        content: '',
        type: 'text',
        timestamp: Date.now(),
        status: 'sending' as const,
      };
      addMessage(roomId, placeholder);
    };

    // 自己发送成功的消息（sendMessage 将 eventId 加入 processedMessageIds
    // 防止 Timeline listener 重复处理，因此需要单独订阅 MESSAGE_SENT）
    const onMessageSent = (data: unknown) => {
      const message = data as MatrixMessage;
      if (message.localId) {
        updateMessage(message.roomId, message.localId, {
          ...message,
          status: 'sent' as const,
        });
      } else {
        addMessage(message.roomId, message);
      }
      updateRoom(message.roomId, {
        lastMessage: message,
        timestamp: message.timestamp,
      });
    };

    // 消息发送失败
    const onMessageFailed = (data: unknown) => {
      const { localId, roomId } = data as { localId: string; roomId: string };
      if (localId) {
        updateMessage(roomId, localId, { status: 'failed' as const });
      }
    };

    // 消息更新事件（如解密后更新）
    const onMessageUpdated = (data: unknown) => {
      const message = data as MatrixMessage;
      // 更新消息内容
      updateMessage(message.roomId, message.id, message);
      // 如果是最新消息，也更新房间的 lastMessage
      updateRoom(message.roomId, {
        lastMessage: message,
        timestamp: message.timestamp,
      });
    };

    // 房间事件
    const onRoomJoined = async () => {
      const allRooms = await matrixClient.getRooms();
      const { rooms, invites } = splitRoomsAndInvites(allRooms);
      setRooms(rooms);
      setInvites(invites);
    };

    const onRoomLeft = (data: unknown) => {
      const { roomId } = data as { roomId: string };
      removeRoom(roomId);
    };

    const onRoomInvite = async () => {
      const allRooms = await matrixClient.getRooms();
      const { rooms, invites } = splitRoomsAndInvites(allRooms);
      setRooms(rooms);
      setInvites(invites);
    };

    // 输入状态
    const onTyping = (data: unknown) => {
      const { roomId, userIds } = data as { roomId: string; userIds: string[] };
      setTypingUsers(roomId, userIds);
    };

    // 在线状态
    const onPresence = (data: unknown) => {
      const { userId, presence } = data as {
        userId: string;
        presence: 'online' | 'offline' | 'unavailable';
      };
      setUserPresence(userId, presence);
    };

    // 房间事件（成员变更等）
    const onRoomEvent = (data: unknown) => {
      const roomEvent = data as MatrixMessage;
      if (roomEvent.isRoomEvent) {
        // 添加房间事件到消息列表
        addMessage(roomEvent.roomId, roomEvent);
      }
    };

    // 成员 peerID 更新事件
    const onMemberPeerIDUpdated = (data: unknown) => {
      const { roomId, userId, peerID } = data as {
        roomId: string;
        userId: string;
        peerID: string;
      };
      if (peerID) {
        updateRoomMemberPeerID(roomId, userId, peerID);
      }
    };

    // 连接状态
    const onConnected = () => {
      setConnected(true);
      retryCountRef.current = 0; // 连接成功时重置重试计数
    };

    const onDisconnected = () => {
      setConnected(false);
      // 断线自动重连
      if (isAuthenticated && peerID && initRef.current && retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.warn(`[Matrix] Disconnected, will reconnect in ${retryInterval / 1000}s`);

        retryTimerRef.current = setTimeout(() => {
          if (isAuthenticated && peerID) {
            matrixClient.startSync().catch(console.error);
          }
        }, retryInterval);
      }
    };

    // Token 过期需要重新登录
    const onAuthRequired = async (data: unknown) => {
      const { reason } = (data || {}) as { reason?: string };
      console.warn(`[Matrix] Auth required: ${reason}, re-initializing...`);

      // 清除重试定时器
      clearRetryTimer();

      // 先登出清除旧的 token
      try {
        await matrixClient.logout();
      } catch {
        // 忽略登出错误
      }

      // 重置状态
      initRef.current = false;
      retryCountRef.current = 0;

      // 延迟后重新初始化（使用新的 token）
      retryTimerRef.current = setTimeout(() => {
        if (isAuthenticated && peerID) {
          console.warn('[Matrix] Re-initializing after auth required...');
          initialize();
        }
      }, 2000);
    };

    // 订阅事件
    const unsubscribers = [
      matrixEvents.on(MATRIX_EVENTS.CONNECTED, onConnected),
      matrixEvents.on(MATRIX_EVENTS.DISCONNECTED, onDisconnected),
      matrixEvents.on(MATRIX_EVENTS.AUTH_REQUIRED, onAuthRequired),
      matrixEvents.on(MATRIX_EVENTS.MESSAGE_RECEIVED, onMessageReceived),
      matrixEvents.on(MATRIX_EVENTS.MESSAGE_SENDING, onMessageSending),
      matrixEvents.on(MATRIX_EVENTS.MESSAGE_SENT, onMessageSent),
      matrixEvents.on(MATRIX_EVENTS.MESSAGE_FAILED, onMessageFailed),
      matrixEvents.on(MATRIX_EVENTS.MESSAGE_UPDATED, onMessageUpdated),
      matrixEvents.on(MATRIX_EVENTS.ROOM_JOINED, onRoomJoined),
      matrixEvents.on(MATRIX_EVENTS.ROOM_LEFT, onRoomLeft),
      matrixEvents.on(MATRIX_EVENTS.ROOM_INVITE, onRoomInvite),
      matrixEvents.on(MATRIX_EVENTS.ROOM_EVENT, onRoomEvent),
      matrixEvents.on(MATRIX_EVENTS.TYPING, onTyping),
      matrixEvents.on(MATRIX_EVENTS.PRESENCE_CHANGED, onPresence),
      matrixEvents.on(MATRIX_EVENTS.MEMBER_PEERID_UPDATED, onMemberPeerIDUpdated),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [
    effectiveEnabled,
    addMessage,
    updateMessage,
    updateRoom,
    setRooms,
    setInvites,
    removeRoom,
    setTypingUsers,
    setUserPresence,
    updateRoomMemberPeerID,
    setConnected,
    isAuthenticated,
    peerID,
    maxRetries,
    retryInterval,
    clearRetryTimer,
    initialize,
  ]);

  // 自动初始化
  useEffect(() => {
    if (!effectiveEnabled || !autoConnect) return;

    // 当用户登录且有 peerID 时自动初始化
    if (isAuthenticated && peerID && !initRef.current && !initializingRef.current) {
      // eslint-disable-next-line no-console
      console.info('[Matrix] User authenticated, initializing...');
      initialize();
    }

    // 当用户登出时断开连接
    if (!isAuthenticated && initRef.current) {
      // eslint-disable-next-line no-console
      console.info('[Matrix] User logged out, disconnecting...');
      disconnect();
    }
  }, [effectiveEnabled, autoConnect, isAuthenticated, peerID, initialize, disconnect]);

  // 清理
  useEffect(() => {
    return () => {
      clearRetryTimer();
    };
  }, [clearRetryTimer]);

  return {
    isInitialized: initRef.current,
    isConnected,
    error: connectionError,
    retryCount: retryCountRef.current,
    initialize,
    disconnect,
    retry,
  };
}

export default useMatrixInit;
