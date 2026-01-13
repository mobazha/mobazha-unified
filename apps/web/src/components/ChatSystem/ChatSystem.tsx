'use client';

import React, { useCallback } from 'react';
import { ChatDrawer } from '@/components/ChatDrawer';
import {
  matrixClient,
  useMatrixInit,
  useUserStore,
  useChatStore,
  isMatrixEnabled,
} from '@mobazha/core';

/**
 * ChatSystem 组件
 * 整合聊天浮动按钮和侧边抽屉
 * 放在全局 layout 中使用
 */
export const ChatSystem: React.FC = () => {
  const { isAuthenticated, profile } = useUserStore();

  // 获取当前用户 ID：优先使用 Matrix 配置，否则从 peerID 构造
  const peerID = profile?.peerID;
  const currentUserId = (() => {
    // 从 matrixClient 获取当前用户 ID
    const userId = matrixClient.getUserId();
    if (userId) {
      return userId;
    }
    // 回退：从 peerID 构造
    if (peerID) {
      return `@peer_${peerID.toLowerCase()}:matrix.mobazha.org`;
    }
    return '';
  })();

  // 初始化 Matrix 客户端（hook 内部会从 userStore 获取 peerID）
  useMatrixInit({
    enabled: isAuthenticated,
    autoConnect: true,
    retryInterval: 5000,
    maxRetries: 5,
  });

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
      // 刷新房间列表
      const rooms = await matrixClient.getRooms();
      useChatStore.getState().setRooms(rooms);
      useChatStore.getState().setCurrentRoom(roomId);
    } catch (error) {
      console.error('[ChatSystem] Failed to accept invite:', error);
    }
  }, []);

  // 拒绝邀请（通过离开房间）
  const handleRejectInvite = useCallback(async (roomId: string) => {
    try {
      await matrixClient.leaveRoom(roomId);
      // 刷新房间列表
      const rooms = await matrixClient.getRooms();
      useChatStore.getState().setRooms(rooms);
    } catch (error) {
      console.error('[ChatSystem] Failed to reject invite:', error);
    }
  }, []);

  // 新建聊天
  const handleNewChat = useCallback(() => {
    // TODO: 打开新建聊天对话框
    console.warn('[ChatSystem] New chat dialog not implemented yet');
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
    </>
  );
};

export default ChatSystem;
