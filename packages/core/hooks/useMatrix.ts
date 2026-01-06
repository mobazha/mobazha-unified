/**
 * Matrix 聊天 React Hook
 * 提供聊天功能的 React 接口
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { matrixClient } from '../services/matrix/client';
import { matrixEvents } from '../services/matrix/events';
import { MATRIX_EVENTS } from '../services/matrix/types';
import type {
  MatrixRoom,
  MatrixMessage,
  MatrixConfig,
  InvitePolicy,
} from '../services/matrix/types';

export interface UseMatrixReturn {
  // 状态
  isConnected: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  userId: string | null;

  // 房间
  rooms: MatrixRoom[];
  currentRoom: MatrixRoom | null;

  // 消息
  messages: MatrixMessage[];
  isSending: boolean;

  // 方法
  initialize: (config?: Partial<MatrixConfig>) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  // 房间操作
  selectRoom: (roomId: string | null) => void;
  createDirectRoom: (userId: string, displayName?: string) => Promise<string | null>;
  joinRoom: (roomIdOrAlias: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;

  // 消息操作
  sendMessage: (content: string) => Promise<MatrixMessage | null>;
  loadMoreMessages: () => Promise<void>;

  // 设置
  setInvitePolicy: (policy: InvitePolicy) => void;
  getInvitePolicy: () => InvitePolicy;
}

/**
 * Matrix 聊天 Hook
 */
export function useMatrix(): UseMatrixReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [rooms, setRooms] = useState<MatrixRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MatrixMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesRef = useRef<MatrixMessage[]>([]);

  // 获取当前房间
  const currentRoom = rooms.find(r => r.roomId === currentRoomId) || null;

  // 初始化
  const initialize = useCallback(async (config?: Partial<MatrixConfig>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await matrixClient.initialize(config);
      setIsInitialized(success);
      if (success) {
        setUserId(matrixClient.getUserId());
      }
      return success;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登录
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await matrixClient.login(username, password);
      if (success) {
        setUserId(matrixClient.getUserId());
      }
      return success;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async (): Promise<void> => {
    await matrixClient.logout();
    setIsConnected(false);
    setUserId(null);
    setRooms([]);
    setMessages([]);
    setCurrentRoomId(null);
  }, []);

  // 连接（启动同步）
  const connect = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await matrixClient.startSync();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(async (): Promise<void> => {
    await matrixClient.stopSync();
  }, []);

  // 选择房间
  const selectRoom = useCallback(async (roomId: string | null) => {
    setCurrentRoomId(roomId);
    if (roomId) {
      const roomMessages = await matrixClient.getMessages(roomId);
      setMessages(roomMessages);
      messagesRef.current = roomMessages;
    } else {
      setMessages([]);
      messagesRef.current = [];
    }
  }, []);

  // 创建直接聊天房间
  const createDirectRoom = useCallback(
    async (targetUserId: string, displayName?: string): Promise<string | null> => {
      setIsLoading(true);
      try {
        return await matrixClient.createDirectRoom(targetUserId, displayName);
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 加入房间
  const joinRoom = useCallback(async (roomIdOrAlias: string): Promise<boolean> => {
    return await matrixClient.joinRoom(roomIdOrAlias);
  }, []);

  // 离开房间
  const leaveRoom = useCallback(
    async (roomId: string): Promise<boolean> => {
      const success = await matrixClient.leaveRoom(roomId);
      if (success && roomId === currentRoomId) {
        setCurrentRoomId(null);
        setMessages([]);
      }
      return success;
    },
    [currentRoomId]
  );

  // 发送消息
  const sendMessage = useCallback(
    async (content: string): Promise<MatrixMessage | null> => {
      if (!currentRoomId || !content.trim()) return null;

      setIsSending(true);
      try {
        const message = await matrixClient.sendMessage(currentRoomId, content);
        return message;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [currentRoomId]
  );

  // 加载更多消息
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!currentRoomId) return;
    // TODO: 实现分页加载
    const allMessages = await matrixClient.getMessages(currentRoomId, 100);
    setMessages(allMessages);
    messagesRef.current = allMessages;
  }, [currentRoomId]);

  // 设置邀请策略
  const setInvitePolicy = useCallback((policy: InvitePolicy) => {
    matrixClient.setInvitePolicy(policy);
  }, []);

  // 获取邀请策略
  const getInvitePolicy = useCallback((): InvitePolicy => {
    return matrixClient.getInvitePolicy();
  }, []);

  // 刷新房间列表
  const refreshRooms = useCallback(async () => {
    const roomList = await matrixClient.getRooms();
    setRooms(roomList);
  }, []);

  // 事件监听
  useEffect(() => {
    const unsubConnected = matrixEvents.on(MATRIX_EVENTS.CONNECTED, () => {
      setIsConnected(true);
      refreshRooms();
    });

    const unsubDisconnected = matrixEvents.on(MATRIX_EVENTS.DISCONNECTED, () => {
      setIsConnected(false);
    });

    const unsubMessageReceived = matrixEvents.on(MATRIX_EVENTS.MESSAGE_RECEIVED, data => {
      const message = data as MatrixMessage;
      if (message.roomId === currentRoomId) {
        setMessages(prev => {
          // 避免重复
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      // 更新房间列表中的最后消息
      setRooms(prev =>
        prev.map(room =>
          room.roomId === message.roomId
            ? { ...room, lastMessage: message, unreadCount: room.unreadCount + 1 }
            : room
        )
      );
    });

    const unsubMessageSent = matrixEvents.on(MATRIX_EVENTS.MESSAGE_SENT, data => {
      const message = data as MatrixMessage;
      if (message.roomId === currentRoomId) {
        setMessages(prev => {
          // 替换本地消息或添加新消息
          const localIndex = prev.findIndex(m => m.localId === message.localId);
          if (localIndex >= 0) {
            const updated = [...prev];
            updated[localIndex] = message;
            return updated;
          }
          return [...prev, message];
        });
      }
    });

    const unsubRoomJoined = matrixEvents.on(MATRIX_EVENTS.ROOM_JOINED, () => {
      refreshRooms();
    });

    const unsubRoomLeft = matrixEvents.on(MATRIX_EVENTS.ROOM_LEFT, () => {
      refreshRooms();
    });

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubMessageReceived();
      unsubMessageSent();
      unsubRoomJoined();
      unsubRoomLeft();
    };
  }, [currentRoomId, refreshRooms]);

  return {
    // 状态
    isConnected,
    isInitialized,
    isLoading,
    error,
    userId,

    // 房间
    rooms,
    currentRoom,

    // 消息
    messages,
    isSending,

    // 方法
    initialize,
    login,
    logout,
    connect,
    disconnect,

    // 房间操作
    selectRoom,
    createDirectRoom,
    joinRoom,
    leaveRoom,

    // 消息操作
    sendMessage,
    loadMoreMessages,

    // 设置
    setInvitePolicy,
    getInvitePolicy,
  };
}

export default useMatrix;
