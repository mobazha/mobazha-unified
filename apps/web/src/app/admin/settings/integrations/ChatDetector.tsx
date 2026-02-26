'use client';

import React, { useState } from 'react';
import { useI18n, notificationChannelsApi } from '@mobazha/core';
import type { DetectedChat } from '@mobazha/core';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface ChatDetectorProps {
  botToken: string;
  onSelectChat: (chatId: string) => void;
}

export function ChatDetector({ botToken, onSelectChat }: ChatDetectorProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [detecting, setDetecting] = useState(false);
  const [detectedChats, setDetectedChats] = useState<DetectedChat[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  async function handleDetect() {
    if (!botToken) return;
    setDetecting(true);
    setDetectedChats([]);
    try {
      const chats = await notificationChannelsApi.detectTelegramChats(botToken);
      if (chats.length === 0) {
        toast({ title: t('admin.integrations.detectNoChats') });
      } else {
        toast({ title: t('admin.integrations.detectSuccess', { count: String(chats.length) }) });
        setDetectedChats(chats);
        setShowPicker(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast({
        variant: 'destructive',
        title: t('admin.integrations.detectFailed'),
        description: message,
      });
    } finally {
      setDetecting(false);
    }
  }

  function handleSelect(chat: DetectedChat) {
    onSelectChat(chat.id);
    setShowPicker(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDetect}
        disabled={detecting || !botToken}
        title={t('admin.integrations.detectChatDesc')}
        className="shrink-0"
      >
        <Search className="w-4 h-4 mr-1" />
        {detecting ? t('admin.integrations.detecting') : t('admin.integrations.detectChat')}
      </Button>

      {showPicker && detectedChats.length > 0 && (
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t('admin.integrations.detectSelectChat')}
          </p>
          {detectedChats.map(chat => (
            <button
              key={chat.id}
              type="button"
              onClick={() => handleSelect(chat)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left"
            >
              <span className="font-medium truncate">{chat.title}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">{chat.id}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
