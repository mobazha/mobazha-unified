'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChatList } from '@/components/Chat/ChatList';
import { ChatMessages } from '@/components/Chat/ChatMessages';
import { ChatInboxTabs } from '@/components/Chat/ChatInboxTabs';
import { useChatStore, matrixClient, buildOrderDetailHref } from '@mobazha/core';
import { UserInfoCard } from '@/components/Chat/UserInfoCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VerificationDialog } from './VerificationDialog';
import { RoomSettingsPanel } from './RoomSettingsPanel';
import { useChatViewLogic, type UseChatViewLogicParams } from './hooks/useChatViewLogic';
import { getStatusLabel } from '@/components/Order/cards/orderProgressUtils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ChatDrawerProps = UseChatViewLogicParams;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChatDrawer: React.FC<ChatDrawerProps> = props => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const logic = useChatViewLogic(props);
  const {
    t,
    effectiveCurrentUserId,
    drawerOpen,
    closeDrawer,
    currentRoomId,
    currentRoom,
    currentInvite,
    isConnected,
    isInitializing,
    searchQuery,
    totalUnread,
    loadingMessages,
    hasMoreMessages,
    displayRooms,
    displayInvites,
    currentMessages,
    currentTypingUsers,
    memberNameMap,
    currentRoomPresentation,
    currentOrderThread,
    isCreatingRoom,
    isDragging,
    showRoomSettings,
    userCard,
    verificationOpen,
    verificationPhase,
    verificationUserId,
    verificationEmoji,
    verificationLoading,
    setSearchQuery,
    handleRoomSelect,
    handleInviteSelect,
    handleBack,
    handleSendMessage,
    handleSendFile,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleRetryMessage,
    handleDeleteMessage,
    handleEditMessage,
    handleReaction,
    handleLoadMore,
    handleAcceptInvite,
    handleRejectInvite,
    handleRoomSettings,
    handleCloseRoomSettings,
    handleLeaveRoom,
    handleAvatarClick,
    handleCloseUserCard,
    handleVerificationAccept,
    handleVerificationConfirm,
    handleVerificationCancel,
    resetVerification,
    onNewChat,
    onShareChatId,
  } = logic;

  const drawerExpanded = useChatStore(state => state.drawerExpanded);
  const setDrawerExpanded = useChatStore(state => state.setDrawerExpanded);
  const toggleExpand = useCallback(
    () => setDrawerExpanded(!drawerExpanded),
    [drawerExpanded, setDrawerExpanded]
  );

  const orderThreadHeader = useMemo(() => {
    if (!currentOrderThread) return undefined;
    const isOnSameOrderDiscussion =
      pathname === `/orders/${currentOrderThread.orderId}` &&
      searchParams.get('tab') === 'discussion';
    return {
      orderId: currentOrderThread.orderId,
      productTitle: currentOrderThread.productTitle || currentRoomPresentation?.title,
      statusLabel: currentOrderThread.orderState
        ? getStatusLabel(currentOrderThread.orderState, t, currentOrderThread.contractType)
        : undefined,
      counterpartLabel: currentOrderThread.counterpartName,
      onViewOrder: isOnSameOrderDiscussion
        ? undefined
        : () => {
            closeDrawer();
            router.push(
              buildOrderDetailHref(
                currentOrderThread.orderId,
                currentOrderThread.viewType,
                'discussion'
              )
            );
          },
    };
  }, [
    closeDrawer,
    currentOrderThread,
    currentRoomPresentation?.title,
    pathname,
    router,
    searchParams,
    t,
  ]);

  // ---- Render helpers ----
  const drawerWidth = drawerExpanded ? 'w-full md:w-[600px]' : 'w-full md:w-[400px]';

  const renderView = () => {
    if (isCreatingRoom) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <span className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t('chat.openingConversation')}</p>
        </div>
      );
    }

    if (currentInvite) {
      return (
        <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/10">
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
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

    if (currentRoom && currentRoomId) {
      return (
        <ChatMessages
          roomId={currentRoomId}
          roomName={currentRoomPresentation?.title || t('chat.defaultRoom')}
          roomAvatar={currentRoomPresentation?.avatarUrl}
          roomRawMxcAvatarUrl={currentRoomPresentation?.rawMxcAvatarUrl}
          isEncrypted={currentRoom.isEncrypted}
          isDirect={currentRoom.isDirect}
          isVerified={false}
          messages={currentMessages}
          currentUserId={effectiveCurrentUserId}
          isLoading={false}
          typingUsers={currentTypingUsers}
          memberNameMap={memberNameMap}
          onSendMessage={handleSendMessage}
          onSendFile={file => handleSendFile(file)}
          onTyping={isTyping => matrixClient.sendTyping(currentRoomId, isTyping)}
          onRetryMessage={handleRetryMessage}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          onReaction={handleReaction}
          isConnected={isConnected}
          onLoadMore={handleLoadMore}
          hasMoreMessages={hasMoreMessages[currentRoomId] ?? true}
          isLoadingMore={loadingMessages[currentRoomId] ?? false}
          onBack={handleBack}
          onRoomSettings={handleRoomSettings}
          onAvatarClick={handleAvatarClick}
          orderThread={orderThreadHeader}
        />
      );
    }

    return (
      <div className="h-full flex flex-col">
        <ChatInboxTabs />
        <div className="flex-1 min-h-0 overflow-hidden">
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
            onInviteSelect={handleInviteSelect}
            onNewChat={onNewChat}
            onShareChatId={onShareChatId}
            onAcceptInvite={handleAcceptInvite}
            onRejectInvite={handleRejectInvite}
          />
        </div>
      </div>
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
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-2 mt-0.5">
                  {totalUnread > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-full shadow-sm shadow-primary/30">
                      {t('chat.unreadBadge', {
                        count: totalUnread > 99 ? '99+' : String(totalUnread),
                      })}
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
        <div
          className="flex-1 overflow-hidden relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {renderView()}
          {isDragging && currentRoomId && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-[2px] border-2 border-dashed border-primary/40 rounded-lg m-2 transition-all duration-200">
              <div className="flex flex-col items-center gap-3 text-primary">
                <svg
                  className="w-12 h-12 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm font-medium">{t('chat.dropFilesHere')}</span>
              </div>
            </div>
          )}
        </div>

        {showRoomSettings && currentRoom && (
          <RoomSettingsPanel
            room={currentRoom}
            currentUserId={effectiveCurrentUserId}
            onClose={handleCloseRoomSettings}
            onMemberClick={handleAvatarClick}
            onLeaveRoom={handleLeaveRoom}
            t={t}
          />
        )}
        {userCard && (
          <UserInfoCard
            user={userCard}
            isOpen={true}
            onClose={handleCloseUserCard}
            onViewStore={peerID => {
              window.open(`/store/${peerID}`, '_blank');
              handleCloseUserCard();
            }}
            onStartChat={() => handleCloseUserCard()}
            onBlock={async userId => {
              await matrixClient.blockUser(userId);
            }}
            onUnblock={async userId => {
              await matrixClient.unblockUser(userId);
            }}
          />
        )}
      </SheetContent>

      <VerificationDialog
        open={verificationOpen}
        phase={verificationPhase}
        otherUserId={verificationUserId}
        sasEmoji={verificationEmoji}
        loading={verificationLoading}
        onAccept={handleVerificationAccept}
        onConfirm={handleVerificationConfirm}
        onCancel={handleVerificationCancel}
        onClose={resetVerification}
      />
    </Sheet>
  );
};

export default ChatDrawer;
