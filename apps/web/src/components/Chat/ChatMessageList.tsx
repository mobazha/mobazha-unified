'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { VStack, HStack } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { Copy, Trash2, Pencil, Check, X, SmilePlus } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import type { Message } from './ChatMessages';
import {
  ChatImageContent,
  ChatFileContent,
  ChatAudioContent,
  ChatVideoContent,
  shortenSystemContent,
  cleanDisplayName,
} from './ChatMediaContent';

// ── Small presentational components ──

const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <div className="flex items-center gap-4 py-5">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 py-1 rounded-full bg-muted/30 backdrop-blur-sm">
      {date}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
  </div>
);

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
          className="w-4 h-4 text-primary"
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
        <svg className="w-3.5 h-3.5 text-error" viewBox="0 0 20 20" fill="currentColor">
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

const TYPING_MIN_DISPLAY_MS = 3000;

const TypingIndicator: React.FC<{
  users: string[];
  currentUserId: string;
  memberNameMap: Record<string, string>;
}> = ({ users, currentUserId, memberNameMap }) => {
  const otherUsers = users.filter(u => u !== currentUserId);
  const hasTyping = otherUsers.length > 0;
  const typingKey = otherUsers.join(',');

  const [visible, setVisible] = useState(false);
  const [displayNames, setDisplayNames] = useState<string[]>([]);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimestampRef = useRef<number>(0);

  useEffect(() => {
    if (hasTyping) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!visible) {
        showTimestampRef.current = Date.now();
      }
      setVisible(true);
    } else if (visible) {
      const elapsed = Date.now() - showTimestampRef.current;
      const remaining = Math.max(0, TYPING_MIN_DISPLAY_MS - elapsed);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        hideTimerRef.current = null;
      }, remaining);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTyping]);

  useEffect(() => {
    if (otherUsers.length > 0) {
      setDisplayNames(otherUsers.map(u => memberNameMap[u] || cleanDisplayName(u)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingKey, memberNameMap]);

  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 ml-10 transition-opacity duration-300"
      style={{ opacity: hasTyping ? 1 : 0.6 }}
    >
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 rounded-2xl rounded-bl-sm backdrop-blur-sm">
        <span
          className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '600ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce"
          style={{ animationDelay: '150ms', animationDuration: '600ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce"
          style={{ animationDelay: '300ms', animationDuration: '600ms' }}
        />
      </div>
      <span className="text-xs text-muted-foreground/70 font-medium">
        {displayNames.length === 1
          ? `${displayNames[0]} is typing...`
          : `${displayNames.length} people are typing...`}
      </span>
    </div>
  );
};

// ── Main component ──

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EMPTY_NAME_MAP: Record<string, string> = {};

export interface ChatMessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading: boolean;
  isEncrypted: boolean;
  typingUsers: string[];
  memberNameMap?: Record<string, string>;
  onRetryMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onLoadMore?: () => void;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  onAvatarClick?: (senderId: string, senderName?: string, senderAvatar?: string) => void;
  searchQuery: string;
  searchResults: number[];
  currentSearchIndex: number;
  onLightbox: (src: string) => void;
  onDeleteConfirm: (id: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  currentUserId,
  isLoading,
  isEncrypted,
  typingUsers,
  memberNameMap: memberNameMapProp,
  onRetryMessage,
  onDeleteMessage,
  onEditMessage,
  onReaction,
  onLoadMore,
  hasMoreMessages,
  isLoadingMore,
  onAvatarClick,
  searchQuery,
  searchResults,
  currentSearchIndex,
  onLightbox,
  onDeleteConfirm,
}) => {
  const { t } = useI18n();

  const memberNameMap = memberNameMapProp || EMPTY_NAME_MAP;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [longPressMenuId, setLongPressMenuId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore || !hasMoreMessages || isLoadingMore) return;
    if (container.scrollTop < 60) {
      onLoadMore();
    }
  }, [onLoadMore, hasMoreMessages, isLoadingMore]);

  const handleTouchStart = useCallback((msgId: string) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setLongPressMenuId(msgId), 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleCopy = useCallback(async (msg: Message) => {
    const text = msg.content || msg.attachments?.[0]?.url || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard may be blocked */
    }
  }, []);

  const handleStartEdit = useCallback((msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
    setLongPressMenuId(null);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, []);

  const handleConfirmEdit = useCallback(() => {
    if (editingMessageId && editingContent.trim() && onEditMessage) {
      onEditMessage(editingMessageId, editingContent.trim());
    }
    setEditingMessageId(null);
    setEditingContent('');
  }, [editingMessageId, editingContent, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent('');
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleConfirmEdit();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleConfirmEdit, handleCancelEdit]
  );

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
      if (date.toDateString() === today.toDateString()) return t('chat.today');
      if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
      return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    },
    [t]
  );

  const messagesWithDates = useMemo(() => {
    const result: Array<
      | { type: 'date'; date: string }
      | { type: 'message'; message: Message; showAvatar: boolean; messageIndex: number }
    > = [];
    let lastDate = '';

    const renderableMessages = messages.filter(
      m =>
        m.content ||
        (m.attachments && m.attachments.length > 0 && m.attachments[0].url) ||
        m.isSystem
    );

    renderableMessages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp).toDateString();
      if (messageDate !== lastDate) {
        result.push({ type: 'date', date: formatDate(message.timestamp) });
        lastDate = messageDate;
      }
      const isOwn = message.senderId === currentUserId;
      const showAvatar =
        !isOwn && (index === 0 || renderableMessages[index - 1].senderId !== message.senderId);
      result.push({ type: 'message', message, showAvatar, messageIndex: index });
    });
    return result;
  }, [messages, currentUserId, formatDate]);

  // ── Render ──

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
    >
      {isLoadingMore && (
        <div className="flex justify-center py-3">
          <span className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
        </div>
      )}
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
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground relative px-4">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-primary/5 blur-3xl animate-pulse"
              style={{ animationDuration: '4s' }}
            />
            <div
              className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-primary/3 blur-3xl animate-pulse"
              style={{ animationDuration: '6s', animationDelay: '1s' }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-primary/10 opacity-50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-primary/5" />
          </div>
          <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative mb-6">
              <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-primary/10 blur-xl" />
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/20 shadow-xl shadow-primary/10 backdrop-blur-sm">
                <svg
                  className="w-12 h-12 text-primary/70"
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
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">{t('chat.noMessages')}</h3>
            <p className="text-sm text-muted-foreground/70 text-center max-w-[200px]">
              {t('chat.typeMessage')}
            </p>
            <div className="flex items-center gap-1.5 mt-6">
              <div
                className="w-2 h-2 rounded-full bg-primary/30 animate-bounce"
                style={{ animationDelay: '0ms', animationDuration: '1s' }}
              />
              <div
                className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                style={{ animationDelay: '150ms', animationDuration: '1s' }}
              />
              <div
                className="w-2 h-2 rounded-full bg-primary/30 animate-bounce"
                style={{ animationDelay: '300ms', animationDuration: '1s' }}
              />
            </div>
          </div>
        </div>
      ) : (
        <VStack gap="sm">
          {isEncrypted && (
            <div className="text-center py-4 mb-2 animate-in fade-in duration-500">
              <div className="inline-flex flex-col items-center gap-2 px-5 py-3 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm rounded-2xl border border-primary/20 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-[12px] font-semibold text-primary">
                    End-to-End Encrypted
                  </span>
                </div>
                <span className="text-xs text-primary/70">Messages in this chat are secured</span>
              </div>
            </div>
          )}

          {messagesWithDates.map((item, idx) => {
            if (item.type === 'date') {
              return <DateSeparator key={`date-${idx}`} date={item.date} />;
            }

            const { message, showAvatar, messageIndex } = item;
            const isOwn = message.senderId === currentUserId;
            const localId = (message as { localId?: string }).localId;
            const keyBase = message.id || localId || 'msg';
            const keySuffix = localId || `${message.timestamp || 0}-${message.senderId}-${idx}`;
            const itemKey = `${keyBase}-${keySuffix}`;
            const messageAnchorId = message.id || localId || `${idx}`;

            const isSearchMatch =
              Boolean(searchQuery.trim()) &&
              Boolean(message.content?.toLowerCase().includes(searchQuery.toLowerCase()));
            const isCurrentSearchMatch =
              isSearchMatch && searchResults[currentSearchIndex] === messageIndex;
            const searchHighlightClass = isCurrentSearchMatch
              ? 'ring-2 ring-primary/50'
              : isSearchMatch
                ? 'ring-1 ring-primary/20'
                : '';

            if (message.isSystem) {
              return (
                <div
                  key={itemKey}
                  id={`msg-${messageAnchorId}`}
                  className={`flex justify-center py-3 animate-in fade-in duration-300 ${searchHighlightClass}`}
                >
                  <span className="inline-block max-w-[85%] text-xs text-muted-foreground/70 bg-muted/40 backdrop-blur-sm px-4 py-1.5 rounded-xl font-medium border border-border/20 break-words text-center">
                    {shortenSystemContent(message.content)}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={itemKey}
                id={`msg-${messageAnchorId}`}
                className={`flex gap-2.5 group animate-in fade-in slide-in-from-bottom-2 duration-300 ${isOwn ? 'flex-row-reverse' : ''} ${searchHighlightClass}`}
              >
                {!isOwn && (
                  <div className="w-9 flex-shrink-0">
                    {showAvatar && (
                      <button
                        onClick={() =>
                          onAvatarClick?.(
                            message.senderId,
                            message.senderName,
                            message.senderAvatar
                          )
                        }
                        className="block hover:scale-110 transition-transform duration-200"
                        data-testid="chat-message-avatar-btn"
                      >
                        <Avatar
                          src={message.senderAvatar}
                          rawMxcUrl={message.senderRawMxcAvatarUrl}
                          name={message.senderName || 'User'}
                          size="sm"
                          className="ring-2 ring-background shadow-sm cursor-pointer"
                        />
                      </button>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[75%] relative group/msg ${isOwn ? 'items-end' : 'items-start'}`}
                  onTouchStart={() => !message.isSystem && handleTouchStart(message.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                >
                  {/* Desktop hover action bar */}
                  {!message.isSystem &&
                    message.status !== 'sending' &&
                    editingMessageId !== message.id && (
                      <div
                        className={`absolute top-0 ${isOwn ? 'right-full pr-1' : 'left-full pl-1'} hidden md:group-hover/msg:flex items-center gap-0.5 z-10`}
                      >
                        {onReaction && (
                          <button
                            onClick={() =>
                              setReactionPickerMsgId(prev =>
                                prev === message.id ? null : message.id
                              )
                            }
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                            title={t('chat.react')}
                          >
                            <SmilePlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {message.type === 'text' && (
                          <button
                            onClick={() => handleCopy(message)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                            title={copiedId === message.id ? t('common.copied') : t('common.copy')}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isOwn && onEditMessage && message.type === 'text' && (
                          <button
                            onClick={() => handleStartEdit(message)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                            title={t('common.edit')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isOwn && onDeleteMessage && (
                          <button
                            onClick={() => onDeleteConfirm(message.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-error hover:bg-error/10 transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                  {/* Reaction picker — positioned on message container, not inside the action bar */}
                  {reactionPickerMsgId === message.id && onReaction && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setReactionPickerMsgId(null)}
                      />
                      <div
                        className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-11 z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-popover border border-border shadow-xl animate-in fade-in zoom-in-95 duration-150`}
                      >
                        {QUICK_REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              onReaction(message.id, emoji);
                              setReactionPickerMsgId(null);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-base rounded-lg hover:bg-muted/60 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Mobile long-press popup */}
                  {longPressMenuId === message.id && editingMessageId !== message.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setLongPressMenuId(null)}
                      />
                      <div
                        className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-10 z-50 flex flex-col gap-1 rounded-xl bg-popover border border-border shadow-xl animate-in fade-in zoom-in-95 duration-150`}
                      >
                        {onReaction && (
                          <div className="flex items-center gap-0.5 px-2 pt-1.5">
                            {QUICK_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  onReaction(message.id, emoji);
                                  setLongPressMenuId(null);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-base rounded-lg hover:bg-muted/60 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1 px-2 pb-1.5">
                          {message.type === 'text' && (
                            <button
                              onClick={() => {
                                handleCopy(message);
                                setLongPressMenuId(null);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {t('common.copy')}
                            </button>
                          )}
                          {isOwn && onEditMessage && message.type === 'text' && (
                            <button
                              onClick={() => handleStartEdit(message)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              {t('common.edit')}
                            </button>
                          )}
                          {isOwn && onDeleteMessage && (
                            <button
                              onClick={() => {
                                onDeleteConfirm(message.id);
                                setLongPressMenuId(null);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-error hover:bg-error/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {t('common.delete')}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Message content */}
                  {message.type === 'image' && message.attachments?.[0]?.url ? (
                    <ChatImageContent
                      attachment={message.attachments[0]}
                      isOwn={isOwn}
                      status={message.status}
                      uploadProgress={message.uploadProgress}
                      onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
                      onPreview={onLightbox}
                    />
                  ) : message.type === 'file' && message.attachments?.[0]?.url ? (
                    <ChatFileContent
                      attachment={message.attachments[0]}
                      isOwn={isOwn}
                      status={message.status}
                      uploadProgress={message.uploadProgress}
                      onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
                    />
                  ) : message.type === 'audio' && message.attachments?.[0]?.url ? (
                    <ChatAudioContent
                      attachment={message.attachments[0]}
                      isOwn={isOwn}
                      status={message.status}
                      onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
                    />
                  ) : message.type === 'video' && message.attachments?.[0]?.url ? (
                    <ChatVideoContent
                      attachment={message.attachments[0]}
                      isOwn={isOwn}
                      status={message.status}
                      onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
                    />
                  ) : editingMessageId === message.id ? (
                    <div
                      className={`relative px-3 py-2 rounded-2xl border-2 border-primary/60 bg-card shadow-lg ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    >
                      <input
                        ref={editInputRef}
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="w-full bg-transparent text-[14px] text-foreground outline-none"
                      />
                      <div className="flex items-center justify-end gap-1 mt-1.5">
                        <button
                          onClick={handleCancelEdit}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleConfirmEdit}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : !message.content ? null : (
                    <div
                      className={`relative px-4 py-3 transition-all duration-200 ${
                        isOwn
                          ? 'bg-gradient-to-br from-primary via-primary to-primary/85 text-white rounded-2xl rounded-br-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5'
                          : 'bg-card/95 backdrop-blur-sm text-foreground rounded-2xl rounded-bl-sm shadow-md border border-border/40 hover:shadow-lg hover:border-border/60 hover:-translate-y-0.5'
                      }`}
                    >
                      <p className="text-[14px] whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                      {message.isEdited && (
                        <span
                          className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-muted-foreground/50'}`}
                        >
                          {t('chat.edited')}
                        </span>
                      )}
                      {message.status === 'failed' && (
                        <button
                          onClick={() => onRetryMessage?.(message.id)}
                          className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
                          aria-label="Retry"
                        >
                          ↻
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reactions */}
                  {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div
                      className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {Object.entries(message.reactions).map(([emoji, senders]) => (
                        <button
                          key={emoji}
                          onClick={() => onReaction?.(message.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                            senders.includes(currentUserId)
                              ? 'bg-primary/15 border-primary/30 text-primary'
                              : 'bg-muted/50 border-border/40 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <span>{emoji}</span>
                          {senders.length > 1 && (
                            <span className="text-[10px] font-medium">{senders.length}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp + status */}
                  <HStack
                    gap="xs"
                    className={`mt-1.5 text-xs text-muted-foreground/50 font-medium ${isOwn ? 'justify-end pr-1' : 'pl-1'}`}
                  >
                    <span>{formatTime(message.timestamp)}</span>
                    {isOwn && <MessageStatus status={message.status} />}
                  </HStack>
                </div>
              </div>
            );
          })}

          <TypingIndicator
            users={typingUsers}
            currentUserId={currentUserId}
            memberNameMap={memberNameMap}
          />
          <div ref={messagesEndRef} />
        </VStack>
      )}
    </div>
  );
};
