/**
 * 聊天状态管理
 * 管理 Matrix 聊天相关的所有状态
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { MatrixRoom, MatrixMessage } from '../services/matrix/types';

// ============= 类型定义 =============

export interface ChatState {
  // 连接状态
  isConnected: boolean;
  isInitializing: boolean;
  connectionError: string | null;

  // 房间数据
  rooms: MatrixRoom[];
  invites: MatrixRoom[];
  currentRoomId: string | null;
  currentInvite: MatrixRoom | null; // 当前正在查看的邀请

  // 消息数据
  messages: Record<string, MatrixMessage[]>;
  loadingMessages: Record<string, boolean>;
  hasMoreMessages: Record<string, boolean>;

  // 输入状态
  typingUsers: Record<string, string[]>; // roomId -> userIds[]

  // 验证状态
  verifiedUsers: Record<string, boolean>; // userId -> isVerified

  // UI 状态
  searchQuery: string;
  activeTab: 'all' | 'direct' | 'groups' | 'orders';

  // Drawer 状态
  drawerOpen: boolean;
  drawerExpanded: boolean;
  pendingPeerID: string | null;
  pendingPeerDisplayName: string | null;

  // 动作
  setConnected: (connected: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  setConnectionError: (error: string | null) => void;

  setRooms: (rooms: MatrixRoom[]) => void;
  setInvites: (invites: MatrixRoom[]) => void;
  addRoom: (room: MatrixRoom) => void;
  updateRoom: (roomId: string, updates: Partial<MatrixRoom>) => void;
  removeRoom: (roomId: string) => void;
  setCurrentRoom: (roomId: string | null) => void;
  setCurrentInvite: (invite: MatrixRoom | null) => void;

  setMessages: (roomId: string, messages: MatrixMessage[]) => void;
  addMessage: (roomId: string, message: MatrixMessage) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<MatrixMessage>) => void;
  removeMessage: (roomId: string, messageId: string) => void;
  prependMessages: (roomId: string, messages: MatrixMessage[]) => void;
  setLoadingMessages: (roomId: string, loading: boolean) => void;
  setHasMoreMessages: (roomId: string, hasMore: boolean) => void;

  setTypingUsers: (roomId: string, userIds: string[]) => void;

  setUserVerified: (userId: string, verified: boolean) => void;

  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: 'all' | 'direct' | 'groups' | 'orders') => void;

  // Drawer 动作
  setDrawerOpen: (open: boolean) => void;
  setDrawerExpanded: (expanded: boolean) => void;
  openDrawer: () => void;
  openDrawerWithPeer: (peerID: string, displayName?: string) => void;
  clearPendingPeer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  updateRoomMemberPeerID: (roomId: string, userId: string, peerID: string) => void;
  markRoomAsRead: (roomId: string) => void;
  clearMessages: (roomId: string) => void;
  reset: () => void;
}

// ============= 初始状态 =============

const initialState = {
  isConnected: false,
  isInitializing: false,
  connectionError: null,

  rooms: [],
  invites: [],
  currentRoomId: null,
  currentInvite: null,

  messages: {},
  loadingMessages: {},
  hasMoreMessages: {},

  typingUsers: {},

  verifiedUsers: {},

  searchQuery: '',
  activeTab: 'all' as const,

  // Drawer 状态
  drawerOpen: false,
  drawerExpanded: false,
  pendingPeerID: null,
  pendingPeerDisplayName: null,
};

// ============= Store =============

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      set => ({
        ...initialState,

        // 连接状态
        setConnected: connected => set({ isConnected: connected }),
        setInitializing: initializing => set({ isInitializing: initializing }),
        setConnectionError: error => set({ connectionError: error }),

        // 房间管理
        setRooms: rooms => set({ rooms }),
        setInvites: invites => set({ invites }),

        addRoom: room =>
          set(state => {
            const exists = state.rooms.some(r => r.roomId === room.roomId);
            if (exists) {
              return {
                rooms: state.rooms.map(r => (r.roomId === room.roomId ? { ...r, ...room } : r)),
              };
            }
            return { rooms: [room, ...state.rooms] };
          }),

        updateRoom: (roomId, updates) =>
          set(state => ({
            rooms: state.rooms.map(r => (r.roomId === roomId ? { ...r, ...updates } : r)),
          })),

        updateRoomMemberPeerID: (roomId, userId, peerID) =>
          set(state => ({
            rooms: state.rooms.map(r => {
              if (r.roomId !== roomId) return r;
              return {
                ...r,
                memberPeerIDs: {
                  ...(r.memberPeerIDs || {}),
                  [userId]: peerID,
                },
                members: r.members.map(m => (m.userId === userId ? { ...m, peerID } : m)),
              };
            }),
          })),

        removeRoom: roomId =>
          set(state => ({
            rooms: state.rooms.filter(r => r.roomId !== roomId),
            invites: state.invites.filter(r => r.roomId !== roomId),
          })),

        setCurrentRoom: roomId => set({ currentRoomId: roomId }),

        setCurrentInvite: invite => set({ currentInvite: invite }),

        // 消息管理
        setMessages: (roomId, messages) =>
          set(state => ({
            messages: {
              ...state.messages,
              [roomId]: [...messages].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)),
            },
          })),

        addMessage: (roomId, message) =>
          set(state => {
            const existing = state.messages[roomId] || [];
            // Check by id or localId
            const idMatch = existing.findIndex(
              m => m.id === message.id || (m.localId && m.localId === message.localId)
            );
            if (idMatch >= 0) {
              return {
                messages: {
                  ...state.messages,
                  [roomId]: existing.map((m, i) => (i === idMatch ? { ...m, ...message } : m)),
                },
              };
            }
            const updated = [...existing, message];
            updated.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
            return {
              messages: {
                ...state.messages,
                [roomId]: updated,
              },
            };
          }),

        updateMessage: (roomId, messageId, updates) =>
          set(state => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).map(m =>
                m.id === messageId || m.localId === messageId ? { ...m, ...updates } : m
              ),
            },
          })),

        removeMessage: (roomId, messageId) =>
          set(state => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).filter(
                m => m.id !== messageId && m.localId !== messageId
              ),
            },
          })),

        prependMessages: (roomId, messages) =>
          set(state => {
            const existing = state.messages[roomId] || [];
            const existingIds = new Set(existing.map(m => m.id).filter(Boolean));
            const uniqueNew = messages.filter(m => !m.id || !existingIds.has(m.id));
            const merged = [...uniqueNew, ...existing];
            merged.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
            return {
              messages: {
                ...state.messages,
                [roomId]: merged,
              },
            };
          }),

        setLoadingMessages: (roomId, loading) =>
          set(state => ({
            loadingMessages: { ...state.loadingMessages, [roomId]: loading },
          })),

        setHasMoreMessages: (roomId, hasMore) =>
          set(state => ({
            hasMoreMessages: { ...state.hasMoreMessages, [roomId]: hasMore },
          })),

        // 输入状态
        setTypingUsers: (roomId, userIds) =>
          set(state => ({
            typingUsers: { ...state.typingUsers, [roomId]: userIds },
          })),

        // 验证状态
        setUserVerified: (userId, verified) =>
          set(state => ({
            verifiedUsers: { ...state.verifiedUsers, [userId]: verified },
          })),

        // UI 状态
        setSearchQuery: query => set({ searchQuery: query }),
        setActiveTab: tab => set({ activeTab: tab }),

        // Drawer 动作
        setDrawerOpen: open => set({ drawerOpen: open }),
        setDrawerExpanded: expanded => set({ drawerExpanded: expanded }),
        openDrawer: () => set({ drawerOpen: true }),
        openDrawerWithPeer: (peerID, displayName) =>
          set({
            drawerOpen: true,
            pendingPeerID: peerID,
            pendingPeerDisplayName: displayName ?? null,
            currentRoomId: null,
            currentInvite: null,
          }),
        clearPendingPeer: () => set({ pendingPeerID: null, pendingPeerDisplayName: null }),
        closeDrawer: () =>
          set({
            drawerOpen: false,
            currentRoomId: null,
            currentInvite: null,
            pendingPeerID: null,
            pendingPeerDisplayName: null,
          }),
        toggleDrawer: () => set(state => ({ drawerOpen: !state.drawerOpen })),

        // 标记已读
        markRoomAsRead: roomId =>
          set(state => ({
            rooms: state.rooms.map(r => (r.roomId === roomId ? { ...r, unreadCount: 0 } : r)),
          })),

        // 清除消息
        clearMessages: roomId =>
          set(state => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [roomId]: _removed, ...rest } = state.messages;
            return { messages: rest };
          }),

        // 重置
        reset: () => set(initialState),
      }),
      {
        name: 'mobazha-chat-store',
        storage: createJSONStorage(() => {
          // 浏览器环境使用 localStorage，其他环境使用内存存储
          if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage;
          }
          // 内存存储备用
          const store: Record<string, string> = {};
          return {
            getItem: (name: string) => store[name] || null,
            setItem: (name: string, value: string) => {
              store[name] = value;
            },
            removeItem: (name: string) => {
              delete store[name];
            },
          };
        }),
        // 只持久化部分状态
        partialize: state => ({
          verifiedUsers: state.verifiedUsers,
          activeTab: state.activeTab,
        }),
      }
    ),
    { name: 'ChatStore' }
  )
);

// ============= 选择器 =============

// 房间相关
export const selectRooms = (state: ChatState) => state.rooms;
export const selectInvites = (state: ChatState) => state.invites;
export const selectCurrentRoom = (state: ChatState) =>
  state.rooms.find(r => r.roomId === state.currentRoomId);

// 过滤房间
export const selectFilteredRooms = (state: ChatState) => {
  let filtered = state.rooms;

  // 按标签过滤
  if (state.activeTab !== 'all') {
    filtered = filtered.filter(room => {
      switch (state.activeTab) {
        case 'direct':
          return room.isDirect;
        case 'groups':
          return room.roomType === 'group' || room.roomType === 'community';
        case 'orders':
          return room.roomType === 'order' || room.roomType === 'moderator';
        default:
          return true;
      }
    });
  }

  // 按搜索词过滤
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      room =>
        room.name?.toLowerCase().includes(query) ||
        room.lastMessage?.content?.toLowerCase().includes(query)
    );
  }

  return filtered;
};

// 房间类型分组
export const selectRoomsByType = (state: ChatState) => {
  const direct: MatrixRoom[] = [];
  const groups: MatrixRoom[] = [];
  const orders: MatrixRoom[] = [];
  const communities: MatrixRoom[] = [];

  for (const room of state.rooms) {
    if (room.roomType === 'community') {
      communities.push(room);
    } else if (room.roomType === 'order' || room.roomType === 'moderator') {
      orders.push(room);
    } else if (room.isDirect) {
      direct.push(room);
    } else {
      groups.push(room);
    }
  }

  return { direct, groups, orders, communities };
};

// 消息相关
export const selectMessages = (roomId: string) => (state: ChatState) =>
  state.messages[roomId] || [];

export const selectIsLoadingMessages = (roomId: string) => (state: ChatState) =>
  state.loadingMessages[roomId] || false;

// 未读消息总数
export const selectTotalUnreadCount = (state: ChatState) =>
  state.rooms.reduce((sum, room) => sum + room.unreadCount, 0);

// 指定 peerID 的未读消息数（匹配 memberPeerIDs 中的值）
export const selectUnreadCountByPeerID = (peerID: string | undefined) => (state: ChatState) => {
  if (!peerID) return 0;
  return state.rooms.reduce((sum, room) => {
    const peerIDs = room.memberPeerIDs ? Object.values(room.memberPeerIDs) : [];
    if (peerIDs.includes(peerID)) {
      return sum + room.unreadCount;
    }
    return sum;
  }, 0);
};

// 连接状态
export const selectIsConnected = (state: ChatState) => state.isConnected;
export const selectConnectionError = (state: ChatState) => state.connectionError;

// 验证状态
export const selectIsUserVerified = (userId: string) => (state: ChatState) =>
  state.verifiedUsers[userId] || false;

// 输入状态
export const selectTypingUsers = (roomId: string) => (state: ChatState) =>
  state.typingUsers[roomId] || [];

// Drawer 状态
export const selectDrawerOpen = (state: ChatState) => state.drawerOpen;
export const selectDrawerExpanded = (state: ChatState) => state.drawerExpanded;
export const selectCurrentInvite = (state: ChatState) => state.currentInvite;
export const selectPendingPeerID = (state: ChatState) => state.pendingPeerID;
export const selectPendingPeerDisplayName = (state: ChatState) => state.pendingPeerDisplayName;

// ============= Hook =============

/**
 * 聊天 Hook - 提供聊天相关功能的便捷访问
 */
export function useChat() {
  const store = useChatStore();

  return {
    // 状态
    isConnected: store.isConnected,
    isInitializing: store.isInitializing,
    rooms: store.rooms,
    invites: store.invites,
    currentRoom: store.rooms.find(r => r.roomId === store.currentRoomId),
    currentRoomId: store.currentRoomId,
    currentInvite: store.currentInvite,

    // Drawer 状态
    drawerOpen: store.drawerOpen,
    drawerExpanded: store.drawerExpanded,

    // 动作
    setCurrentRoom: store.setCurrentRoom,
    setCurrentInvite: store.setCurrentInvite,
    markRoomAsRead: store.markRoomAsRead,
    setSearchQuery: store.setSearchQuery,
    setActiveTab: store.setActiveTab,

    // Drawer 动作
    openDrawer: store.openDrawer,
    openDrawerWithPeer: store.openDrawerWithPeer,
    closeDrawer: store.closeDrawer,
    toggleDrawer: store.toggleDrawer,
    setDrawerExpanded: store.setDrawerExpanded,
  };
}
