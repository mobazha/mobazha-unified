'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChatList } from '@/components/Chat/ChatList';
import { ChatMessages } from '@/components/Chat/ChatMessages';
import { NewChatDialog } from '@/components/ChatDrawer/NewChatDialog';
import { RoomSettingsPanel } from '@/components/ChatDrawer/RoomSettingsPanel';
import { VerificationDialog } from '@/components/ChatDrawer/VerificationDialog';
import { UserInfoCard } from '@/components/Chat/UserInfoCard';
import { Button } from '@/components/ui/button';
import { useChatViewLogic } from '@/components/ChatDrawer/hooks/useChatViewLogic';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';
import { MobilePageHeader } from '@/components/MobilePageHeader';
import { matrixClient, useChatStore, useUserStore, isMatrixEnabled } from '@mobazha/core';

/**
 * Mobile-first full-page chat view.
 *
 * Replaces the Sheet-based ChatDrawer on mobile / TMA to avoid
 * double-header chrome and provide a native-feeling experience.
 * The Telegram BackButton is wired to navigate back from room → list → previous page.
 */
export default function ChatPage() {
  const { isAuthenticated } = useUserStore();
  const matrixConnected = useChatStore(state => state.isConnected);
  // Re-derive userId when connection state changes (matrixConnected is the signal).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentUserId = useMemo(() => matrixClient.getUserId() || '', [matrixConnected]);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const handleNewChat = useCallback(() => setNewChatOpen(true), []);
  const handleShareChatId = useCallback(() => {
    /* TODO */
  }, []);

  const handleSendMessage = useCallback(async (roomId: string, content: string) => {
    try {
      await matrixClient.sendMessage(roomId, content);
    } catch (error) {
      console.error('[ChatPage] Failed to send message:', error);
    }
  }, []);

  const logic = useChatViewLogic({
    currentUserId,
    onSendMessage: handleSendMessage,
    onNewChat: handleNewChat,
    onShareChatId: handleShareChatId,
  });

  const {
    t,
    effectiveCurrentUserId,
    currentRoomId,
    currentRoom,
    currentInvite,
    isConnected,
    isInitializing,
    searchQuery,
    loadingMessages,
    hasMoreMessages,
    displayRooms,
    displayInvites,
    currentMessages,
    currentTypingUsers,
    memberNameMap,
    currentRoomPresentation,
    isCreatingRoom,
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
    handleSendMessage: handleSend,
    handleSendFile,
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
  } = logic;

  // ---- TG BackButton: override when viewing a room ----
  const { isAvailable: tgAvailable, backButton: tgBackButton } = useTGMiniApp();

  useEffect(() => {
    if (!tgAvailable || !tgBackButton) return;

    if (currentRoomId || currentInvite) {
      const goBackToList = () => handleBack();
      tgBackButton.show();
      tgBackButton.onClick(goBackToList);
      return () => {
        tgBackButton.offClick(goBackToList);
      };
    }

    // List view — hide BackButton since /chat is a root tab;
    // TGBackButtonManager won't re-run because pathname stays "/chat".
    tgBackButton.hide();
  }, [tgAvailable, tgBackButton, currentRoomId, currentInvite, handleBack]);

  // Don't render if Matrix is off or user is not logged in
  if (!isMatrixEnabled() || !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center">
        <p className="text-muted-foreground text-sm">{t('chat.loginRequired')}</p>
      </div>
    );
  }

  // ---- Creating room spinner ----
  if (isCreatingRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <span className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{t('chat.openingConversation')}</p>
      </div>
    );
  }

  // ---- Invite view ----
  if (currentInvite) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 p-3 border-b border-border/30">
          <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <span className="font-semibold text-foreground text-sm">{t('chat.inviteConfirm')}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
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
          <h3 className="text-lg font-bold mb-1">{currentInvite.name}</h3>
          {currentInvite.inviter && (
            <p className="text-muted-foreground mb-6 text-sm">
              {t('chat.invitedBy', { name: currentInvite.inviter })}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRejectInvite(currentInvite.roomId)}
              className="rounded-xl"
            >
              {t('common.decline')}
            </Button>
            <Button
              size="sm"
              onClick={() => handleAcceptInvite(currentInvite.roomId)}
              className="rounded-xl"
            >
              {t('common.accept')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Room message view ----
  if (currentRoom && currentRoomId) {
    return (
      <>
        <div className="flex flex-col h-[calc(100vh-4rem)]" data-testid="chat-page-messages">
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
            onSendMessage={handleSend}
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
          />
        </div>
        {showRoomSettings && (
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
            isOpen
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
      </>
    );
  }

  // ---- Room list (default) ----
  const showPageHeader = !tgAvailable;
  return (
    <>
      {showPageHeader && <MobilePageHeader title={t('chat.title')} />}
      <div
        className={`flex flex-col ${showPageHeader ? 'h-[calc(100vh-7rem)]' : 'h-[calc(100vh-4rem)]'}`}
        data-testid="chat-page-list"
      >
        {/* Minimal status bar — only show abnormal states */}
        {!isConnected && !isInitializing && (
          <div className="flex items-center justify-center gap-1.5 py-1.5 bg-warning/10 text-warning text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            {t('chat.offline')}
          </div>
        )}
        {isInitializing && (
          <div className="flex items-center justify-center gap-1.5 py-1.5 bg-info/10 text-info text-xs font-medium">
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
          </div>
        )}

        <div className="flex-1 overflow-hidden">
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
            onNewChat={handleNewChat}
            onShareChatId={handleShareChatId}
            onAcceptInvite={handleAcceptInvite}
            onRejectInvite={handleRejectInvite}
          />
        </div>
      </div>

      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} />
    </>
  );
}
