'use client';

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  useChatStore,
  selectTotalUnreadCount,
  selectPendingPeerID,
  selectPendingMatrixUserID,
  selectPendingPeerDisplayName,
  getMemberPresentation,
  getMessageSenderPresentation,
  getRoomPresentation,
  getOrderThreadContext,
  isOrderThreadRoom,
  matrixClient,
  useI18n,
  useUserStore,
} from '@mobazha/core';
import type { MatrixRoom, MatrixMessage } from '@mobazha/core';
import { useToast } from '@/components/ui';
import type { VerificationPhase } from '../VerificationDialog';
import { useChatEffects } from './useChatEffects';
import type { ChatRoom } from '@/components/Chat/ChatList';
import type { Message } from '@/components/Chat/ChatMessages';
// ---------------------------------------------------------------------------
// Data converters (shared between ChatDrawer and mobile page)
// ---------------------------------------------------------------------------

export function toDisplayRoom(
  room: MatrixRoom,
  currentUserId: string | null | undefined,
  defaultName: string
): ChatRoom {
  const presentation = getRoomPresentation(room, currentUserId, defaultName);
  const orderThread = isOrderThreadRoom(room) ? getOrderThreadContext(room, currentUserId) : null;
  return {
    id: room.roomId,
    name: presentation.title,
    avatar: presentation.avatarUrl,
    rawMxcAvatarUrl: presentation.rawMxcAvatarUrl,
    lastMessage: room.lastMessage?.content,
    lastMessageTime: (() => {
      if (!room.timestamp) return undefined;
      const d = new Date(room.timestamp);
      return isNaN(d.getTime())
        ? undefined
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    })(),
    timestamp: room.timestamp,
    unreadCount: room.unreadCount,
    isEncrypted: room.isEncrypted,
    isDirect: room.isDirect,
    roomType: room.roomType,
    orderId: orderThread?.orderId ?? room.orderId ?? room.metadata?.orderId,
    orderState: orderThread?.orderState,
    orderContractType: orderThread?.contractType,
    orderSubtitle: orderThread?.counterpartName,
    isExternal: presentation.isExternal,
    isVerified: false,
    isInvite: room.membership === 'invite',
    inviterName: room.inviter,
  };
}

function safeTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  const d = new Date(ts as number | string);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

interface MessageSenderDisplay {
  senderName?: string;
  senderAvatar?: string;
  senderRawMxcAvatarUrl?: string;
}

