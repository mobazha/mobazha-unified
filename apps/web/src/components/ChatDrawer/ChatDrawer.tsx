'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChatList, type ChatRoom } from '@/components/Chat/ChatList';
import { ChatMessages, type Message } from '@/components/Chat/ChatMessages';
import {
  useChatStore,
  selectTotalUnreadCount,
  selectPendingPeerID,
  selectPendingPeerDisplayName,
  matrixClient,
  matrixEvents,
  MATRIX_EVENTS,
} from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import type { MatrixRoom, MatrixMessage } from '@mobazha/core';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { UserInfoCard, type UserInfo } from '@/components/Chat/UserInfoCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui';

// 转换 MatrixRoom 到 ChatRoom
function toDisplayRoom(room: MatrixRoom, defaultName: string): ChatRoom {
  return {
    id: room.roomId,
    name: room.name || defaultName,
    avatar: room.avatarUrl,
    rawMxcAvatarUrl: room.rawMxcAvatarUrl, // 原始 mxc URL 用于认证下载
    lastMessage: room.lastMessage?.content,
    lastMessageTime: (() => {
      if (!room.timestamp) return undefined;
      const d = new Date(room.timestamp);
      return isNaN(d.getTime())
        ? undefined
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    })(),
    unreadCount: room.unreadCount,
    isOnline: false, // Will be updated from presence
    isEncrypted: room.isEncrypted,
    isDirect: room.isDirect,
    roomType: room.roomType,
    isExternal: room.isExternal,
    isVerified: false, // Will be updated from verification state
    isInvite: room.membership === 'invite',
    inviterName: room.inviter,
  };
}

