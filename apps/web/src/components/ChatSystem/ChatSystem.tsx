'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ChatDrawer } from '@/components/ChatDrawer';
import { NewChatDialog } from '@/components/ChatDrawer/NewChatDialog';
import { matrixClient, useUserStore, useChatStore, isMatrixEnabled } from '@mobazha/core';

/**
 * ChatSystem 组件
 * 整合聊天浮动按钮和侧边抽屉
 * 放在全局 layout 中使用
 */
export const ChatSystem: React.FC = () => {
  const { isAuthenticated } = useUserStore();
  const matrixConnected = useChatStore(state => state.isConnected);

  // 当前用户 ID 必须以 Matrix 运行态为准，避免本地推导导致身份错位。
  const currentUserId = useMemo(() => matrixClient.getUserId() || '', [matrixConnected]);

  // 发送消息
  const handleSendMessage = useCallback(async (roomId: string, content: string) => {
    try {
      await matrixClient.sendMessage(roomId, content);
    } catch (error) {
      console.error('[ChatSystem] Failed to send message:', error);
    }
  }, []);

  // 接受邀请（通过加入房间）
  const handleAcceptInvite = useCallback(async (roomId: string) => {
    try {
      await matrixClient.joinRoom(roomId);
      const allRooms = await matrixClient.getRooms();
      const store = useChatStore.getState();
      store.setRooms(allRooms.filter(r => r.membership !== 'invite'));
      store.setInvites(allRooms.filter(r => r.membership === 'invite'));
      store.setCurrentRoom(roomId);
    } catch (error) {
      console.error('[ChatSystem] Failed to accept invite:', error);
    }
  }, []);

  // 拒绝邀请（通过离开房间）
  const handleRejectInvite = useCallback(async (roomId: string) => {
    try {
      await matrixClient.leaveRoom(roomId);
      const allRooms = await matrixClient.getRooms();
      const store = useChatStore.getState();
      store.setRooms(allRooms.filter(r => r.membership !== 'invite'));
      store.setInvites(allRooms.filter(r => r.membership === 'invite'));
    } catch (error) {
      console.error('[ChatSystem] Failed to reject invite:', error);
    }
  }, []);

  // 新建聊天
  const [newChatOpen, setNewChatOpen] = useState(false);
  const handleNewChat = useCallback(() => {
    setNewChatOpen(true);
  }, []);

  // 分享聊天 ID
  const handleShareChatId = useCallback(() => {
    // TODO: 打开分享对话框
    console.warn('[ChatSystem] Share chat ID dialog not implemented yet');
  }, []);

  // Check if Matrix is enabled globally
  const matrixEnabled = isMatrixEnabled();

  // 只在 Matrix 启用且用户登录后渲染
  if (!matrixEnabled || !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* 聊天侧边抽屉 */}
      <ChatDrawer
        currentUserId={currentUserId}
        onSendMessage={handleSendMessage}
        onAcceptInvite={handleAcceptInvite}
        onRejectInvite={handleRejectInvite}
        onNewChat={handleNewChat}
        onShareChatId={handleShareChatId}
      />
      {/* 新建聊天对话框 */}
      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} />
    </>
  );
};

export default ChatSystem;
