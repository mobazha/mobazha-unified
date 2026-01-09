'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { useI18n } from '@mobazha/core';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isSystem?: boolean;
  type?: 'text' | 'image' | 'file';
  attachments?: Array<{
    url: string;
    filename?: string;
    mimetype?: string;
    size?: number;
  }>;
}

export interface ChatMessagesProps {
  roomId: string;
  roomName: string;
  roomAvatar?: string;
  isEncrypted?: boolean;
  isOnline?: boolean;
  isVerified?: boolean;
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  typingUsers?: string[];
  onSendMessage: (content: string) => void;
  onBack?: () => void;
  onViewProfile?: () => void;
  onCall?: () => void;
}

// 日期分隔组件
const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <div className="flex items-center gap-4 py-4">
    <div className="flex-1 h-px bg-border/50" />
    <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
      {date}
    </span>
    <div className="flex-1 h-px bg-border/50" />
  </div>
);

// 消息状态图标
const MessageStatus: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;

  return (
    <span className="inline-flex items-center ml-1">
      {status === 'sending' && (
        <svg
          className="w-3 h-3 text-muted-foreground/60 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {status === 'sent' && (
        <svg
          className="w-3.5 h-3.5 text-muted-foreground/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status === 'delivered' && (
        <svg
          className="w-4 h-4 text-muted-foreground/70"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 13l4 4"
            className="translate-x-[-3px]"
          />
        </svg>
      )}
      {status === 'read' && (
        <svg
          className="w-4 h-4 text-emerald-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 13l4 4"
            className="translate-x-[-3px]"
          />
        </svg>
      )}
      {status === 'failed' && (
        <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </span>
  );
};

// 输入状态指示器
const TypingIndicator: React.FC<{ users: string[] }> = ({ users }) => {
  if (!users.length) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        <span
          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {users.length === 1 ? `${users[0]} is typing...` : `${users.length} people are typing...`}
      </span>
    </div>
  );
};

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  roomName,
  roomAvatar,
  isEncrypted = false,
  isOnline = false,
  isVerified = false,
  messages,
  currentUserId,
  isLoading = false,
  typingUsers = [],
  onSendMessage,
  onBack,
  onViewProfile,
  onCall,
}) => {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = useCallback(
    (timestamp: string) => {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return t('chat.today');
      } else if (date.toDateString() === yesterday.toDateString()) {
        return t('chat.yesterday');
      } else {
        return date.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    },
    [t]
  );

  // 按日期分组消息
  const messagesWithDates = useMemo(() => {
    const result: Array<
      { type: 'date'; date: string } | { type: 'message'; message: Message; showAvatar: boolean }
    > = [];
    let lastDate = '';

    messages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp).toDateString();
      if (messageDate !== lastDate) {
        result.push({ type: 'date', date: formatDate(message.timestamp) });
        lastDate = messageDate;
      }

      const isOwn = message.senderId === currentUserId;
      const showAvatar =
        !isOwn && (index === 0 || messages[index - 1].senderId !== message.senderId);
      result.push({ type: 'message', message, showAvatar });
    });

    return result;
  }, [messages, currentUserId, formatDate]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 bg-card/80 backdrop-blur-sm border-b border-border/50 shadow-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        <button onClick={onViewProfile} className="hover:opacity-80 transition-opacity">
          <Avatar src={roomAvatar} name={roomName} size="md" showOnlineStatus isOnline={isOnline} />
        </button>

        <div className="flex-1 min-w-0">
          <HStack gap="sm" align="center">
            <button onClick={onViewProfile} className="hover:opacity-80 transition-opacity">
              <h3 className="font-semibold text-[15px] text-foreground truncate">{roomName}</h3>
            </button>
            {/* Verified badge */}
            {isVerified && (
              <svg
                className="w-4 h-4 text-blue-500 flex-shrink-0"
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
            {isEncrypted && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-600 rounded-md">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {t('chat.encrypted')}
              </span>
            )}
          </HStack>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {isOnline ? (
              <span className="text-emerald-500">{t('chat.online')}</span>
            ) : (
              t('chat.offline')
            )}
          </p>
        </div>

        <HStack gap="xs">
          {onCall && (
            <button
              onClick={onCall}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
              aria-label="Start call"
            >
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </button>
          )}
          <button
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            aria-label="More options"
          >
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </HStack>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {isLoading ? (
          <VStack gap="md">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="rounded" width={200} height={60} />
              </div>
            ))}
          </VStack>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground relative">
            <div className="absolute inset-0 opacity-[0.02]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-primary" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/10">
                <svg
                  className="w-10 h-10 text-primary/60"
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
              <p className="font-semibold text-foreground">{t('chat.noMessages')}</p>
              <p className="text-sm mt-1">{t('chat.typeMessage')}</p>
            </div>
          </div>
        ) : (
          <VStack gap="sm">
            {/* Encryption Notice */}
            {isEncrypted && (
              <div className="text-center py-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Messages in this chat are end-to-end encrypted
                </span>
              </div>
            )}

            {messagesWithDates.map((item, idx) => {
              if (item.type === 'date') {
                return <DateSeparator key={`date-${idx}`} date={item.date} />;
              }

              const { message, showAvatar } = item;
              const isOwn = message.senderId === currentUserId;

              if (message.isSystem) {
                return (
                  <div key={message.id} className="text-center py-2">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      {message.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <Avatar
                          src={message.senderAvatar}
                          name={message.senderName || 'User'}
                          size="sm"
                          className="ring-2 ring-background"
                        />
                      )}
                    </div>
                  )}

                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`relative px-3.5 py-2.5 rounded-2xl transition-shadow duration-200 ${
                        isOwn
                          ? 'bg-gradient-to-r from-primary to-primary/90 text-white rounded-br-md shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25'
                          : 'bg-card text-foreground rounded-bl-md shadow-sm border border-border/30 hover:shadow-md'
                      }`}
                    >
                      <p className="text-[14px] whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>

                      {/* Retry button for failed messages */}
                      {message.status === 'failed' && (
                        <button className="absolute -right-1 -bottom-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors">
                          ↻
                        </button>
                      )}
                    </div>
                    <HStack
                      gap="xs"
                      className={`mt-1 text-[10px] text-muted-foreground/60 ${isOwn ? 'justify-end' : ''}`}
                    >
                      <span>{formatTime(message.timestamp)}</span>
                      {isOwn && <MessageStatus status={message.status} />}
                    </HStack>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            <TypingIndicator users={typingUsers} />

            <div ref={messagesEndRef} />
          </VStack>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border/50">
        <HStack gap="sm" align="center">
          <button
            className="p-2 hover:bg-surface-hover rounded-xl transition-colors"
            aria-label="Attach file"
          >
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat.typeMessage')}
              className="w-full px-4 py-2.5 pr-10 text-[14px] bg-muted/50 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/20 text-foreground placeholder:text-muted-foreground/70 transition-all duration-200"
            />
            {/* Emoji button inside input */}
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>

          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="rounded-xl w-10 h-10 p-0 flex items-center justify-center shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </HStack>
      </div>
    </div>
  );
};
