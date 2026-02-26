'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

export interface OrderChatParticipant {
  id: string;
  peerID: string;
  name: string;
  avatar?: string;
  role: 'buyer' | 'seller' | 'moderator';
  isOnline?: boolean;
}

export interface OrderChatMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface OrderChatProps {
  orderId: string;
  roomId?: string;
  participants: OrderChatParticipant[];
  messages: OrderChatMessage[];
  currentUserId: string;
  isEncrypted?: boolean;
  isLoading?: boolean;
  unreadCount?: number;
  onSendMessage: (content: string) => Promise<void>;
  onCreateRoom?: () => Promise<string>;
  className?: string;
}

/**
 * 订单聊天组件
 * 用于订单详情页中买卖双方（及仲裁员）的沟通
 */
export const OrderChat: React.FC<OrderChatProps> = ({
  orderId,
  roomId,
  participants,
  messages,
  currentUserId,
  isEncrypted = true,
  isLoading = false,
  unreadCount = 0,
  onSendMessage,
  onCreateRoom,
  className = '',
}) => {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;

    // If no room exists, create one first
    if (!roomId && onCreateRoom) {
      try {
        await onCreateRoom();
      } catch (err) {
        console.error('Failed to create chat room:', err);
        return;
      }
    }

    setIsSending(true);
    try {
      await onSendMessage(inputValue.trim());
      setInputValue('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, roomId, onCreateRoom, onSendMessage]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getParticipant = (id: string) => {
    return participants.find(p => p.id === id || p.peerID === id);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'seller':
        return 'text-primary';
      case 'buyer':
        return 'text-info';
      case 'moderator':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  // Empty state - no room yet
  if (!roomId && !messages.length) {
    return (
      <Card className={`p-6 ${className}`}>
        <VStack gap="md" align="center" className="py-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground"
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
          <div className="text-center">
            <h3 className="text-sm font-medium text-foreground mb-1">
              {t('order.chat.noDiscussion')}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              {t('order.chat.startDiscussion')}
            </p>
          </div>
          {onCreateRoom && (
            <Button onClick={onCreateRoom} className="mt-2">
              {t('order.chat.startChat')}
            </Button>
          )}
        </VStack>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border">
        <HStack justify="between" align="center">
          <div>
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              {t('order.chat.discussion')}
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-error text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('order.chat.orderNumber', { orderId: orderId.slice(0, 8) })}
            </p>
          </div>
          {isEncrypted && (
            <div className="flex items-center gap-1 text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="text-xs">{t('chat.encrypted')}</span>
            </div>
          )}
        </HStack>

        {/* Participants */}
        <HStack gap="sm" className="mt-3 flex-wrap">
          {participants.map(participant => (
            <div
              key={participant.id}
              className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full"
            >
              <div
                className={`w-2 h-2 rounded-full ${participant.isOnline ? 'bg-primary' : 'bg-muted-foreground/50'}`}
              />
              <span className={`text-xs ${getRoleColor(participant.role)}`}>
                {participant.name}
              </span>
            </div>
          ))}
        </HStack>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 max-h-80 min-h-[200px]">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t('order.chat.noMessages')}</p>
          </div>
        ) : (
          messages.map(message => {
            const sender = getParticipant(message.senderId);
            const isOwnMessage = message.senderId === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwnMessage ? 'order-2' : ''}`}>
                  {/* Sender name (for others' messages) */}
                  {!isOwnMessage && sender && (
                    <p className={`text-xs mb-0.5 ${getRoleColor(sender.role)}`}>{sender.name}</p>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  <p
                    className={`text-xs text-muted-foreground mt-0.5 ${isOwnMessage ? 'text-right' : ''}`}
                  >
                    {formatTime(message.timestamp)}
                    {isOwnMessage && message.status && (
                      <span className="ml-1">
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && <span className="text-primary">✓✓</span>}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-border">
        <HStack gap="sm">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('chat.typeMessage')}
            className="flex-1 px-3 py-2 bg-muted rounded-full text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSending}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="rounded-full px-4"
          >
            {isSending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </Button>
        </HStack>
      </div>
    </Card>
  );
};

export default OrderChat;
