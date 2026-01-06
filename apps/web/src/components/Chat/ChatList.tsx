'use client';

import React from 'react';
import Link from 'next/link';
import { VStack, HStack } from '@mobazha/ui';
import { Avatar, Input, Skeleton } from '@mobazha/ui';

export interface ChatRoom {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isEncrypted?: boolean;
}

export interface ChatListProps {
  rooms: ChatRoom[];
  activeRoomId?: string;
  isLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onRoomSelect?: (roomId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  rooms,
  activeRoomId,
  isLoading = false,
  searchQuery = '',
  onSearchChange,
  onRoomSelect,
}) => {
  const filteredRooms = rooms.filter(
    room =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Messages</h2>
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange?.(e.target.value)}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <VStack gap="none" className="p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="flex-1">
                  <Skeleton variant="text" width="60%" height={18} />
                  <Skeleton variant="text" width="80%" height={14} className="mt-1" />
                </div>
              </div>
            ))}
          </VStack>
        ) : filteredRooms.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <VStack gap="none">
            {filteredRooms.map(room => (
              <Link
                key={room.id}
                href={`/chat/${room.id}`}
                onClick={() => onRoomSelect?.(room.id)}
                className={`flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  activeRoomId === room.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                }`}
              >
                {/* Avatar with online status */}
                <div className="relative flex-shrink-0">
                  <Avatar src={room.avatar} name={room.name} size="md" />
                  {/* Online status indicator - bottom right */}
                  {room.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <HStack justify="between" align="center">
                    <HStack gap="xs" align="center" className="min-w-0 flex-1">
                      <span className="font-medium text-slate-900 dark:text-white truncate">
                        {room.name}
                      </span>
                      {/* Encrypted indicator - next to name */}
                      {room.isEncrypted && (
                        <svg
                          className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0"
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
                    </HStack>
                    {room.lastMessageTime && (
                      <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                        {room.lastMessageTime}
                      </span>
                    )}
                  </HStack>
                  <HStack justify="between" align="center" className="mt-0.5">
                    <p className="text-sm text-slate-500 truncate">
                      {room.lastMessage || 'No messages'}
                    </p>
                    {room.unreadCount && room.unreadCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {room.unreadCount > 9 ? '9+' : room.unreadCount}
                      </span>
                    )}
                  </HStack>
                </div>
              </Link>
            ))}
          </VStack>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <button className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>
    </div>
  );
};
