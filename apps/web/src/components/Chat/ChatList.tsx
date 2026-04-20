'use client';

import React, { useMemo } from 'react';
import { VStack, HStack } from '@/components/layouts';
import { Input } from '@/components/ui/input-compat';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { useI18n } from '@mobazha/core';

export interface ChatRoom {
  id: string;
  name: string;
  avatar?: string;
  rawMxcAvatarUrl?: string; // 原始 mxc:// URL，用于认证下载
  lastMessage?: string;
  lastMessageTime?: string;
  timestamp?: number;
  unreadCount?: number;
  isEncrypted?: boolean;
  isDirect?: boolean;
  roomType?: 'direct' | 'group' | 'order' | 'store' | 'community' | 'moderator';
  isInvite?: boolean;
  inviterName?: string;
  isExternal?: boolean;
  isVerified?: boolean;
}

export interface ChatListProps {
  rooms: ChatRoom[];
  invites?: ChatRoom[];
  activeRoomId?: string;
  isLoading?: boolean;
  isConnected?: boolean;
  searchQuery?: string;
  /** When true, hides the internal header (title + action buttons) — used when embedded in ChatDrawer which provides its own header */
  embedded?: boolean;
  onSearchChange?: (query: string) => void;
  onRoomSelect?: (roomId: string) => void;
  onInviteSelect?: (roomId: string) => void;
  onNewChat?: () => void;
  onShareChatId?: () => void;
  onAcceptInvite?: (roomId: string) => void;
  onRejectInvite?: (roomId: string) => void;
}

