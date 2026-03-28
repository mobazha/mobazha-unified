'use client';

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChatList, type ChatRoom } from '@/components/Chat/ChatList';
import { ChatMessages, type Message } from '@/components/Chat/ChatMessages';
import {
  useChatStore,
  selectTotalUnreadCount,
  selectPendingPeerID,
  selectPendingPeerDisplayName,
  getMemberPresentation,
  getMessageSenderPresentation,
  getRoomPresentation,
  matrixClient,
} from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import type { MatrixRoom, MatrixMessage } from '@mobazha/core';
import { UserInfoCard, type UserInfo } from '@/components/Chat/UserInfoCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui';
import { VerificationDialog, type VerificationPhase } from './VerificationDialog';
import { RoomSettingsPanel } from './RoomSettingsPanel';
import { useChatEffects } from './hooks/useChatEffects';

// ---------------------------------------------------------------------------
// Data converters
// ---------------------------------------------------------------------------

function toDisplayRoom(
  room: MatrixRoom,
  currentUserId: string | null | undefined,
  defaultName: string
): ChatRoom {
  const presentation = getRoomPresentation(room, currentUserId, defaultName);
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

function toDisplayMessage(msg: MatrixMessage, sender?: MessageSenderDisplay): Message {
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
// Props
// ---------------------------------------------------------------------------

export interface ChatDrawerProps {
  currentUserId?: string;
  onSendMessage?: (roomId: string, content: string) => void;
  onAcceptInvite?: (roomId: string) => void;
  onRejectInvite?: (roomId: string) => void;
  onNewChat?: () => void;
  onShareChatId?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  currentUserId = '',
  onSendMessage,
  onAcceptInvite,
  onRejectInvite,
  onNewChat,
  onShareChatId,
}) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const defaultRoomName = t('chat.defaultRoom');

  // ---- Local UI state ----
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [userCard, setUserCard] = useState<UserInfo | null>(null);
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

  // ---- Store selectors ----
  const drawerOpen = useChatStore(state => state.drawerOpen);
  const drawerExpanded = useChatStore(state => state.drawerExpanded);
  const closeDrawer = useChatStore(state => state.closeDrawer);
  const setDrawerExpanded = useChatStore(state => state.setDrawerExpanded);
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
  const totalUnread = useChatStore(selectTotalUnreadCount);
  const pendingPeerID = useChatStore(selectPendingPeerID);
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

  // ---- Side-effects (all useEffect calls) ----
  useChatEffects({
    currentRoomId,
    currentUserId: effectiveCurrentUserId,
    pendingPeerID,
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
  const currentRoom = useMemo(() => {
    return rooms.find(r => r.roomId === currentRoomId);
  }, [rooms, currentRoomId]);

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

  const displayRooms = useMemo(() => {
    const sorted = [...rooms].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted.map(room => toDisplayRoom(room, effectiveCurrentUserId, defaultRoomName));
  }, [rooms, effectiveCurrentUserId, defaultRoomName]);

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
    if (!currentRoomId) return;
    if (loadingMessages[currentRoomId]) return;

    setLoadingMessages(currentRoomId, true);
    try {
      const olderMessages = await matrixClient.loadOlderMessages(currentRoomId, 50);
      if (olderMessages.length > 0) {
        prependMessages(currentRoomId, olderMessages);
      }
      setHasMoreMessages(currentRoomId, olderMessages.length > 0);
    } catch (err) {
      console.warn('[ChatDrawer] Failed to load more messages:', err);
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

  const _handleInviteSelect = useCallback(
    (roomId: string) => {
      const invite = invites.find(r => r.roomId === roomId);
      if (invite) {
        setCurrentRoom(null);
        setCurrentInvite(invite);
      }
    },
    [invites, setCurrentRoom, setCurrentInvite]
  );
  void _handleInviteSelect;

  const handleBack = useCallback(() => {
    setCurrentRoom(null);
    setCurrentInvite(null);
  }, [setCurrentRoom, setCurrentInvite]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (currentRoomId && onSendMessage) {
        onSendMessage(currentRoomId, content);
      }
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
        let result: MatrixMessage | null;
        if (file.type.startsWith('image/')) {
          result = await matrixClient.sendImage(currentRoomId, file, localId);
        } else {
          result = await matrixClient.sendFile(currentRoomId, file, localId);
        }

        if (result) {
          store.updateMessage(currentRoomId, localId, {
            id: result.id,
            status: 'sent',
            uploadProgress: undefined,
            attachments: result.attachments,
          });
        }
      } catch (err) {
        console.error('[ChatDrawer] Failed to send file:', err);
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

  // Drag-and-drop
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer.types.includes('Files') && currentRoomId) {
        setIsDragging(true);
      }
    },
    [currentRoomId]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
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

      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        handleSendFile(file);
      }
    },
    [currentRoomId, handleSendFile]
  );

  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      if (!currentRoomId) return;
      const roomMessages = allMessages[currentRoomId];
      const failedMsg = roomMessages?.find(m => m.id === messageId || m.localId === messageId);
      if (!failedMsg || !onSendMessage) return;
      const updateMessage = useChatStore.getState().updateMessage;
      updateMessage(currentRoomId, messageId, { status: 'sending' as const });
      try {
        const result = await matrixClient.sendMessage(currentRoomId, failedMsg.content);
        if (result) {
          updateMessage(currentRoomId, messageId, { id: result.id, status: 'sent' as const });
        } else {
          updateMessage(currentRoomId, messageId, { status: 'failed' as const });
        }
      } catch {
        updateMessage(currentRoomId, messageId, { status: 'failed' as const });
      }
    },
    [currentRoomId, allMessages, onSendMessage]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!currentRoomId) return;
      try {
        await matrixClient.redactEvent(currentRoomId, messageId);
        const removeMessage = useChatStore.getState().removeMessage;
        removeMessage(currentRoomId, messageId);
      } catch (err) {
        console.error('[ChatDrawer] Failed to delete message:', err);
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
        const updateMessage = useChatStore.getState().updateMessage;
        updateMessage(currentRoomId, messageId, { content: newContent, isEdited: true });
      } catch (err) {
        console.error('[ChatDrawer] Failed to edit message:', err);
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
        console.error('[ChatDrawer] Failed to send reaction:', err);
      }
    },
    [currentRoomId]
  );

  const toggleExpand = useCallback(() => {
    setDrawerExpanded(!drawerExpanded);
  }, [drawerExpanded, setDrawerExpanded]);

  const handleAcceptInvite = useCallback(
    (roomId: string) => {
      onAcceptInvite?.(roomId);
      handleBack();
    },
    [onAcceptInvite, handleBack]
  );

  const handleRejectInvite = useCallback(
    (roomId: string) => {
      onRejectInvite?.(roomId);
      handleBack();
    },
    [onRejectInvite, handleBack]
  );

  const handleRoomSettings = useCallback(() => {
    setShowRoomSettings(true);
  }, []);

  const handleCloseRoomSettings = useCallback(() => {
    setShowRoomSettings(false);
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

  const handleCloseUserCard = useCallback(() => {
    setUserCard(null);
  }, []);

  // Verification handlers
  const handleVerificationAccept = useCallback(async () => {
    if (!verificationTxnId) return;
    setVerificationLoading(true);
    try {
      await matrixClient.acceptVerificationRequest(verificationTxnId);
      setVerificationPhase('waiting');
    } catch {
      setVerificationPhase('cancelled');
      setTimeout(resetVerification, 2000);
    } finally {
      setVerificationLoading(false);
    }
  }, [verificationTxnId, resetVerification]);

  const handleVerificationConfirm = useCallback(async () => {
    if (!verificationTxnId) return;
    setVerificationLoading(true);
    try {
      await matrixClient.confirmVerification(verificationTxnId);
    } catch {
      setVerificationPhase('cancelled');
      setTimeout(resetVerification, 2000);
    } finally {
      setVerificationLoading(false);
    }
  }, [verificationTxnId, resetVerification]);

  const handleVerificationCancel = useCallback(async () => {
    if (!verificationTxnId) return;
    await matrixClient.cancelVerification(verificationTxnId);
    resetVerification();
  }, [verificationTxnId, resetVerification]);

  // ---- Render helpers ----
  const drawerWidth = drawerExpanded ? 'w-full md:w-[600px]' : 'w-full md:w-[400px]';

  const renderView = () => {
    if (isCreatingRoom) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <span className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t('chat.openingConversation')}</p>
        </div>
      );
    }

    if (currentInvite) {
      return (
        <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/10">
          <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="rounded-xl hover:bg-muted/80"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
            <span className="font-bold text-foreground">{t('chat.inviteConfirm')}</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center ring-2 ring-primary/20 shadow-xl shadow-primary/10">
                <svg
                  className="w-12 h-12 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{currentInvite.name}</h3>
              {currentInvite.inviter && (
                <p className="text-muted-foreground mb-8 text-sm">
                  {t('chat.invitedBy', { name: currentInvite.inviter })}
                </p>
              )}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleRejectInvite(currentInvite.roomId)}
                  className="px-6 py-2 rounded-xl hover:bg-error/15 hover:text-error hover:border-error/30 transition-all"
                >
                  {t('common.decline')}
                </Button>
                <Button
                  onClick={() => handleAcceptInvite(currentInvite.roomId)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                >
                  {t('common.accept')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentRoom && currentRoomId) {
      return (
        <ChatMessages
          roomId={currentRoomId}
          roomName={currentRoomPresentation?.title || t('chat.defaultRoom')}
          roomAvatar={currentRoomPresentation?.avatarUrl}
          roomRawMxcAvatarUrl={currentRoomPresentation?.rawMxcAvatarUrl}
          isEncrypted={currentRoom.isEncrypted}
          isDirect={currentRoom.isDirect}
          isVerified={false}
          messages={currentMessages}
          currentUserId={effectiveCurrentUserId}
          isLoading={false}
          typingUsers={currentTypingUsers}
          memberNameMap={memberNameMap}
          onSendMessage={handleSendMessage}
          onSendFile={file => handleSendFile(file)}
          onTyping={isTyping => matrixClient.sendTyping(currentRoomId, isTyping)}
          onRetryMessage={handleRetryMessage}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          onReaction={handleReaction}
          isConnected={isConnected}
          onLoadMore={handleLoadMore}
          hasMoreMessages={hasMoreMessages[currentRoomId] ?? true}
          isLoadingMore={loadingMessages[currentRoomId] ?? false}
          onBack={handleBack}
          onRoomSettings={handleRoomSettings}
          onAvatarClick={handleAvatarClick}
        />
      );
    }

    return (
      <ChatList
        rooms={displayRooms}
        invites={displayInvites}
        activeRoomId={currentRoomId || undefined}
        isLoading={isInitializing}
        isConnected={isConnected}
        searchQuery={searchQuery}
        embedded
        onSearchChange={setSearchQuery}
        onRoomSelect={handleRoomSelect}
        onNewChat={onNewChat}
        onShareChatId={onShareChatId}
        onAcceptInvite={handleAcceptInvite}
        onRejectInvite={handleRejectInvite}
      />
    );
  };

  // ---- Render ----
  return (
    <Sheet open={drawerOpen} onOpenChange={open => !open && closeDrawer()}>
      <SheetContent
        side="right"
        className={`${drawerWidth} p-0 transition-all duration-300 flex flex-col shadow-2xl`}
        showCloseButton={false}
        onOpenAutoFocus={e => e.preventDefault()}
        data-testid="chat-system"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-5 py-4 bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-sm relative">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">
                  {t('chat.title')}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  {totalUnread > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-full shadow-sm shadow-primary/30">
                      {totalUnread > 99 ? '99+' : totalUnread} new
                    </span>
                  )}
                  {!isConnected && !isInitializing && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-warning/15 text-warning">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                      {t('chat.offline')}
                    </span>
                  )}
                  {isInitializing && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-info/15 text-info">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {t('chat.connecting')}
                    </span>
                  )}
                  {isConnected && !isInitializing && totalUnread === 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Connected
                    </span>
                  )}
                </div>
              </div>
            </div>
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onShareChatId}
                      className="h-9 w-9 p-0 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                      <svg
                        className="w-4.5 h-4.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('chat.shareChatId')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onNewChat}
                      className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200"
                      data-testid="chat-new-btn"
                    >
                      <svg
                        className="w-4.5 h-4.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('chat.newMessage')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleExpand}
                      className="hidden md:flex h-9 w-9 p-0 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                      <svg
                        className="w-4.5 h-4.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {drawerExpanded ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M13 5l7 7-7 7M5 5l7 7-7 7"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                          />
                        )}
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {drawerExpanded ? t('chat.collapse') : t('chat.expand')}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeDrawer}
                      className="h-9 w-9 p-0 rounded-xl hover:bg-error/15 text-muted-foreground hover:text-error transition-all duration-200"
                      data-testid="chat-close-btn"
                    >
                      <svg
                        className="w-4.5 h-4.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('common.close')}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </SheetHeader>

        {/* Content */}
        <div
          className="flex-1 overflow-hidden relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {renderView()}

          {/* Drop overlay */}
          {isDragging && currentRoomId && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-[2px] border-2 border-dashed border-primary/40 rounded-lg m-2 transition-all duration-200">
              <div className="flex flex-col items-center gap-3 text-primary">
                <svg
                  className="w-12 h-12 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm font-medium">{t('chat.dropFilesHere')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Room Settings Panel */}
        {showRoomSettings && currentRoom && (
          <RoomSettingsPanel
            room={currentRoom}
            currentUserId={effectiveCurrentUserId}
            onClose={handleCloseRoomSettings}
            onMemberClick={handleAvatarClick}
            t={t}
          />
        )}

        {/* User Info Card */}
        {userCard && (
          <UserInfoCard
            user={userCard}
            isOpen={true}
            onClose={handleCloseUserCard}
            onViewStore={peerID => {
              window.open(`/store/${peerID}`, '_blank');
              handleCloseUserCard();
            }}
            onStartChat={_userId => {
              handleCloseUserCard();
            }}
            onBlock={async userId => {
              await matrixClient.blockUser(userId);
            }}
            onUnblock={async userId => {
              await matrixClient.unblockUser(userId);
            }}
          />
        )}
      </SheetContent>

      <VerificationDialog
        open={verificationOpen}
        phase={verificationPhase}
        otherUserId={verificationUserId}
        sasEmoji={verificationEmoji}
        loading={verificationLoading}
        onAccept={handleVerificationAccept}
        onConfirm={handleVerificationConfirm}
        onCancel={handleVerificationCancel}
        onClose={resetVerification}
      />
    </Sheet>
  );
};

export default ChatDrawer;