// 转换 MatrixMessage 到 Message
function safeTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  const d = new Date(ts as number | string);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function toDisplayMessage(msg: MatrixMessage): Message {
  return {
    id: msg.id,
    content: msg.content,
    senderId: msg.sender, // MatrixMessage uses 'sender', Message uses 'senderId'
    senderName: msg.senderName,
    senderAvatar: msg.senderAvatar,
    senderRawMxcAvatarUrl: msg.senderRawMxcAvatarUrl, // 原始 mxc URL 用于认证下载
    timestamp: safeTimestamp(msg.timestamp),
    status: msg.status,
    isSystem: msg.isSystem,
    type: (['image', 'file', 'audio', 'video'] as const).includes(msg.type as never)
      ? (msg.type as 'image' | 'file' | 'audio' | 'video')
      : 'text',
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

export interface ChatDrawerProps {
  // 可选：当前用户ID
  currentUserId?: string;
  // 可选：发送消息回调
  onSendMessage?: (roomId: string, content: string) => void;
  // 可选：接受邀请回调
  onAcceptInvite?: (roomId: string) => void;
  // 可选：拒绝邀请回调
  onRejectInvite?: (roomId: string) => void;
  // 可选：新建聊天回调
  onNewChat?: () => void;
  // 可选：分享聊天ID回调
  onShareChatId?: () => void;
}

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

  // 房间设置显示状态
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  // 用户卡片显示状态
  const [userCard, setUserCard] = useState<UserInfo | null>(null);

  // Store 状态
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
  // 获取整个 messages 对象，然后在 useMemo 中提取当前房间的消息
  const allMessages = useChatStore(state => state.messages);
  const isConnected = useChatStore(state => state.isConnected);
  const isInitializing = useChatStore(state => state.isInitializing);
  const userPresence = useChatStore(state => state.userPresence);
  const typingUsers = useChatStore(state => state.typingUsers);
  const searchQuery = useChatStore(state => state.searchQuery);
  const setSearchQuery = useChatStore(state => state.setSearchQuery);
  const totalUnread = useChatStore(selectTotalUnreadCount);
  const pendingPeerID = useChatStore(selectPendingPeerID);
  const pendingPeerDisplayName = useChatStore(selectPendingPeerDisplayName);
  const clearPendingPeer = useChatStore(state => state.clearPendingPeer);
  const setRooms = useChatStore(state => state.setRooms);
  const setInvites = useChatStore(state => state.setInvites);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Resolve pendingPeerID → create/find DM room and focus it
  useEffect(() => {
    if (!pendingPeerID) return;

    let cancelled = false;
    setIsCreatingRoom(true);

    (async () => {
      try {
        const roomId = await matrixClient.getOrCreateDirectRoom(
          pendingPeerID,
          pendingPeerDisplayName ?? undefined
        );
        if (cancelled) return;

        if (roomId) {
          const allRooms = await matrixClient.getRooms();
          if (!cancelled) {
            const joinedRooms = allRooms.filter(r => r.membership !== 'invite');
            const invitedRooms = allRooms.filter(r => r.membership === 'invite');
            setRooms(joinedRooms);
            setInvites(invitedRooms);
            setCurrentRoom(roomId);
          }
        }
      } catch (err) {
        console.error('[ChatDrawer] Failed to open DM with peer:', err);
        if (!cancelled) {
          toast({
            title: t('common.error'),
            description: t('chat.createConversationFailed'),
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) {
          setIsCreatingRoom(false);
          clearPendingPeer();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pendingPeerID,
    pendingPeerDisplayName,
    clearPendingPeer,
    setRooms,
    setInvites,
    setCurrentRoom,
  ]);

  // 当前房间
  const currentRoom = useMemo(() => {
    return rooms.find(r => r.roomId === currentRoomId);
  }, [rooms, currentRoomId]);

  // 房间列表转换
  const displayRooms = useMemo(() => {
    return rooms.map(room => {
      const displayRoom = toDisplayRoom(room, defaultRoomName);
      // 更新在线状态
      if (room.isDirect && room.members?.length) {
        const otherMember = room.members.find(m => m.userId !== currentUserId);
        if (otherMember) {
          displayRoom.isOnline = userPresence[otherMember.userId] === 'online';
        }
      }
      return displayRoom;
    });
  }, [rooms, userPresence, currentUserId, defaultRoomName]);

  // 邀请列表转换
  const displayInvites = useMemo(() => {
    return invites.map(room => toDisplayRoom(room, defaultRoomName));
  }, [invites, defaultRoomName]);

  // 当前房间消息
  const currentMessages = useMemo(() => {
    const roomMessages = currentRoomId ? allMessages[currentRoomId] : undefined;
    if (!currentRoomId || !roomMessages) return [];
    return roomMessages.map(toDisplayMessage);
  }, [currentRoomId, allMessages]);

  // 当前房间输入中的用户
  const currentTypingUsers = useMemo(() => {
    if (!currentRoomId || !typingUsers[currentRoomId]) return [];
    return typingUsers[currentRoomId];
  }, [currentRoomId, typingUsers]);

  // 计算当前房间的在线状态（三态：true/false/undefined 表示在线/离线/未知）
  const isCurrentRoomOnline = useMemo((): boolean | undefined => {
    if (!currentRoom?.isDirect || !currentRoom.members?.length) return undefined;
    const otherMember = currentRoom.members.find(m => m.userId !== currentUserId);
    if (!otherMember) return undefined;
    const presence = userPresence[otherMember.userId];
    if (!presence) return undefined;
    return presence === 'online';
  }, [currentRoom, userPresence, currentUserId]);

  // 获取 store 的 setMessages 和 updateRoom 方法
  const setMessages = useChatStore(state => state.setMessages);
  const prependMessages = useChatStore(state => state.prependMessages);
  const setLoadingMessages = useChatStore(state => state.setLoadingMessages);
  const setHasMoreMessages = useChatStore(state => state.setHasMoreMessages);
  const loadingMessages = useChatStore(state => state.loadingMessages);
  const hasMoreMessages = useChatStore(state => state.hasMoreMessages);
  const updateRoom = useChatStore(state => state.updateRoom);

  // 用于追踪已加载过消息的房间
  const loadedRoomsRef = React.useRef<Set<string>>(new Set());

  // 当选择房间时加载消息并标记已读
  useEffect(() => {
    if (!currentRoomId) return;

    // 标记房间已读（每次进入房间时都执行）
    matrixClient
      .markRoomAsRead(currentRoomId)
      .then(success => {
        if (success) {
          // 更新 store 中的未读数
          updateRoom(currentRoomId, { unreadCount: 0 });
        }
      })
      .catch(err => {
        console.warn('[ChatDrawer] Failed to mark room as read:', err);
      });

    // 加载初始已读回执状态
    matrixClient
      .getReadReceiptForRoom(currentRoomId)
      .then(receipts => {
        const msgs = useChatStore.getState().messages[currentRoomId];
        if (!msgs) return;
        const otherReceipts = Object.entries(receipts).filter(([uid]) => uid !== currentUserId);
        if (otherReceipts.length === 0) return;

        const latestReadEventIds = new Set(otherReceipts.map(([, eid]) => eid));
        let found = false;
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (latestReadEventIds.has(msg.id)) found = true;
          if (found && msg.sender === currentUserId && msg.status !== 'read') {
            useChatStore
              .getState()
              .updateMessage(currentRoomId, msg.id, { status: 'read' as const });
          }
        }
      })
      .catch(() => {});

    // 如果该房间已经加载过消息，跳过加载
    if (loadedRoomsRef.current.has(currentRoomId)) {
      return;
    }

    const loadMessages = async () => {
      try {
        const messages = await matrixClient.getMessages(currentRoomId, 50);
        setMessages(currentRoomId, messages);
        loadedRoomsRef.current.add(currentRoomId);
      } catch (error) {
        console.error('[ChatDrawer] Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [currentRoomId, setMessages, updateRoom, currentUserId]);

  // 监听已读回执事件，更新消息状态
  useEffect(() => {
    if (!currentRoomId || !currentUserId) return;

    const handleReadReceipt = (data: unknown) => {
      const { roomId, userId, eventId } = data as {
        roomId: string;
        userId: string;
        eventId: string;
      };
      if (roomId !== currentRoomId) return;

      const msgs = useChatStore.getState().messages[roomId];
      if (!msgs) return;

      let found = false;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const msg = msgs[i];
        if (msg.id === eventId) found = true;
        if (found && msg.sender === currentUserId && msg.status !== 'read') {
          useChatStore.getState().updateMessage(roomId, msg.id, { status: 'read' as const });
        }
      }
    };

    const unsub = matrixEvents.on(MATRIX_EVENTS.READ_RECEIPT, handleReadReceipt);
    return () => {
      unsub();
    };
  }, [currentRoomId, currentUserId]);

  // 加载更多历史消息（向上滚动分页）
  const handleLoadMore = useCallback(async () => {
    if (!currentRoomId) return;
    const isAlreadyLoading = loadingMessages[currentRoomId];
    if (isAlreadyLoading) return;

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

  // 处理房间选择
  const handleRoomSelect = useCallback(
    (roomId: string) => {
      setCurrentInvite(null);
      setCurrentRoom(roomId);
    },
    [setCurrentRoom, setCurrentInvite]
  );

  // 处理邀请选择 (保留以备将来使用)
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
  void _handleInviteSelect; // suppress unused warning

  // 返回列表
  const handleBack = useCallback(() => {
    setCurrentRoom(null);
    setCurrentInvite(null);
  }, [setCurrentRoom, setCurrentInvite]);

  // 发送消息
  const handleSendMessage = useCallback(
    (content: string) => {
      if (currentRoomId && onSendMessage) {
        onSendMessage(currentRoomId, content);
      }
    },
    [currentRoomId, onSendMessage]
  );

  // 发送文件（图片、音频、视频、文档等）
  const handleSendFile = useCallback(
    async (file: File) => {
      if (!currentRoomId) return;
      try {
        if (file.type.startsWith('image/')) {
          await matrixClient.sendImage(currentRoomId, file);
        } else {
          await matrixClient.sendFile(currentRoomId, file);
        }
      } catch (err) {
        console.error('[ChatDrawer] Failed to send file:', err);
        toast({
          title: t('common.error'),
          description: t('chat.sendFileFailed'),
          variant: 'destructive',
        });
      }
    },
    [currentRoomId, toast, t]
  );

  // 重发失败消息
  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      if (!currentRoomId) return;
      const roomMessages = allMessages[currentRoomId];
      const failedMsg = roomMessages?.find(m => m.id === messageId || m.localId === messageId);
      if (!failedMsg || !onSendMessage) return;
      // 移除旧的失败消息，重新发送
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

  // 删除消息（redact）
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

  // 切换展开/收缩
  const toggleExpand = useCallback(() => {
    setDrawerExpanded(!drawerExpanded);
  }, [drawerExpanded, setDrawerExpanded]);

  // 接受邀请
  const handleAcceptInvite = useCallback(
    (roomId: string) => {
      onAcceptInvite?.(roomId);
      handleBack();
    },
    [onAcceptInvite, handleBack]
  );

  // 拒绝邀请
  const handleRejectInvite = useCallback(
    (roomId: string) => {
      onRejectInvite?.(roomId);
      handleBack();
    },
    [onRejectInvite, handleBack]
  );

  // 打开房间设置
  const handleRoomSettings = useCallback(() => {
    setShowRoomSettings(true);
  }, []);

  // 关闭房间设置
  const handleCloseRoomSettings = useCallback(() => {
    setShowRoomSettings(false);
  }, []);

  // 打开用户卡片
  const handleAvatarClick = useCallback(
    (userId: string, displayName?: string, avatarUrl?: string) => {
      // 查找该用户是否在房间成员列表中，获取更多信息
      const member = currentRoom?.members?.find(m => m.userId === userId);
      setUserCard({
        userId,
        displayName: displayName || member?.displayName,
        avatarUrl: avatarUrl || member?.avatarUrl,
        peerID: member?.peerID,
        isExternal: member?.isExternal,
      });
    },
    [currentRoom]
  );

  // 关闭用户卡片
  const handleCloseUserCard = useCallback(() => {
    setUserCard(null);
  }, []);

  // 移动端全屏，桌面端固定宽度
  const drawerWidth = drawerExpanded ? 'w-full md:w-[600px]' : 'w-full md:w-[400px]';

  // 渲染视图
  const renderView = () => {
    // Creating a DM room for a peer
    if (isCreatingRoom) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <span className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t('chat.openingConversation')}</p>
        </div>
      );
    }

    // 邀请确认视图
    if (currentInvite) {
      return (
        <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/10">
          {/* 邀请头部 */}
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

          {/* 邀请内容 */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
            {/* Background decoration */}
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

    // 聊天视图
    if (currentRoom && currentRoomId) {
      return (
        <ChatMessages
          roomId={currentRoomId}
          roomName={currentRoom.name || t('chat.defaultRoom')}
          roomAvatar={currentRoom.avatarUrl}
          roomRawMxcAvatarUrl={currentRoom.rawMxcAvatarUrl}
          isEncrypted={currentRoom.isEncrypted}
          isOnline={isCurrentRoomOnline}
          isVerified={false}
          messages={currentMessages}
          currentUserId={currentUserId}
          isLoading={false}
          typingUsers={currentTypingUsers}
          onSendMessage={handleSendMessage}
          onSendFile={file => handleSendFile(file)}
          onTyping={isTyping => matrixClient.sendTyping(currentRoomId, isTyping)}
          onRetryMessage={handleRetryMessage}
          onDeleteMessage={handleDeleteMessage}
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

    // 房间列表视图
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
          {/* Gradient accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Chat icon */}
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
                {/* Status indicators */}
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
        <div className="flex-1 overflow-hidden">{renderView()}</div>

        {/* Room Settings Panel */}
        {showRoomSettings && currentRoom && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseRoomSettings}
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
              <span className="font-bold text-foreground">{t('chat.roomSettings')}</span>
            </div>

            {/* Room Info */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="relative mb-4">
                  <Avatar
                    src={currentRoom.avatarUrl}
                    rawMxcUrl={currentRoom.rawMxcAvatarUrl}
                    name={currentRoom.name || 'Room'}
                    size="lg"
                    className="w-24 h-24 ring-4 ring-background shadow-xl"
                  />
                  {currentRoom.isEncrypted && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {currentRoom.name || t('chat.defaultRoom')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentRoom.isDirect ? t('chat.directMessage') : t('chat.groupChat')}
                </p>
                {currentRoom.isEncrypted && (
                  <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-primary/15 text-primary rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('chat.encrypted')}
                  </span>
                )}
              </div>

              {/* Members */}
              {currentRoom.members && currentRoom.members.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    {t('chat.members')} ({currentRoom.members.length})
                  </h4>
                  <div className="space-y-2">
                    {currentRoom.members.map(member => (
                      <button
                        key={member.userId}
                        onClick={() =>
                          handleAvatarClick(member.userId, member.displayName, member.avatarUrl)
                        }
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left"
                      >
                        <Avatar
                          src={member.avatarUrl}
                          rawMxcUrl={member.rawMxcAvatarUrl}
                          name={member.displayName || member.userId}
                          size="sm"
                          className="ring-2 ring-background"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.displayName || member.userId}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{member.userId}</p>
                        </div>
                        {member.isExternal && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-info/15 text-info rounded-full">
                            External
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Room ID */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-foreground mb-2">{t('chat.roomId')}</h4>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
                  <code className="flex-1 text-xs text-muted-foreground break-all">
                    {currentRoom.roomId}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(currentRoom.roomId)}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Info Card */}
        {userCard && (
          <UserInfoCard
            user={userCard}
            isOpen={true}
            onClose={handleCloseUserCard}
            onViewStore={peerID => {
              // TODO: Navigate to store page
              window.open(`/store/${peerID}`, '_blank');
              handleCloseUserCard();
            }}
            onStartChat={_userId => {
              // TODO: Start or navigate to direct chat
              handleCloseUserCard();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ChatDrawer;
