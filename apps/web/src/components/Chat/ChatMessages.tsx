'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VStack, HStack } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import {
  Send,
  FileText,
  Download,
  Copy,
  Trash2,
  Paperclip,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Pencil,
  Check,
  SmilePlus,
} from 'lucide-react';
import { useI18n, useAuthenticatedImage } from '@mobazha/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  senderRawMxcAvatarUrl?: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  uploadProgress?: number;
  isSystem?: boolean;
  isEdited?: boolean;
  type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  reactions?: Record<string, string[]>;
  attachments?: Array<{
    url: string;
    filename?: string;
    mimetype?: string;
    size?: number;
    width?: number;
    height?: number;
    thumbnailUrl?: string;
  }>;
}

export interface ChatMessagesProps {
  roomId: string;
  roomName: string;
  roomAvatar?: string;
  roomRawMxcAvatarUrl?: string; // 原始 mxc:// URL，用于认证下载
  isEncrypted?: boolean;
  isOnline?: boolean;
  isDirect?: boolean;
  isVerified?: boolean;
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  typingUsers?: string[];
  onSendMessage: (content: string) => void;
  onSendFile?: (file: File) => void;
  onTyping?: (isTyping: boolean) => void;
  onRetryMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  isConnected?: boolean;
  onLoadMore?: () => void;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  onBack?: () => void;
  onRoomSettings?: () => void;
  onAvatarClick?: (senderId: string, senderName?: string, senderAvatar?: string) => void;
  onCall?: () => void;
}

// 日期分隔组件
const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <div className="flex items-center gap-4 py-5">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 py-1 rounded-full bg-muted/30 backdrop-blur-sm">
      {date}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
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

// 输入状态指示器
const TypingIndicator: React.FC<{ users: string[] }> = ({ users }) => {
  if (!users.length) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 ml-10">
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
        {users.length === 1 ? `${users[0]} is typing...` : `${users.length} people are typing...`}
      </span>
    </div>
  );
};

/**
 * Shorten peer-style identifiers inside system event text so they remain
 * readable without horizontal overflow.
 * e.g. "peer_12d3koowej3dwbazwquq6r8lqw2qz4d9vntpy74z6gvyvtmox8" → "peer_12d3…mox8"
 *      "@peer_12d3ko…:matrix.org invited @peer_ab34…:matrix.org"
 */
/**
 * Strip the "peer_" prefix and Matrix user-id decorations from a room /
 * user name so the avatar initial letter and visible label are cleaner.
 * "peer_12d3koowej3dwb…" → "12d3ko…3dwb"
 * Falls back to "Chat" when the result would be empty.
 */
function cleanDisplayName(raw: string): string {
  let name = raw.replace(/^@/, '').replace(/:[a-z0-9._-]+$/i, '');
  if (name.startsWith('peer_')) name = name.slice(5);
  if (name.length > 12) name = `${name.slice(0, 6)}…${name.slice(-4)}`;
  return name || 'Chat';
}

function shortenSystemContent(text: string): string {
  return text.replace(
    /(?:@)?(peer_[a-z0-9]{6})[a-z0-9]{8,}([a-z0-9]{4})(?::[a-z0-9._-]+)?/gi,
    '$1…$2'
  );
}

function needsMatrixAuth(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('mxc://') || url.includes('/_matrix/');
}

function useResolvedMediaUrl(url?: string): string | undefined {
  const needs = url ? needsMatrixAuth(url) : false;
  const { imageUrl } = useAuthenticatedImage(needs ? url : undefined, !needs ? url : undefined);
  return imageUrl || url;
}

interface ChatMediaProps {
  attachment: NonNullable<Message['attachments']>[number];
  isOwn: boolean;
  status?: Message['status'];
  uploadProgress?: number;
  onRetry?: () => void;
}

