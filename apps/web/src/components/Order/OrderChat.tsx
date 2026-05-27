'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Lock, Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';
import { ChatMessageList } from '@/components/Chat/ChatMessageList';
import { ChatComposer } from '@/components/Chat/ChatComposer';
import { ImageLightbox } from '@/components/ui/image-lightbox';
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
import type { UseOrderChatReturn, OrderChatQuickChip } from '@/hooks/useOrderChat';

export interface OrderChatParticipant {
  id: string;
  peerID: string;
  name: string;
  avatar?: string;
  role: 'buyer' | 'seller' | 'moderator';
  roleLabel: string;
  isSelf?: boolean;
}

export interface OrderChatProps extends UseOrderChatReturn {
  orderId: string;
  className?: string;
  /** Embedded in order detail — minimal chrome; order context lives in sidebar / compact strip */
  layout?: 'embedded' | 'standalone';
}

/**
 * Order-scoped chat panel — reuses main chat message list + composer (Matrix-backed).
 */
export const OrderChat: React.FC<OrderChatProps> = ({
  orderId,
  className = '',
  participants,
  messages,
  currentUserId,
  isEncrypted,
  isLoading,
  isConnected: _isConnected,
  composerReady,
  connectionStatusHint,
  matrixAvailable,
  unreadCount,
  typingUsers,
  memberNameMap,
  hasMoreMessages,
  isLoadingMore,
  quickChips,
  counterpartySubtitle,
  composerRef,
  onSendMessage,
  onSendFile,
  onTyping,
  onRetryMessage,
  onDeleteMessage,
  onLoadMore,
  roomId,
  layout = 'standalone',
}) => {
  const { t } = useI18n();
  const isEmbedded = layout === 'embedded';
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const canSend = composerReady;

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        return;
      }
      const lower = query.toLowerCase();
      const indices = messages
        .map((m, i) => (m.content?.toLowerCase().includes(lower) ? i : -1))
        .filter(i => i >= 0);
      setSearchResults(indices);
      setCurrentSearchIndex(indices.length > 0 ? 0 : -1);
    },
    [messages]
  );

  const jumpToSearchResult = useCallback(
    (direction: 'prev' | 'next') => {
      if (searchResults.length === 0) return;
      setCurrentSearchIndex(prev => {
        if (direction === 'next') return (prev + 1) % searchResults.length;
        return (prev - 1 + searchResults.length) % searchResults.length;
      });
    },
    [searchResults.length]
  );

  const handleQuickChip = useCallback(
    (chip: OrderChatQuickChip) => {
      if (!canSend) return;
      onSendMessage(chip.message);
    },
    [canSend, onSendMessage]
  );

  const encryptionLabel = matrixAvailable
    ? isEncrypted
      ? t('chat.encrypted')
      : t('order.chat.connectingSecure')
    : t('order.chat.chatUnavailable');

  const counterparty = useMemo(
    () => participants.find(participant => !participant.isSelf),
    [participants]
  );

  const showParticipantPills = useMemo(() => {
    if (participants.length === 0) return false;
    if (!isEmbedded) return true;
    const hasModerator = participants.some(participant => participant.role === 'moderator');
    const otherCount = participants.filter(participant => !participant.isSelf).length;
    return hasModerator || otherCount > 1;
  }, [isEmbedded, participants]);

  const isOpeningDiscussion = useMemo(
    () => matrixAvailable && !roomId && (connectionStatusHint === 'connecting' || isLoading),
    [matrixAvailable, roomId, connectionStatusHint, isLoading]
  );

  const emptyTitle = useMemo(() => {
    if (!matrixAvailable) return t('order.chat.chatUnavailable');
    if (isOpeningDiscussion) return t('order.chat.openingDiscussion');
    if (isEmbedded && counterparty) {
      return t('order.chat.emptyTitleEmbedded', { name: counterparty.name });
    }
    return t('order.chat.noDiscussion');
  }, [counterparty, isEmbedded, isOpeningDiscussion, matrixAvailable, t]);

  const emptyDescription = useMemo(() => {
    if (!matrixAvailable) return t('order.chat.chatUnavailableDesc');
    if (isOpeningDiscussion) return t('order.chat.connectingSecure');
    if (isEmbedded) return t('order.chat.emptyDescriptionEmbedded');
    return t('order.chat.startDiscussion');
  }, [isEmbedded, isOpeningDiscussion, matrixAvailable, t]);

  const quickChipRow =
    quickChips.length > 0 && matrixAvailable ? (
      <div className="shrink-0 px-3 py-2 border-t border-border/60 flex flex-wrap gap-2 bg-muted/20">
        {quickChips.map(chip => (
          <button
            key={chip.id}
            type="button"
            onClick={() => handleQuickChip(chip)}
            disabled={!canSend}
            className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-full bg-background hover:bg-primary/10 hover:text-primary border border-border/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chip.label}
          </button>
        ))}
      </div>
    ) : null;

  const searchBar = showSearch ? (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        type="search"
        value={searchQuery}
        onChange={e => handleSearch(e.target.value)}
        placeholder={t('chat.searchMessages')}
        className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
        aria-label={t('chat.searchMessages')}
      />
      {searchResults.length > 0 && (
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {currentSearchIndex + 1}/{searchResults.length}
        </span>
      )}
      <button
        type="button"
        onClick={() => jumpToSearchResult('prev')}
        disabled={searchResults.length === 0}
        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
        aria-label={t('common.back')}
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => jumpToSearchResult('next')}
        disabled={searchResults.length === 0}
        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
        aria-label={t('common.next')}
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
        aria-label={t('common.close')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  const headerActions = (
    <HStack gap="xs" className="shrink-0">
      {messages.length > 0 && (
        <button
          type="button"
          onClick={() => setShowSearch(s => !s)}
          className={`inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${
            isEmbedded ? 'min-h-[36px] min-w-[36px]' : 'min-h-[44px] min-w-[44px]'
          }`}
          aria-label={t('chat.searchMessages')}
          aria-pressed={showSearch}
        >
          <Search className="w-4 h-4" />
        </button>
      )}
      <div
        className={`flex items-center gap-1 text-xs ${
          matrixAvailable && isEncrypted ? 'text-primary' : 'text-muted-foreground'
        }`}
        title={encryptionLabel}
      >
        <Lock className="w-3.5 h-3.5" aria-hidden />
        <span className={isEmbedded ? 'inline' : 'hidden sm:inline'}>{encryptionLabel}</span>
      </div>
    </HStack>
  );

  return (
    <div
      className={`flex flex-col overflow-hidden ${
        isEmbedded ? 'bg-background' : 'bg-card border border-border/60 rounded-xl'
      } ${className}`}
      data-testid="order-chat-panel"
      data-layout={layout}
    >
      {isEmbedded ? (
        <div className="shrink-0 px-3 py-2 border-b border-border/60 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-error text-white text-xs rounded-full tabular-nums">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          {headerActions}
        </div>
      ) : (
        <div className="shrink-0 p-3 sm:p-4 border-b border-border">
          <HStack justify="between" align="start" className="gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {t('order.chat.discussion')}
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-error text-white text-xs rounded-full tabular-nums">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </h3>
              {counterpartySubtitle ? (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {t('order.chat.orderRef', { orderId: orderId.slice(0, 8) })} ·{' '}
                  {counterpartySubtitle}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('order.chat.orderRef', { orderId: orderId.slice(0, 8) })}
                </p>
              )}
            </div>
            {headerActions}
          </HStack>

          {showParticipantPills && (
            <HStack gap="sm" className="mt-3 flex-wrap">
              {participants.map(participant => (
                <div
                  key={participant.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                    participant.isSelf
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted border-border/60 text-foreground'
                  }`}
                >
                  <span className="font-medium truncate max-w-[140px]">{participant.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {participant.isSelf ? t('order.chat.you') : participant.roleLabel}
                  </span>
                </div>
              ))}
            </HStack>
          )}
        </div>
      )}

      {searchBar}

      {isEmbedded && showParticipantPills && (
        <div className="shrink-0 px-3 py-2 border-b border-border/60">
          <HStack gap="sm" className="flex-wrap">
            {participants.map(participant => (
              <div
                key={participant.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                  participant.isSelf
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted border-border/60 text-foreground'
                }`}
              >
                <span className="font-medium truncate max-w-[140px]">{participant.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {participant.isSelf ? t('order.chat.you') : participant.roleLabel}
                </span>
              </div>
            ))}
          </HStack>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatMessageList
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoading}
          isEncrypted={isEncrypted && matrixAvailable}
          typingUsers={typingUsers}
          memberNameMap={memberNameMap}
          onRetryMessage={onRetryMessage}
          onDeleteMessage={onDeleteMessage}
          onLoadMore={onLoadMore}
          hasMoreMessages={hasMoreMessages}
          isLoadingMore={isLoadingMore}
          searchQuery={showSearch ? searchQuery : ''}
          searchResults={searchResults}
          currentSearchIndex={currentSearchIndex}
          onLightbox={setLightboxSrc}
          onDeleteConfirm={setDeleteConfirmId}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>

      {quickChipRow}

      <div className="shrink-0">
        <ChatComposer
          isConnected={canSend}
          statusHint={connectionStatusHint}
          onSendMessage={onSendMessage}
          onSendFile={onSendFile}
          onTyping={onTyping}
          inputRef={composerRef}
        />
      </div>

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

      <ImageLightbox
        imageUrls={lightboxSrc ? [lightboxSrc] : []}
        open={!!lightboxSrc}
        selectedIndex={0}
        onSelectIndex={() => {}}
        onOpenChange={open => {
          if (!open) setLightboxSrc(null);
        }}
        altPrefix={t('order.chat.imageAltPrefix')}
        ariaLabel={t('order.chat.imagePreview')}
        showThumbnails={false}
        showCount={false}
        downloadUrl={lightboxSrc || undefined}
        className="z-[200]"
        testIdPrefix="order-chat-image-preview"
      />
    </div>
  );
};

export default OrderChat;
