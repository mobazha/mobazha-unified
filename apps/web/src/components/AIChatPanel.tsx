'use client';

import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAIChatStore } from '@mobazha/core/stores';
import { useI18n } from '@mobazha/core';
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Wrench,
  ChevronDown,
  Trash2,
  Plus,
  Square,
} from 'lucide-react';
import type { ChatMessage, ToolCallInfo } from '@mobazha/core/services/ai';

const ReactMarkdown = lazy(() => import('react-markdown'));

function ToolCallBadge({ tool }: { tool: ToolCallInfo }) {
  const [expanded, setExpanded] = useState(false);
  const statusIcon =
    tool.status === 'executing' ? (
      <Loader2 className="w-3 h-3 animate-spin" />
    ) : tool.status === 'error' ? (
      <span className="text-destructive">!</span>
    ) : (
      <span className="text-primary">✓</span>
    );

  return (
    <div className="my-1 rounded-md border border-border bg-muted/50 text-xs">
      <button
        className="flex items-center gap-1.5 px-2 py-1 w-full text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={tool.name}
      >
        <Wrench className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">{tool.name}</span>
        {statusIcon}
        <ChevronDown
          className={`w-3 h-3 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="px-2 pb-1.5 space-y-1">
          {tool.args != null && (
            <pre className="text-[10px] text-muted-foreground overflow-x-auto max-h-24 overflow-y-auto">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          )}
          {tool.result != null && (
            <pre className="text-[10px] text-muted-foreground overflow-x-auto max-h-24 overflow-y-auto border-t border-border pt-1">
              {typeof tool.result === 'string'
                ? (tool.result as string).slice(0, 500)
                : JSON.stringify(tool.result, null, 2).slice(0, 500)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <Suspense fallback={<p className="whitespace-pre-wrap break-words">{content}</p>}>
      <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:text-xs [&_pre]:overflow-x-auto [&_code]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </Suspense>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        {msg.content &&
          (isUser ? (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          ) : (
            <MarkdownContent content={msg.content} />
          ))}
        {msg.toolCalls?.map(tc => (
          <ToolCallBadge key={tc.id} tool={tc} />
        ))}
      </div>
    </div>
  );
}

function SessionList({
  onSelect,
  onClose,
}: {
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { sessions, loadSessions, deleteSession, newChat } = useAIChatStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">{t('ai.history')}</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={() => {
          newChat();
          onClose();
        }}
        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted border-b border-border"
      >
        <Plus className="w-4 h-4" />
        {t('ai.newChat')}
      </button>
      <div className="flex-1 overflow-y-auto">
        {sessions.map(s => (
          <div
            key={s.id}
            className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer group"
          >
            <button
              className="flex-1 text-left text-sm truncate"
              onClick={() => {
                onSelect(s.id);
                onClose();
              }}
            >
              {s.title || t('ai.untitled')}
            </button>
            <button
              className="p-1 opacity-0 group-hover:opacity-100 hover:text-destructive"
              aria-label={t('common.delete')}
              onClick={e => {
                e.stopPropagation();
                deleteSession(s.id);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-4">
            {t('ai.noConversations')}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIChatPanel() {
  const {
    isOpen,
    toggle,
    messages,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    loadSession,
    clearError,
  } = useAIChatStore();

  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, [cancelStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage(text);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label={t('ai.openAssistant')}
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[400px] sm:h-[600px] bg-background border border-border sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm">{t('ai.title')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 hover:bg-muted rounded-md"
            aria-label={t('ai.history')}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={toggle}
            className="p-1.5 hover:bg-muted rounded-md"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History panel overlay */}
      {showHistory && (
        <div className="absolute inset-0 top-[49px] z-10 bg-background">
          <SessionList onSelect={id => loadSession(id)} onClose={() => setShowHistory(false)} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">{t('ai.welcomeMessage')}</p>
            <p className="text-xs mt-1">{t('ai.welcomeHint')}</p>
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <Bot className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          <span className="truncate">{error}</span>
          <button onClick={clearError} className="ml-2 shrink-0" aria-label={t('common.close')}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.inputPlaceholder')}
            aria-label={t('ai.inputPlaceholder')}
            rows={1}
            className="flex-1 resize-none bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-24"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={cancelStream}
              className="p-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
              aria-label={t('ai.stopGenerating')}
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
              aria-label={t('ai.send')}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