const ChatImageContent: React.FC<ChatMediaProps & { onPreview?: (src: string) => void }> =
  React.memo(({ attachment, isOwn, status, uploadProgress, onRetry, onPreview }) => {
    const displaySrc = useResolvedMediaUrl(attachment.thumbnailUrl || attachment.url);
    const fullSrc = useResolvedMediaUrl(attachment.url);

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => fullSrc && onPreview?.(fullSrc)}
          className="block cursor-zoom-in"
        >
          <img
            src={displaySrc || ''}
            alt={attachment.filename || 'Image'}
            className={`max-w-[260px] max-h-[260px] rounded-2xl object-cover shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
              isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
            }`}
            loading="lazy"
          />
        </button>
        {status === 'sending' && uploadProgress != null && uploadProgress < 100 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
            <div className="flex flex-col items-center gap-1">
              <svg className="w-10 h-10" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="white"
                  strokeOpacity="0.3"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${uploadProgress * 0.942} 94.2`}
                  transform="rotate(-90 18 18)"
                  className="transition-all duration-300"
                />
              </svg>
              <span className="text-white text-xs font-medium">{uploadProgress}%</span>
            </div>
          </div>
        )}
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
      </div>
    );
  });
ChatImageContent.displayName = 'ChatImageContent';

const ChatFileContent: React.FC<ChatMediaProps & { formatFileSize: (bytes?: number) => string }> =
  React.memo(({ attachment, isOwn, status, uploadProgress, onRetry, formatFileSize }) => {
    const fileSrc = useResolvedMediaUrl(attachment.url);

    return (
      <div className="relative">
        <a
          href={fileSrc || '#'}
          download={attachment.filename || 'file'}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 ${
            isOwn
              ? 'bg-gradient-to-br from-primary via-primary to-primary/85 text-white rounded-br-sm shadow-lg shadow-primary/25 hover:shadow-xl'
              : 'bg-card/95 backdrop-blur-sm text-foreground rounded-bl-sm shadow-md border border-border/40 hover:shadow-lg hover:border-border/60'
          }`}
        >
          <div
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              isOwn ? 'bg-white/20' : 'bg-primary/10'
            }`}
          >
            <FileText className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-primary'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{attachment.filename || 'File'}</p>
            {attachment.size && (
              <p className={`text-xs mt-0.5 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                {formatFileSize(attachment.size)}
              </p>
            )}
          </div>
          {status === 'sending' && uploadProgress != null && uploadProgress < 100 ? (
            <span
              className={`shrink-0 text-xs font-medium tabular-nums ${isOwn ? 'text-white/80' : 'text-muted-foreground'}`}
            >
              {uploadProgress}%
            </span>
          ) : (
            <Download
              className={`shrink-0 w-4 h-4 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}
            />
          )}
        </a>
        {status === 'sending' && uploadProgress != null && uploadProgress < 100 && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden ${isOwn ? 'bg-white/20' : 'bg-border/40'}`}
          >
            <div
              className={`h-full transition-all duration-300 ${isOwn ? 'bg-white/60' : 'bg-primary/60'}`}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
      </div>
    );
  });
ChatFileContent.displayName = 'ChatFileContent';

const ChatAudioContent: React.FC<ChatMediaProps> = React.memo(
  ({ attachment, isOwn, status, onRetry }) => {
    const audioSrc = useResolvedMediaUrl(attachment.url);

    return (
      <div
        className={`relative rounded-2xl overflow-hidden shadow-md ${
          isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
        } ${isOwn ? 'bg-gradient-to-br from-primary via-primary to-primary/85' : 'bg-card/95 backdrop-blur-sm border border-border/40'}`}
      >
        <audio controls preload="metadata" className="block w-[260px] h-11" src={audioSrc || ''} />
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
      </div>
    );
  }
);
ChatAudioContent.displayName = 'ChatAudioContent';