const RoomTypeBadge: React.FC<{ type?: string; isExternal?: boolean }> = ({ type, isExternal }) => {
  if (isExternal) {
    return (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary">
        Matrix
      </span>
    );
  }

  if (!type || type === 'direct') return null;

  const badges: Record<string, { label: string; className: string }> = {
    group: {
      label: 'Group',
      className: 'bg-info/15 text-info',
    },
    order: {
      label: 'Order',
      className: 'bg-warning/15 text-warning',
    },
    store: {
      label: 'Store',
      className: 'bg-primary/15 text-primary',
    },
    community: {
      label: 'Community',
      className: 'bg-primary/15 text-primary',
    },
    moderator: {
      label: 'Dispute',
      className: 'bg-error/15 text-error',
    },
  };

  const badge = badges[type];
  if (!badge) return null;

  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${badge.className}`}>
      {badge.label}
    </span>
  );
};

const InviteSectionHeader: React.FC<{ count: number; title: string }> = ({ count, title }) => (
  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-muted/40 to-muted/20 border-y border-border/20 backdrop-blur-sm">
    <span className="text-muted-foreground/70">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    </span>
    <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
      {title}
    </span>
    <span className="text-xs text-muted-foreground/50 font-medium bg-muted/50 px-1.5 py-0.5 rounded-full">
      {count}
    </span>
  </div>
);

export const ChatList: React.FC<ChatListProps> = ({
  rooms,
  invites = [],
  activeRoomId,
  isLoading = false,
  isConnected = true,
  searchQuery = '',
  embedded = false,
  onSearchChange,
  onRoomSelect,
  onInviteSelect,
  onNewChat,
  onShareChatId,
  onAcceptInvite,
  onRejectInvite,
}) => {
  const { t } = useI18n();

  const sortedRooms = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return rooms
      .filter(
        room =>
          room.name.toLowerCase().includes(query) || room.lastMessage?.toLowerCase().includes(query)
      )
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [rooms, searchQuery]);

  const renderRoomItem = (room: ChatRoom, isInvite = false) => (
    <button
      key={room.id}
      type="button"
      onClick={() => {
        if (isInvite) {
          onInviteSelect?.(room.id);
        } else {
          onRoomSelect?.(room.id);
        }
      }}
      className={`w-full text-left group flex items-center gap-3 p-3 sm:p-3.5 transition-all duration-200 relative rounded-lg mx-1 my-0.5 ${
        activeRoomId === room.id
          ? 'bg-primary/8 shadow-sm'
          : isInvite
            ? 'bg-primary/5 hover:bg-primary/10'
            : 'hover:bg-muted/60 hover:translate-x-1 hover:-translate-y-0.5 hover:shadow-md'
      }`}
      data-testid={isInvite ? 'chat-invite-item' : 'chat-room-item'}
      data-room-id={room.id}
    >
      {/* Active indicator bar */}
      {activeRoomId === room.id && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[60%] bg-gradient-to-b from-primary to-primary/70 rounded-r-full" />
      )}
      {isInvite && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[60%] bg-gradient-to-b from-success to-success/70 rounded-r-full animate-pulse" />
      )}

      {/* Avatar with online status */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={room.avatar}
          rawMxcUrl={room.rawMxcAvatarUrl}
          name={room.name}
          size="sm"
          className="w-12 h-12 ring-2 ring-background shadow-md transition-all duration-200 group-hover:ring-primary/20 group-hover:scale-105"
        />
        {/* Invite badge */}
        {isInvite && (
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-success border-2 border-card rounded-full flex items-center justify-center shadow-md">
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <HStack justify="between" align="center">
          <HStack gap="xs" align="center" className="min-w-0 flex-1">
            <span className="font-semibold text-[14px] text-foreground truncate group-hover:text-primary transition-colors duration-200">
              {room.name}
            </span>
            {/* Verified badge */}
            {room.isVerified && (
              <svg
                className="w-4 h-4 text-info flex-shrink-0 drop-shadow-sm"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {/* Encrypted indicator */}
            {room.isEncrypted && !isInvite && (
              <svg
                className="w-3.5 h-3.5 text-primary flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-label="End-to-end encrypted"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {/* Type badge */}
            <RoomTypeBadge type={room.roomType} isExternal={room.isExternal} />
          </HStack>
          {room.lastMessageTime && !isInvite && (
            <span className="text-xs text-muted-foreground/60 flex-shrink-0 ml-2 font-medium">
              {room.lastMessageTime}
            </span>
          )}
        </HStack>
        <HStack justify="between" align="center" className="mt-1">
          {isInvite ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-primary font-semibold">{t('chat.invitedYou')}</span>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground/70 truncate leading-relaxed">
              {room.lastMessage || t('chat.noMessages')}
            </p>
          )}
          {isInvite ? (
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAcceptInvite?.(room.id);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-success hover:bg-success/90 text-white rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                {t('chat.accept')}
              </button>
              <button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRejectInvite?.(room.id);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-muted/80 hover:bg-muted text-muted-foreground rounded-lg transition-all"
              >
                {t('chat.decline')}
              </button>
            </div>
          ) : room.unreadCount && room.unreadCount > 0 ? (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-2 bg-gradient-to-r from-primary to-primary/90 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md shadow-primary/30 animate-pulse">
              {room.unreadCount > 99 ? '99+' : room.unreadCount}
            </span>
          ) : null}
        </HStack>
      </div>
    </button>
  );

  return (
    <div
      className={`h-full flex flex-col overflow-hidden bg-background ${embedded ? '' : 'bg-card border-r border-border/50 shadow-sm'}`}
    >
      {/* Header — hidden when embedded in ChatDrawer (which provides its own header) */}
      {!embedded && (
        <div className="p-3 sm:p-4 border-b border-border/50 bg-gradient-to-b from-card to-transparent">
          <div className="flex items-center justify-between mb-0 lg:mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] sm:text-lg font-bold text-foreground">
                {t('chat.title')}
              </h2>
              {!isConnected && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-warning/15 text-warning">
                  <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Offline
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 lg:hidden">
              <button
                onClick={onShareChatId}
                className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted rounded-lg transition-all duration-200"
                aria-label="Share Chat ID"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </button>
              <button
                onClick={onNewChat}
                className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted rounded-lg transition-all duration-200"
                aria-label={t('chat.newMessage')}
                data-testid="chat-new-btn"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <Input
              placeholder={t('chat.searchConversations')}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSearchChange?.(e.target.value)
              }
              className="h-10 text-[13px] rounded-xl bg-muted/50 border-transparent focus:border-primary/30 transition-all duration-200"
              leftIcon={
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      )}

      {/* Search bar — visible when embedded AND room count justifies it */}
      {embedded && rooms.length + invites.length >= 5 && (
        <div className="px-3 py-2 border-b border-border/30">
          <Input
            placeholder={t('chat.searchConversations')}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange?.(e.target.value)}
            className="h-9 text-[13px] rounded-xl bg-muted/50 border-transparent focus:border-primary/30 transition-all duration-200"
            leftIcon={
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>
      )}

      {/* Room List */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        data-testid="chat-conversation-list"
      >
        {isLoading ? (
          <VStack gap="none" className="p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton variant="circular" width={44} height={44} />
                <div className="flex-1">
                  <Skeleton variant="text" width="60%" height={16} />
                  <Skeleton variant="text" width="80%" height={12} className="mt-1.5" />
                </div>
              </div>
            ))}
          </VStack>
        ) : sortedRooms.length === 0 && invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-primary/5 blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="w-20 h-20 mb-5 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-sm flex items-center justify-center shadow-lg border border-border/30">
                <svg
                  className="w-10 h-10 text-muted-foreground/60"
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
              <p className="text-muted-foreground/80 text-sm font-medium">
                {searchQuery ? t('empty.noStoresFound') : t('chat.noMessages')}
              </p>
              {!searchQuery && (
                <>
                  <p className="mt-2 text-xs text-muted-foreground/50 max-w-[220px]">
                    {t('chat.encryptedHint')}
                  </p>
                  <button
                    onClick={onNewChat}
                    className="mt-5 px-5 py-2.5 text-sm font-medium text-primary hover:text-primary/80 rounded-xl transition-all duration-200 border border-primary/20 hover:border-primary/40"
                  >
                    {t('chat.startConversation')}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <VStack gap="none">
            {/* Pending invites — always pinned at top */}
            {invites.length > 0 && (
              <>
                <InviteSectionHeader count={invites.length} title={t('chat.invitations')} />
                {invites.map(invite => renderRoomItem(invite, true))}
              </>
            )}

            {/* Unified chronological list — all rooms sorted by last activity */}
            {sortedRooms.map(room => renderRoomItem(room))}
          </VStack>
        )}
      </div>

      {/* New Chat Button — visible on desktop standalone, or always when embedded in Drawer */}
      <div
        className={`${embedded ? '' : 'hidden lg:block'} p-4 border-t border-border/30 bg-gradient-to-t from-card via-card/95 to-transparent backdrop-blur-sm`}
      >
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 rounded-xl transition-all duration-200 text-[13px] font-medium"
          data-testid="chat-new-btn"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('chat.newMessage')}
        </button>
      </div>
    </div>
  );
};