export function toDisplayMessage(msg: MatrixMessage, sender?: MessageSenderDisplay): Message {
  return {
    id: msg.id,
    content: msg.content,
    senderId: msg.sender,
    senderName: sender?.senderName,
    senderAvatar: sender?.senderAvatar,
    senderRawMxcAvatarUrl: sender?.senderRawMxcAvatarUrl,
    timestamp: safeTimestamp(msg.timestamp),
    status: msg.status,
    isSystem: msg.isSystem,
    isEdited: msg.isEdited,
    type: (['image', 'file', 'audio', 'video'] as const).includes(msg.type as never)
      ? (msg.type as 'image' | 'file' | 'audio' | 'video')
      : 'text',
    uploadProgress: msg.uploadProgress,
    reactions: msg.reactions,
    attachments: msg.attachments?.map(a => ({
      url: a.url,
      filename: a.filename,
      mimetype: a.mimetype,
      size: a.size,
      width: a.width,
      height: a.height,
      thumbnailUrl: a.thumbnailUrl,
    })),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseChatViewLogicParams {
  currentUserId?: string;
  onSendMessage?: (roomId: string, content: string) => void;
  onAcceptInvite?: (roomId: string) => void;
  onRejectInvite?: (roomId: string) => void;
  onNewChat?: () => void;
  onShareChatId?: () => void;
}

export function useChatViewLogic(params: UseChatViewLogicParams) {
  const {
    currentUserId = '',
    onSendMessage,
    onAcceptInvite,
    onRejectInvite,
    onNewChat,
    onShareChatId,
  } = params;

  const { t } = useI18n();
  const { toast } = useToast();
  const defaultRoomName = t('chat.defaultRoom');

  // ---- Local UI state ----
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [userCard, setUserCard] = useState<
    import('@/components/Chat/UserInfoCard').UserInfo | null
  >(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // ---- Verification state ----
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationPhase, setVerificationPhase] = useState<VerificationPhase>('request');
  const [verificationUserId, setVerificationUserId] = useState<string | null>(null);
  const [verificationTxnId, setVerificationTxnId] = useState<string | null>(null);
  const [verificationEmoji, setVerificationEmoji] = useState<Array<[string, string]> | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const resetVerification = useCallback(() => {
    setVerificationOpen(false);
    setVerificationPhase('request');
    setVerificationUserId(null);
    setVerificationTxnId(null);
    setVerificationEmoji(null);
    setVerificationLoading(false);
  }, []);

  const getVerificationErrorMessage = useCallback(
    (err: unknown): string => {
      if (err instanceof Error) {
        const msg = err.message.trim();
        if (msg && msg !== 'VERIFICATION_UNAVAILABLE') return msg;
      }
      return t('matrix.verification.unavailable');
    },
    [t]
  );

  // ---- Store selectors ----
  const drawerOpen = useChatStore(state => state.drawerOpen);
  const closeDrawer = useChatStore(state => state.closeDrawer);
  const setCurrentRoom = useChatStore(state => state.setCurrentRoom);
  const setCurrentInvite = useChatStore(state => state.setCurrentInvite);
  const currentRoomId = useChatStore(state => state.currentRoomId);
  const currentInvite = useChatStore(state => state.currentInvite);
  const rooms = useChatStore(state => state.rooms);
  const invites = useChatStore(state => state.invites);
  const allMessages = useChatStore(state => state.messages);
  const isConnected = useChatStore(state => state.isConnected);
  const isInitializing = useChatStore(state => state.isInitializing);
  const typingUsers = useChatStore(state => state.typingUsers);
  const searchQuery = useChatStore(state => state.searchQuery);
  const setSearchQuery = useChatStore(state => state.setSearchQuery);
  const inboxTab = useChatStore(state => state.activeTab);
  const totalUnread = useChatStore(selectTotalUnreadCount);
  const pendingPeerID = useChatStore(selectPendingPeerID);
  const pendingMatrixUserID = useChatStore(selectPendingMatrixUserID);
  const pendingPeerDisplayName = useChatStore(selectPendingPeerDisplayName);
  const clearPendingPeer = useChatStore(state => state.clearPendingPeer);
  const setRooms = useChatStore(state => state.setRooms);
  const setInvites = useChatStore(state => state.setInvites);
  const setMessages = useChatStore(state => state.setMessages);
  const prependMessages = useChatStore(state => state.prependMessages);
  const setLoadingMessages = useChatStore(state => state.setLoadingMessages);
  const setHasMoreMessages = useChatStore(state => state.setHasMoreMessages);
  const loadingMessages = useChatStore(state => state.loadingMessages);
  const hasMoreMessages = useChatStore(state => state.hasMoreMessages);
  const updateRoom = useChatStore(state => state.updateRoom);
  const effectiveCurrentUserId = matrixClient.getUserId() || currentUserId;
  const currentPeerID = useUserStore(state => state.profile?.peerID);

  // ---- Side-effects ----
  useChatEffects({
    currentRoomId,
    currentUserId: effectiveCurrentUserId,
    pendingPeerID,
    pendingMatrixUserID,
    pendingPeerDisplayName,
    clearPendingPeer,
    setRooms,
    setInvites,
    setCurrentRoom,
    setIsCreatingRoom,
    setMessages,
    updateRoom,
    setVerificationOpen,
    setVerificationPhase,
    setVerificationUserId,
    setVerificationTxnId,
    setVerificationEmoji,
    resetVerification,
    toast,
    t,
  });

  // ---- Derived state ----
  const currentRoom = useMemo(
    () => rooms.find(r => r.roomId === currentRoomId),
    [rooms, currentRoomId]
  );

  const memberNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (currentRoom?.members) {
      for (const m of currentRoom.members) {
        if (m.userId) {
          map[m.userId] = getMemberPresentation(m, currentRoom).displayName;
        }
      }
    }
    return map;
  }, [currentRoom]);

  const currentRoomPresentation = useMemo(() => {
    if (!currentRoom) return null;
    return getRoomPresentation(currentRoom, effectiveCurrentUserId, defaultRoomName);
  }, [currentRoom, effectiveCurrentUserId, defaultRoomName]);

  const currentOrderThread = useMemo(() => {
    if (!currentRoom) return null;
    return getOrderThreadContext(currentRoom, effectiveCurrentUserId, currentPeerID);
  }, [currentRoom, effectiveCurrentUserId, currentPeerID]);

  const filteredMatrixRooms = useMemo(() => {
    let list = rooms;
    if (inboxTab !== 'all') {
      list = list.filter(room => {
        switch (inboxTab) {
          case 'direct':
            return room.isDirect && !isOrderThreadRoom(room);
          case 'groups':
            return room.roomType === 'group' || room.roomType === 'community';
          case 'orders':
            return isOrderThreadRoom(room);
          default:
            return true;
        }
      });
    }
    return list;
  }, [rooms, inboxTab]);

  const displayRooms = useMemo(() => {
    const sorted = [...filteredMatrixRooms].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted.map(room => toDisplayRoom(room, effectiveCurrentUserId, defaultRoomName));
  }, [filteredMatrixRooms, effectiveCurrentUserId, defaultRoomName]);

  const displayInvites = useMemo(() => {
    return invites.map(room => toDisplayRoom(room, effectiveCurrentUserId, defaultRoomName));
  }, [invites, effectiveCurrentUserId, defaultRoomName]);

  const currentMessages = useMemo(() => {
    const roomMessages = currentRoomId ? allMessages[currentRoomId] : undefined;
    if (!currentRoomId || !roomMessages) return [];
    return roomMessages.map(message => {
      const senderPresentation = getMessageSenderPresentation(
        currentRoom,
        message.sender,
        effectiveCurrentUserId,
        {
          displayName: message.senderName,
          avatarUrl: message.senderAvatar,
          rawMxcAvatarUrl: message.senderRawMxcAvatarUrl,
        }
      );
      return toDisplayMessage(message, {
        senderName: senderPresentation.displayName,
        senderAvatar: senderPresentation.avatarUrl,
        senderRawMxcAvatarUrl: senderPresentation.rawMxcAvatarUrl,
      });
    });
  }, [currentRoomId, allMessages, currentRoom, effectiveCurrentUserId]);

  const currentTypingUsers = useMemo(() => {
    if (!currentRoomId || !typingUsers[currentRoomId]) return [];
    return typingUsers[currentRoomId];
  }, [currentRoomId, typingUsers]);

  // ---- Callbacks ----
  const handleLoadMore = useCallback(async () => {
    if (!currentRoomId || loadingMessages[currentRoomId]) return;
    setLoadingMessages(currentRoomId, true);
    try {
      const olderMessages = await matrixClient.loadOlderMessages(currentRoomId, 50);
      if (olderMessages.length > 0) prependMessages(currentRoomId, olderMessages);
      setHasMoreMessages(currentRoomId, olderMessages.length > 0);
    } catch (err) {
      console.warn('[ChatView] Failed to load more messages:', err);
    } finally {
      setLoadingMessages(currentRoomId, false);
    }
  }, [currentRoomId, loadingMessages, setLoadingMessages, prependMessages, setHasMoreMessages]);

  const handleRoomSelect = useCallback(
    (roomId: string) => {
      setCurrentInvite(null);
      setCurrentRoom(roomId);
    },
    [setCurrentRoom, setCurrentInvite]
  );

  const handleInviteSelect = useCallback(
    (roomId: string) => {
      const invite = invites.find(r => r.roomId === roomId);
      if (invite) {
        setCurrentRoom(null);
        setCurrentInvite(invite);
      }
    },
    [invites, setCurrentRoom, setCurrentInvite]
  );

  const handleBack = useCallback(() => {
    setCurrentRoom(null);
    setCurrentInvite(null);
  }, [setCurrentRoom, setCurrentInvite]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (currentRoomId && onSendMessage) onSendMessage(currentRoomId, content);
    },
    [currentRoomId, onSendMessage]
  );

  const handleSendFile = useCallback(
    async (file: File) => {
      if (!currentRoomId) return;
      const MAX_CHAT_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_CHAT_FILE_SIZE) {
        toast({
          title: t('common.error'),
          description: t('chat.chatFileTooLarge'),
          variant: 'destructive',
        });
        return;
      }
      const localId = `local_${Date.now()}`;
      let messageType: MatrixMessage['type'] = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('audio/')) messageType = 'audio';
      else if (file.type.startsWith('video/')) messageType = 'video';
      const localUrl = messageType === 'image' ? URL.createObjectURL(file) : undefined;
      const placeholder: MatrixMessage = {
        id: localId,
        localId,
        roomId: currentRoomId,
        sender: effectiveCurrentUserId,
        content: file.name || 'file',
        type: messageType,
        timestamp: Date.now(),
        status: 'sending',
        uploadProgress: 0,
        attachments: [
          {
            url: localUrl || '',
            filename: file.name || 'file',
            mimetype: file.type,
            size: file.size,
          },
        ],
      };
      const store = useChatStore.getState();
      store.addMessage(currentRoomId, placeholder);
      try {
        const result = file.type.startsWith('image/')
          ? await matrixClient.sendImage(currentRoomId, file, localId)
          : await matrixClient.sendFile(currentRoomId, file, localId);
        if (result)
          store.updateMessage(currentRoomId, localId, {
            id: result.id,
            status: 'sent',
            uploadProgress: undefined,
            attachments: result.attachments,
          });
      } catch (err) {
        console.error('[ChatView] Failed to send file:', err);
        store.updateMessage(currentRoomId, localId, {
          status: 'failed',
          uploadProgress: undefined,
        });
        toast({
          title: t('common.error'),
          description: t('chat.sendFileFailed'),
          variant: 'destructive',
        });
      } finally {
        if (localUrl) URL.revokeObjectURL(localUrl);
      }
    },
    [currentRoomId, effectiveCurrentUserId, toast, t]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer.types.includes('Files') && currentRoomId) setIsDragging(true);
    },
    [currentRoomId]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;
      if (!currentRoomId) return;
      for (const file of Array.from(e.dataTransfer.files)) handleSendFile(file);
    },
    [currentRoomId, handleSendFile]
  );

  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      if (!currentRoomId) return;
      const roomMessages = allMessages[currentRoomId];
      const failedMsg = roomMessages?.find(m => m.id === messageId || m.localId === messageId);
      if (!failedMsg || !onSendMessage) return;
      const update = useChatStore.getState().updateMessage;
      update(currentRoomId, messageId, { status: 'sending' as const });
      try {
        const result = await matrixClient.sendMessage(
          currentRoomId,
          failedMsg.content,
          failedMsg.localId || messageId
        );
        if (result) update(currentRoomId, messageId, { id: result.id, status: 'sent' as const });
        else update(currentRoomId, messageId, { status: 'failed' as const });
      } catch {
        update(currentRoomId, messageId, { status: 'failed' as const });
      }
    },
    [currentRoomId, allMessages, onSendMessage]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!currentRoomId) return;
      try {
        await matrixClient.redactEvent(currentRoomId, messageId);
        useChatStore.getState().removeMessage(currentRoomId, messageId);
      } catch (err) {
        console.error('[ChatView] Failed to delete message:', err);
        toast({
          title: t('common.error'),
          description: t('chat.deleteFailed'),
          variant: 'destructive',
        });
      }
    },
    [currentRoomId, toast, t]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!currentRoomId) return;
      try {
        await matrixClient.editMessage(currentRoomId, messageId, newContent);
        useChatStore
          .getState()
          .updateMessage(currentRoomId, messageId, { content: newContent, isEdited: true });
      } catch (err) {
        console.error('[ChatView] Failed to edit message:', err);
        toast({
          title: t('common.error'),
          description: t('chat.editFailed'),
          variant: 'destructive',
        });
      }
    },
    [currentRoomId, toast, t]
  );

  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentRoomId) return;
      try {
        await matrixClient.sendReaction(currentRoomId, messageId, emoji);
      } catch (err) {
        console.error('[ChatView] Failed to send reaction:', err);
      }
    },
    [currentRoomId]
  );

  const handleAcceptInvite = useCallback(
    async (roomId: string) => {
      try {
        await matrixClient.acceptInvite(roomId);
        const [r, ir] = await Promise.all([
          matrixClient.getRooms(),
          matrixClient.getInvitedRooms(),
        ]);
        setRooms(r);
        setInvites(ir);
        setCurrentInvite(null);
        setCurrentRoom(roomId);
      } catch (err) {
        console.error('[ChatView] Failed to accept invite:', err);
        toast({
          title: t('common.error'),
          description: t('chat.acceptFailed'),
          variant: 'destructive',
        });
      }
      onAcceptInvite?.(roomId);
    },
    [onAcceptInvite, setRooms, setInvites, setCurrentInvite, setCurrentRoom, toast, t]
  );

  const handleRejectInvite = useCallback(
    async (roomId: string) => {
      try {
        await matrixClient.declineInvite(roomId);
        const ir = await matrixClient.getInvitedRooms();
        setInvites(ir);
        setCurrentInvite(null);
      } catch (err) {
        console.error('[ChatView] Failed to decline invite:', err);
        toast({
          title: t('common.error'),
          description: t('chat.declineFailed'),
          variant: 'destructive',
        });
      }
      onRejectInvite?.(roomId);
    },
    [onRejectInvite, setInvites, setCurrentInvite, toast, t]
  );

  const handleRoomSettings = useCallback(() => setShowRoomSettings(true), []);
  const handleCloseRoomSettings = useCallback(() => setShowRoomSettings(false), []);

  const handleLeaveRoom = useCallback(async (roomId: string) => {
    const success = await matrixClient.leaveRoom(roomId);
    if (success) {
      const { removeRoom, setCurrentRoom: sr } = useChatStore.getState();
      removeRoom(roomId);
      sr(null);
      setShowRoomSettings(false);
    }
  }, []);

  const handleAvatarClick = useCallback(
    (userId: string, displayName?: string, avatarUrl?: string) => {
      const member = currentRoom?.members?.find(m => m.userId === userId);
      const presentation =
        member && currentRoom ? getMemberPresentation(member, currentRoom) : null;
      setUserCard({
        userId,
        displayName: displayName || presentation?.displayName || member?.displayName,
        avatarUrl: avatarUrl || presentation?.avatarUrl || member?.avatarUrl,
        peerID: presentation?.peerID,
        isExternal: presentation?.isExternal ?? member?.isExternal,
      });
    },
    [currentRoom]
  );

  const handleCloseUserCard = useCallback(() => setUserCard(null), []);

  // Verification handlers
  const handleVerificationAccept = useCallback(async () => {
    if (!verificationTxnId) return;
    setVerificationLoading(true);
    try {
      await matrixClient.acceptVerificationRequest(verificationTxnId);
      setVerificationPhase('waiting');
    } catch (err) {
      toast({ title: t('common.error'), description: getVerificationErrorMessage(err) });
      setVerificationPhase('cancelled');
      setTimeout(resetVerification, 2000);
    } finally {
      setVerificationLoading(false);
    }
  }, [verificationTxnId, toast, t, getVerificationErrorMessage, resetVerification]);

  const handleVerificationConfirm = useCallback(async () => {
    if (!verificationTxnId) return;
    setVerificationLoading(true);
    try {
      await matrixClient.confirmVerification(verificationTxnId);
    } catch (err) {
      toast({ title: t('common.error'), description: getVerificationErrorMessage(err) });
      setVerificationPhase('cancelled');
      setTimeout(resetVerification, 2000);
    } finally {
      setVerificationLoading(false);
    }
  }, [verificationTxnId, toast, t, getVerificationErrorMessage, resetVerification]);

  const handleVerificationCancel = useCallback(async () => {
    if (!verificationTxnId) return;
    try {
      await matrixClient.cancelVerification(verificationTxnId);
    } catch (err) {
      toast({ title: t('common.error'), description: getVerificationErrorMessage(err) });
    }
    resetVerification();
  }, [verificationTxnId, toast, t, getVerificationErrorMessage, resetVerification]);

  return {
    t,
    toast,
    defaultRoomName,
    effectiveCurrentUserId,

    // Store state
    drawerOpen,
    closeDrawer,
    currentRoomId,
    currentRoom,
    currentInvite,
    rooms,
    invites,
    isConnected,
    isInitializing,
    searchQuery,
    totalUnread,
    loadingMessages,
    hasMoreMessages,

    // Derived display data
    displayRooms,
    displayInvites,
    currentMessages,
    currentTypingUsers,
    memberNameMap,
    currentRoomPresentation,
    currentOrderThread,
    inboxTab,

    // Local UI state
    isCreatingRoom,
    isDragging,
    showRoomSettings,
    userCard,
    verificationOpen,
    verificationPhase,
    verificationUserId,
    verificationTxnId,
    verificationEmoji,
    verificationLoading,

    // Setters
    setSearchQuery,
    setShowRoomSettings,

    // Callbacks
    handleRoomSelect,
    handleInviteSelect,
    handleBack,
    handleSendMessage,
    handleSendFile,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleRetryMessage,
    handleDeleteMessage,
    handleEditMessage,
    handleReaction,
    handleLoadMore,
    handleAcceptInvite,
    handleRejectInvite,
    handleRoomSettings,
    handleCloseRoomSettings,
    handleLeaveRoom,
    handleAvatarClick,
    handleCloseUserCard,
    handleVerificationAccept,
    handleVerificationConfirm,
    handleVerificationCancel,
    resetVerification,

    // Passthrough
    onNewChat,
    onShareChatId,
    matrixClient,
  };
}
