'use client';

import React, { useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChatList, type ChatRoom } from '@/components/Chat/ChatList';
import { ChatMessages, type Message } from '@/components/Chat/ChatMessages';
import { useChatStore, selectTotalUnreadCount } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import type { MatrixRoom, MatrixMessage } from '@mobazha/core';

// 转换 MatrixRoom 到 ChatRoom
function toDisplayRoom(room: MatrixRoom): ChatRoom {
  return {
    id: room.roomId,
    name: room.name || 'Unknown',
    avatar: room.avatarUrl,
    lastMessage: room.lastMessage?.content,
    lastMessageTime: room.timestamp
      ? new Date(room.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : undefined,
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
function toDisplayMessage(msg: MatrixMessage): Message {
  return {
    id: msg.id,
    content: msg.content,
    senderId: msg.sender, // MatrixMessage uses 'sender', Message uses 'senderId'
    senderName: msg.senderName,
    senderAvatar: msg.senderAvatar,
    timestamp: new Date(msg.timestamp).toISOString(),
    status: msg.status,
    isSystem: msg.isSystem,
    type: msg.type === 'image' ? 'image' : msg.type === 'file' ? 'file' : 'text',
    attachments: msg.attachments?.map(a => ({
      url: a.url,
      filename: a.filename,
      mimetype: a.mimetype,
      size: a.size,
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
  const storeMessages = useChatStore(state => state.messages);
  const isConnected = useChatStore(state => state.isConnected);
  const isInitializing = useChatStore(state => state.isInitializing);
  const userPresence = useChatStore(state => state.userPresence);
  const typingUsers = useChatStore(state => state.typingUsers);
  const searchQuery = useChatStore(state => state.searchQuery);
  const setSearchQuery = useChatStore(state => state.setSearchQuery);
  const totalUnread = useChatStore(selectTotalUnreadCount);

  // 当前房间
  const currentRoom = useMemo(() => {
    return rooms.find(r => r.roomId === currentRoomId);
  }, [rooms, currentRoomId]);

  // 房间列表转换
  const displayRooms = useMemo(() => {
    return rooms.map(room => {
      const displayRoom = toDisplayRoom(room);
      // 更新在线状态
      if (room.isDirect && room.members?.length) {
        const otherMember = room.members.find(m => m.userId !== currentUserId);
        if (otherMember) {
          displayRoom.isOnline = userPresence[otherMember.userId] === 'online';
        }
      }
      return displayRoom;
    });
  }, [rooms, userPresence, currentUserId]);

  // 邀请列表转换
  const displayInvites = useMemo(() => {
    return invites.map(toDisplayRoom);
  }, [invites]);

  // 当前房间消息
  const currentMessages = useMemo(() => {
    if (!currentRoomId || !storeMessages[currentRoomId]) return [];
    return storeMessages[currentRoomId].map(toDisplayMessage);
  }, [currentRoomId, storeMessages]);

  // 当前房间输入中的用户
  const currentTypingUsers = useMemo(() => {
    if (!currentRoomId || !typingUsers[currentRoomId]) return [];
    return typingUsers[currentRoomId];
  }, [currentRoomId, typingUsers]);

  // 计算当前房间的在线状态
  const isCurrentRoomOnline = useMemo(() => {
    if (!currentRoom?.isDirect || !currentRoom.members?.length) return false;
    const otherMember = currentRoom.members.find(m => m.userId !== currentUserId);
    return otherMember ? userPresence[otherMember.userId] === 'online' : false;
  }, [currentRoom, userPresence, currentUserId]);

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

  // 动态宽度
  const drawerWidth = drawerExpanded ? 'w-[600px]' : 'w-[400px]';

  // 渲染视图
  const renderView = () => {
    // 邀请确认视图
    if (currentInvite) {
      return (
        <div className="flex flex-col h-full">
          {/* 邀请头部 */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
            <span className="font-semibold">{t('chat.inviteConfirm')}</span>
          </div>

          {/* 邀请内容 */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-primary"
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
            <h3 className="text-lg font-semibold mb-2">{currentInvite.name}</h3>
            {currentInvite.inviter && (
              <p className="text-muted-foreground mb-6">
                {t('chat.invitedBy', { name: currentInvite.inviter })}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleRejectInvite(currentInvite.roomId)}>
                {t('common.decline')}
              </Button>
              <Button onClick={() => handleAcceptInvite(currentInvite.roomId)}>
                {t('common.accept')}
              </Button>
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
          roomName={currentRoom.name || 'Unknown'}
          roomAvatar={currentRoom.avatarUrl}
          isEncrypted={currentRoom.isEncrypted}
          isOnline={isCurrentRoomOnline}
          isVerified={false}
          messages={currentMessages}
          currentUserId={currentUserId}
          isLoading={false}
          typingUsers={currentTypingUsers}
          onSendMessage={handleSendMessage}
          onBack={handleBack}
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
        className={`${drawerWidth} p-0 transition-all duration-300 flex flex-col`}
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-semibold">{t('chat.title')}</SheetTitle>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
              {/* 连接状态 */}
              {!isConnected && !isInitializing && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/10 text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {t('chat.offline')}
                </span>
              )}
              {isInitializing && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/10 text-blue-600">
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
            </div>
            <div className="flex items-center gap-1">
              {/* 分享按钮 */}
              <Button variant="ghost" size="sm" onClick={onShareChatId} className="h-8 w-8 p-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </Button>
              {/* 新建聊天按钮 */}
              <Button variant="ghost" size="sm" onClick={onNewChat} className="h-8 w-8 p-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Button>
              {/* 展开/收缩按钮 */}
              <Button variant="ghost" size="sm" onClick={toggleExpand} className="h-8 w-8 p-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {/* 关闭按钮 */}
              <Button variant="ghost" size="sm" onClick={closeDrawer} className="h-8 w-8 p-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{renderView()}</div>
      </SheetContent>
    </Sheet>
  );
};

export default ChatDrawer;
