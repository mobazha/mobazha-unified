/**
 * Matrix 聊天 Hook
 * 连接 Matrix 服务和 UI 状态
 */

import { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { matrixClient } from '../services/matrix/client';
import { matrixEvents } from '../services/matrix/events';
import { MATRIX_EVENTS, MESSAGE_STATUS } from '../services/matrix/types';
import type { MatrixRoom, MatrixMessage, MatrixConfig } from '../services/matrix/types';

export interface UseMatrixChatOptions {
  /** 自动初始化 */
  autoInit?: boolean;
  /** 用户 peerID */
  peerID?: string;
  /** Matrix 配置 */
  config?: Partial<MatrixConfig>;
}

export interface UseMatrixChatReturn {
  // 状态
  isConnected: boolean;
  isInitializing: boolean;
  error: string | null;
  rooms: MatrixRoom[];
  invites: MatrixRoom[];
  currentRoom: MatrixRoom | undefined;

  // 动作
  initialize: (peerID: string, config?: Partial<MatrixConfig>) => Promise<boolean>;
  disconnect: () => Promise<void>;
  loadRooms: () => Promise<void>;
  selectRoom: (roomId: string | null) => void;
  sendMessage: (roomId: string, content: string) => Promise<boolean>;
  sendImage: (roomId: string, imageData: ImageData) => Promise<boolean>;
  loadMoreMessages: (roomId: string) => Promise<void>;
  markAsRead: (roomId: string) => Promise<void>;
  createDirectRoom: (userId: string, displayName?: string) => Promise<string | null>;
  joinRoom: (roomIdOrAlias: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  sendTyping: (roomId: string, isTyping: boolean) => void;
  searchMessages: (roomId: string, query: string) => Promise<MatrixMessage[]>;
  refresh: () => Promise<void>;
}

interface ImageData {
  uri: string;
  width?: number;
  height?: number;
  filename?: string;
  mimeType?: string;
}

/**
 * Matrix 聊天 Hook
 */
export function useMatrixChat(options: UseMatrixChatOptions = {}): UseMatrixChatReturn {
  const { autoInit = false, peerID, config } = options;
  const initRef = useRef(false);

  // Store 状态和动作
  const {
    isConnected,
    isInitializing,
    connectionError,
    rooms,
    invites,
    currentRoomId,
    setConnected,
    setInitializing,
    setConnectionError,
    setRooms,
    setInvites,
    updateRoom,
    removeRoom,
    setCurrentRoom,
    addMessage,
    updateMessage,
    prependMessages,
    setLoadingMessages,
    setHasMoreMessages,
    setTypingUsers,
    setUserPresence,
    markRoomAsRead,
  } = useChatStore();

  const currentRoom = rooms.find(r => r.roomId === currentRoomId);

  // ============= 初始化 =============

  const initialize = useCallback(
    async (_userPeerID: string, matrixConfig?: Partial<MatrixConfig>): Promise<boolean> => {
      if (isInitializing) return false;

      setInitializing(true);
      setConnectionError(null);

      try {
        // 初始化客户端
        const success = await matrixClient.initialize(matrixConfig);
        if (!success) {
          throw new Error('Failed to initialize Matrix client');
        }

        // 启动同步
        await matrixClient.startSync();
        setConnected(true);

        // 加载房间
        const roomList = await matrixClient.getRooms();
        setRooms(roomList);

        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Matrix initialization failed';
        setConnectionError(errorMsg);
        return false;
      } finally {
        setInitializing(false);
      }
    },
    [isInitializing, setInitializing, setConnectionError, setConnected, setRooms]
  );

  const disconnect = useCallback(async () => {
    await matrixClient.stopSync();
    await matrixClient.logout();
    setConnected(false);
    setRooms([]);
    setInvites([]);
  }, [setConnected, setRooms, setInvites]);

  // ============= 房间操作 =============

  const loadRooms = useCallback(async () => {
    const roomList = await matrixClient.getRooms();
    setRooms(roomList);
  }, [setRooms]);

  const selectRoom = useCallback(
    (roomId: string | null) => {
      setCurrentRoom(roomId);
      if (roomId) {
        markRoomAsRead(roomId);
        matrixClient.markRoomAsRead(roomId);
      }
    },
    [setCurrentRoom, markRoomAsRead]
  );

  const createDirectRoom = useCallback(
    async (userId: string, displayName?: string): Promise<string | null> => {
      return matrixClient.createDirectRoom(userId, displayName);
    },
    []
  );

  const joinRoom = useCallback(async (roomIdOrAlias: string): Promise<boolean> => {
    return matrixClient.joinRoom(roomIdOrAlias);
  }, []);

  const leaveRoom = useCallback(
    async (roomId: string): Promise<boolean> => {
      const success = await matrixClient.leaveRoom(roomId);
      if (success) {
        removeRoom(roomId);
      }
      return success;
    },
    [removeRoom]
  );

  // ============= 消息操作 =============

  const sendMessage = useCallback(
    async (roomId: string, content: string): Promise<boolean> => {
      const localId = `local_${Date.now()}`;

      // 乐观更新 - 立即显示消息
      const optimisticMessage: MatrixMessage = {
        id: localId,
        localId,
        roomId,
        sender: matrixClient.getUserId() || '',
        content,
        type: 'text',
        timestamp: Date.now(),
        status: MESSAGE_STATUS.SENDING,
      };

      addMessage(roomId, optimisticMessage);

      try {
        const result = await matrixClient.sendMessage(roomId, content);
        if (result) {
          updateMessage(roomId, localId, {
            id: result.id,
            status: MESSAGE_STATUS.SENT,
          });
          return true;
        }

        updateMessage(roomId, localId, { status: MESSAGE_STATUS.FAILED });
        return false;
      } catch {
        updateMessage(roomId, localId, { status: MESSAGE_STATUS.FAILED });
        return false;
      }
    },
    [addMessage, updateMessage]
  );

  const sendImage = useCallback(
    async (_roomId: string, _imageData: ImageData): Promise<boolean> => {
      // TODO: 实现图片发送
      return false;
    },
    []
  );

  const loadMoreMessages = useCallback(
    async (roomId: string) => {
      setLoadingMessages(roomId, true);

      try {
        const messageList = await matrixClient.getMessages(roomId, 50);
        prependMessages(roomId, messageList);
        setHasMoreMessages(roomId, messageList.length >= 50);
      } finally {
        setLoadingMessages(roomId, false);
      }
    },
    [setLoadingMessages, prependMessages, setHasMoreMessages]
  );

  const markAsRead = useCallback(
    async (roomId: string) => {
      markRoomAsRead(roomId);
      await matrixClient.markRoomAsRead(roomId);
    },
    [markRoomAsRead]
  );

  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    matrixClient.sendTyping(roomId, isTyping);
  }, []);

  const searchMessages = useCallback(
    async (_roomId: string, _query: string): Promise<MatrixMessage[]> => {
      // TODO: 实现消息搜索
      return [];
    },
    []
  );

  const refresh = useCallback(async () => {
    await loadRooms();
  }, [loadRooms]);

  // ============= 事件监听 =============

  useEffect(() => {
    // 连接状态
    const onConnected = () => setConnected(true);
    const onDisconnected = () => setConnected(false);

    // 消息事件
    const onMessageReceived = (data: unknown) => {
      const message = data as MatrixMessage;
      addMessage(message.roomId, message);
      // 更新房间的最后消息
      updateRoom(message.roomId, {
        lastMessage: message,
        timestamp: message.timestamp,
      });
    };

    const onMessageSent = (data: unknown) => {
      const { localId, eventId, roomId } = data as {
        localId: string;
        eventId: string;
        roomId: string;
      };
      updateMessage(roomId, localId, {
        id: eventId,
        status: MESSAGE_STATUS.SENT,
      });
    };

    const onMessageFailed = (data: unknown) => {
      const { localId, roomId } = data as { localId: string; roomId: string };
      updateMessage(roomId, localId, {
        status: MESSAGE_STATUS.FAILED,
      });
    };

    // 房间事件
    const onRoomInvite = () => {
      // 刷新邀请列表
      loadRooms();
    };

    const onRoomJoined = () => {
      loadRooms();
    };

    const onRoomLeft = (data: unknown) => {
      const { roomId } = data as { roomId: string };
      removeRoom(roomId);
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

    // 订阅事件
    const unsubscribers = [
      matrixEvents.on(MATRIX_EVENTS.CONNECTED, onConnected),
      matrixEvents.on(MATRIX_EVENTS.DISCONNECTED, onDisconnected),
      matrixEvents.on(MATRIX_EVENTS.MESSAGE_RECEIVED, onMessageReceived),
      matrixEvents.on(MATRIX_EVENTS.MESSAGE_SENT, onMessageSent),
      matrixEvents.on(MATRIX_EVENTS.MESSAGE_FAILED, onMessageFailed),
      matrixEvents.on(MATRIX_EVENTS.ROOM_INVITE, onRoomInvite),
      matrixEvents.on(MATRIX_EVENTS.ROOM_JOINED, onRoomJoined),
      matrixEvents.on(MATRIX_EVENTS.ROOM_LEFT, onRoomLeft),
      matrixEvents.on(MATRIX_EVENTS.TYPING, onTyping),
      matrixEvents.on(MATRIX_EVENTS.PRESENCE_CHANGED, onPresence),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [
    setConnected,
    addMessage,
    updateRoom,
    updateMessage,
    loadRooms,
    removeRoom,
    setTypingUsers,
    setUserPresence,
  ]);

  // ============= 自动初始化 =============

  useEffect(() => {
    if (autoInit && peerID && !initRef.current) {
      initRef.current = true;
      initialize(peerID, config);
    }
  }, [autoInit, peerID, config, initialize]);

  return {
    // 状态
    isConnected,
    isInitializing,
    error: connectionError,
    rooms,
    invites,
    currentRoom,

    // 动作
    initialize,
    disconnect,
    loadRooms,
    selectRoom,
    sendMessage,
    sendImage,
    loadMoreMessages,
    markAsRead,
    createDirectRoom,
    joinRoom,
    leaveRoom,
    sendTyping,
    searchMessages,
    refresh,
  };
}

export default useMatrixChat;