const ChatVideoContent: React.FC<ChatMediaProps> = React.memo(
  ({ attachment, isOwn, status, onRetry }) => {
    const videoSrc = useResolvedMediaUrl(attachment.url);
    const posterSrc = useResolvedMediaUrl(attachment.thumbnailUrl);

    return (
      <div className="relative">
        <video
          controls
          preload="metadata"
          poster={posterSrc || undefined}
          className={`max-w-[260px] max-h-[260px] rounded-2xl shadow-md ${
            isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
          }`}
          src={videoSrc || ''}
        />
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
      </div>
    );
  }
);
ChatVideoContent.displayName = 'ChatVideoContent';

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  roomName,
  roomAvatar,
  roomRawMxcAvatarUrl,
  isEncrypted = false,
  isOnline,
  isDirect = false,
  isVerified = false,
  messages,
  currentUserId,
  isLoading = false,
  typingUsers = [],
  onSendMessage,
  onSendFile,
  onTyping,
  onRetryMessage,
  onDeleteMessage,
  onEditMessage,
  onReaction,
  isConnected = true,
  onLoadMore,
  hasMoreMessages = false,
  isLoadingMore = false,
  onBack,
  onRoomSettings,
  onAvatarClick,
  onCall,
}) => {
  const { t } = useI18n();
  const displayName = useMemo(() => cleanDisplayName(roomName), [roomName]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [showSearch, setShowSearch] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);

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

  // 停止输入时清除 typing 状态
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping?.(false);
    };
  }, [onTyping]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);

      if (!onTyping) return;

      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 3000);
    },
    [onTyping]
  );

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping?.(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore || !hasMoreMessages || isLoadingMore) return;
    if (container.scrollTop < 60) {
      onLoadMore();
    }
  }, [onLoadMore, hasMoreMessages, isLoadingMore]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onSendFile) {
        onSendFile(file);
      }
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [onSendFile]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        return;
      }
      const lowerQuery = query.toLowerCase();
      const indices: number[] = [];
      messages.forEach((msg, idx) => {
        if (msg.content?.toLowerCase().includes(lowerQuery)) {
          indices.push(idx);
        }
      });
      setSearchResults(indices);
      setCurrentSearchIndex(indices.length > 0 ? 0 : -1);
    },
    [messages]
  );

  const jumpToSearchResult = useCallback(
    (direction: 'next' | 'prev') => {
      if (searchResults.length === 0) return;
      let newIndex = currentSearchIndex;
      if (direction === 'next') {
        newIndex = (currentSearchIndex + 1) % searchResults.length;
      } else {
        newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
      }
      setCurrentSearchIndex(newIndex);

      const msgIndex = searchResults[newIndex];
      const msgElement = document.getElementById(`msg-${messages[msgIndex]?.id}`);
      if (msgElement) {
        msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [searchResults, currentSearchIndex, messages]
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const [longPressMenuId, setLongPressMenuId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleTouchStart = useCallback((msgId: string) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setLongPressMenuId(msgId);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = useCallback(async (msg: Message) => {
    const text = msg.content || msg.attachments?.[0]?.url || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard may be blocked in some contexts */
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

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
      | { type: 'date'; date: string }
      | { type: 'message'; message: Message; showAvatar: boolean; messageIndex: number }
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
      result.push({ type: 'message', message, showAvatar, messageIndex: index });
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

        <button onClick={onRoomSettings} className="hover:opacity-80 transition-opacity">
          <Avatar
            src={roomAvatar}
            rawMxcUrl={roomRawMxcAvatarUrl}
            name={displayName}
            size="md"
            showOnlineStatus
            isOnline={isOnline}
          />
        </button>

        <div className="flex-1 min-w-0">
          <HStack gap="sm" align="center">
            <button onClick={onRoomSettings} className="hover:opacity-80 transition-opacity">
              <h3 className="font-semibold text-[15px] text-foreground truncate">{displayName}</h3>
            </button>
            {/* Verified badge */}
            {isVerified && (
              <svg
                className="w-4 h-4 text-info flex-shrink-0"
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
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-primary/15 text-primary rounded-md">
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
            {isOnline === true ? (
              <span className="text-primary">{t('chat.online')}</span>
            ) : isOnline === false ? (
              t('chat.offline')
            ) : isDirect ? (
              t('chat.directMessage')
            ) : (
              t('chat.groupChat')
            )}
          </p>
        </div>

        <HStack gap="xs">
          <button
            type="button"
            onClick={() => setShowSearch(s => !s)}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            aria-label={t('chat.searchMessages')}
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
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
            onClick={onRoomSettings}
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

      {showSearch && (
        <div className="px-3 py-2 border-b border-border/40 bg-card flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t('chat.searchMessages')}
            className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            autoFocus
          />
          {searchResults.length > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {currentSearchIndex + 1}/{searchResults.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => jumpToSearchResult('prev')}
            disabled={searchResults.length === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => jumpToSearchResult('next')}
            disabled={searchResults.length === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
              setSearchResults([]);
              setCurrentSearchIndex(-1);
            }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {/* Load more spinner */}
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
            {/* Background decorations */}
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
              {/* Icon container with layered effect */}
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

              {/* Decorative dots */}
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
            {/* Encryption Notice */}
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
              const itemKey = message.id || `msg-${idx}`;

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
                    id={`msg-${message.id}`}
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
                  id={`msg-${message.id}`}
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
                    {/* Desktop: hover action bar */}
                    {!message.isSystem &&
                      message.status !== 'sending' &&
                      editingMessageId !== message.id && (
                        <div
                          className={`absolute top-0 ${isOwn ? 'right-full mr-1' : 'left-full ml-1'} hidden md:group-hover:flex items-center gap-0.5 z-10`}
                        >
                          {onReaction && (
                            <div className="relative">
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
                              {reactionPickerMsgId === message.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setReactionPickerMsgId(null)}
                                  />
                                  <div
                                    className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-8 z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-popover border border-border shadow-xl animate-in fade-in zoom-in-95 duration-150`}
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
                            </div>
                          )}
                          {message.type === 'text' && (
                            <button
                              onClick={() => handleCopy(message)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                              title={
                                copiedId === message.id ? t('common.copied') : t('common.copy')
                              }
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
                              onClick={() => setDeleteConfirmId(message.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-error hover:bg-error/10 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    {/* Mobile: long-press popup */}
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
                                  setDeleteConfirmId(message.id);
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
                    {message.type === 'image' && message.attachments?.[0]?.url ? (
                      <ChatImageContent
                        attachment={message.attachments[0]}
                        isOwn={isOwn}
                        status={message.status}
                        uploadProgress={message.uploadProgress}
                        onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
                        onPreview={setLightboxSrc}
                      />
                    ) : message.type === 'file' && message.attachments?.[0]?.url ? (
                      <ChatFileContent
                        attachment={message.attachments[0]}
                        isOwn={isOwn}
                        status={message.status}
                        uploadProgress={message.uploadProgress}
                        onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
                        formatFileSize={formatFileSize}
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
                        className={`relative px-3 py-2 rounded-2xl border-2 border-primary/60 bg-card shadow-lg ${
                          isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
                        }`}
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
                    ) : (
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
                    {/* Reactions display */}
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

            {/* Typing indicator */}
            <TypingIndicator users={typingUsers} />

            <div ref={messagesEndRef} />
          </VStack>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-card border-t border-border/40">
        {!isConnected && (
          <div className="flex items-center justify-center gap-2 py-1.5 mb-2 text-xs font-medium text-warning bg-warning/10 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            {t('chat.offlineHint')}
          </div>
        )}
        <HStack gap="xs" align="center">
          {onSendFile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={!isConnected}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isConnected}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-muted-foreground/60"
                aria-label={t('chat.attachFile')}
              >
                <Paperclip className="w-[18px] h-[18px]" />
              </button>
            </>
          )}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? t('chat.typeMessage') : t('chat.offlineHint')}
              enterKeyHint="send"
              disabled={!isConnected}
              className="w-full pl-4 pr-3 py-2.5 text-[14px] bg-muted/30 rounded-full border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/50 transition-colors disabled:opacity-50 disabled:cursor-default"
              data-testid="chat-message-input"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isConnected}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-primary transition-all duration-150 enabled:hover:bg-primary/10 enabled:active:scale-95 disabled:text-muted-foreground/30 disabled:cursor-default"
            data-testid="chat-send-btn"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        </HStack>
      </div>

      {/* Image lightbox — Radix Dialog so ESC/click only dismisses this layer, not the Sheet */}
      <DialogPrimitive.Root
        open={!!lightboxSrc}
        onOpenChange={open => !open && setLightboxSrc(null)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in duration-200" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-[200] flex items-center justify-center outline-none"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">Image preview</DialogPrimitive.Title>
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <a
                href={lightboxSrc || '#'}
                download
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label={t('common.download')}
              >
                <Download className="w-5 h-5" />
              </a>
              <DialogPrimitive.Close className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
            <img
              src={lightboxSrc || ''}
              alt="Preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={open => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chat.deleteMessageTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('chat.deleteMessageDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error text-white hover:bg-error/90"
              onClick={() => {
                if (deleteConfirmId && onDeleteMessage) {
                  onDeleteMessage(deleteConfirmId);
                }
                setDeleteConfirmId(null);
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
