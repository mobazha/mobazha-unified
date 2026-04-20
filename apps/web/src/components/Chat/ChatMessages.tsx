'use client';

import React, { useState, useMemo, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { HStack } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Search, ChevronUp, ChevronDown, X, Download } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { usePlatform } from '@mobazha/ui/hooks';
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
import { cleanDisplayName } from './ChatMediaContent';
import { ChatMessageList } from './ChatMessageList';
import { ChatComposer } from './ChatComposer';

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
  roomRawMxcAvatarUrl?: string;
  isEncrypted?: boolean;
  isDirect?: boolean;
  isVerified?: boolean;
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  typingUsers?: string[];
  memberNameMap?: Record<string, string>;
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

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  roomName,
  roomAvatar,
  roomRawMxcAvatarUrl,
  isEncrypted = false,
  isDirect = false,
  isVerified = false,
  messages,
  currentUserId,
  isLoading = false,
  typingUsers = [],
  memberNameMap,
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
  const { isEmbeddedApp } = usePlatform();
  const displayName = useMemo(() => cleanDisplayName(roomName), [roomName]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [showSearch, setShowSearch] = useState(false);

  // Dialog state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 p-4 bg-card/80 backdrop-blur-sm border-b border-border/50 shadow-sm"
        data-testid="chat-room-header"
      >
        {onBack && !isEmbeddedApp && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-surface-hover rounded-lg transition-colors"
            data-testid="chat-room-back-btn"
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

        <button
          onClick={onRoomSettings}
          className="hover:opacity-80 transition-opacity"
          data-testid="chat-room-avatar-btn"
        >
          <Avatar src={roomAvatar} rawMxcUrl={roomRawMxcAvatarUrl} name={displayName} size="md" />
        </button>

        <div className="flex-1 min-w-0">
          <HStack gap="sm" align="center">
            <button
              onClick={onRoomSettings}
              className="hover:opacity-80 transition-opacity"
              data-testid="chat-room-title-btn"
            >
              <h3
                className="font-semibold text-[15px] text-foreground truncate"
                data-testid="chat-room-title"
              >
                {displayName}
              </h3>
            </button>
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
              <svg
                className="w-3.5 h-3.5 text-primary flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-label={t('chat.encrypted')}
              >
                <title>{t('chat.encrypted')}</title>
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </HStack>
          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
            {isDirect ? t('chat.directMessage') : t('chat.groupChat')}
            {isEncrypted && <span className="text-primary/70"> · {t('chat.encrypted')}</span>}
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
            data-testid="chat-room-settings-btn"
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

      {/* Search bar */}
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
      <ChatMessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoading}
        isEncrypted={isEncrypted}
        typingUsers={typingUsers}
        memberNameMap={memberNameMap}
        onRetryMessage={onRetryMessage}
        onDeleteMessage={onDeleteMessage}
        onEditMessage={onEditMessage}
        onReaction={onReaction}
        onLoadMore={onLoadMore}
        hasMoreMessages={hasMoreMessages}
        isLoadingMore={isLoadingMore}
        onAvatarClick={onAvatarClick}
        searchQuery={searchQuery}
        searchResults={searchResults}
        currentSearchIndex={currentSearchIndex}
        onLightbox={setLightboxSrc}
        onDeleteConfirm={setDeleteConfirmId}
      />

      {/* Input */}
      <ChatComposer
        isConnected={isConnected}
        onSendMessage={onSendMessage}
        onSendFile={onSendFile}
        onTyping={onTyping}
      />

      {/* Image lightbox */}
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

      {/* Delete confirmation */}
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
