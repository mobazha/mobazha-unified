'use client';

import React from 'react';
import { useChatStore, selectTotalUnreadCount } from '@mobazha/core';

export interface ChatFloatingButtonProps {
  className?: string;
}

export const ChatFloatingButton: React.FC<ChatFloatingButtonProps> = ({ className = '' }) => {
  const openDrawer = useChatStore(state => state.openDrawer);
  const isConnected = useChatStore(state => state.isConnected);
  const isInitializing = useChatStore(state => state.isInitializing);
  const totalUnread = useChatStore(selectTotalUnreadCount);

  return (
    <button
      onClick={openDrawer}
      className={`
        fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40
        w-14 h-14 rounded-full
        bg-primary text-primary-foreground
        shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-300 hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${className}
      `}
      aria-label="Open chat"
    >
      {/* Chat icon */}
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {/* Unread badge */}
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full shadow-sm animate-in zoom-in-50 duration-200">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}

      {/* Connection status indicator */}
      {!isConnected && !isInitializing && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-500 border-2 border-white dark:border-gray-900 rounded-full" />
      )}
      {isInitializing && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
      )}
    </button>
  );
};

export default ChatFloatingButton;
