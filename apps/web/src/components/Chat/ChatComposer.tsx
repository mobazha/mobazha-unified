'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HStack } from '@/components/layouts';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useI18n } from '@mobazha/core';

const INPUT_EMOJI_GRID = [
  ['😀', '😊', '😂', '🥲', '😍', '🤩', '😘', '🤗'],
  ['😎', '🤔', '😏', '🙄', '😴', '🤯', '🥳', '😇'],
  ['👍', '👋', '🙏', '💪', '🤝', '✌️', '👏', '🫡'],
  ['❤️', '🔥', '⭐', '💰', '📦', '🎉', '✅', '💯'],
];

export interface ChatComposerProps {
  isConnected: boolean;
  onSendMessage: (content: string) => void;
  onSendFile?: (file: File) => void;
  onTyping?: (isTyping: boolean) => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  isConnected,
  onSendMessage,
  onSendFile,
  onTyping,
}) => {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping?.(false);
    };
  }, [onTyping]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as HTMLElement)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmojiPicker]);

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

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping?.(false);
    }
  }, [inputValue, onSendMessage, onTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onSendFile) {
        onSendFile(file);
      }
      e.target.value = '';
    },
    [onSendFile]
  );

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      const input = inputRef.current;
      if (input) {
        const start = input.selectionStart ?? inputValue.length;
        const end = input.selectionEnd ?? start;
        const next = inputValue.slice(0, start) + emoji + inputValue.slice(end);
        setInputValue(next);
        requestAnimationFrame(() => {
          const pos = start + emoji.length;
          input.setSelectionRange(pos, pos);
          input.focus();
        });
      } else {
        setInputValue(prev => prev + emoji);
      }
      setShowEmojiPicker(false);
    },
    [inputValue]
  );

  return (
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
            className="w-full pl-4 pr-10 py-2.5 text-[14px] bg-muted/30 rounded-full border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/50 transition-colors disabled:opacity-50 disabled:cursor-default"
            data-testid="chat-message-input"
          />
          <div ref={emojiPickerRef} className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(prev => !prev)}
              disabled={!isConnected}
              className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
              aria-label="Emoji"
            >
              <Smile className="w-[17px] h-[17px]" />
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 bottom-9 z-50 p-2 rounded-xl bg-popover border border-border shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150">
                {INPUT_EMOJI_GRID.map((row, ri) => (
                  <div key={ri} className="flex gap-0.5">
                    {row.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-lg hover:bg-muted/60 active:scale-90 transition-all"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
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
  );
};
