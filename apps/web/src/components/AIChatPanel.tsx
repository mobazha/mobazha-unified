'use client';

import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import Link from 'next/link';
import { useAIChatStore } from '@mobazha/core/stores';
import { useI18n, aiSettingsApi, useFeature, getAdminAiModelsPath } from '@mobazha/core';
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Wrench,
  Trash2,
  Plus,
  Square,
} from 'lucide-react';
import type { ChatMessage, ToolCallInfo } from '@mobazha/core/services/ai';
import { AgentApprovalCard } from '@/components/ai/AgentApprovalCard';
import { AttachedArtifactChips } from '@/components/ai/AttachedArtifactChips';
import { SourceMaterialComposer } from '@/components/ai/SourceMaterialComposer';

const ReactMarkdown = lazy(() => import('react-markdown'));

function ToolCallBadge({ tool }: { tool: ToolCallInfo }) {
  const { t } = useI18n();
  const statusIcon =
    tool.status === 'executing' ? (
      <Loader2 className="w-3 h-3 animate-spin" />
    ) : tool.status === 'error' ? (
      <span className="text-destructive">!</span>
    ) : tool.status === 'approval_required' ? (
      <span className="text-primary">!</span>
    ) : (
      <span className="text-primary">✓</span>
    );

  const statusLabel =
    tool.status === 'executing'
      ? t('ai.toolAnalyzing')
      : tool.status === 'error'
        ? t('ai.toolFailed')
        : tool.status === 'approval_required'
          ? t('ai.approval.title')
          : tool.status === 'approval_applied'
            ? t('ai.approval.statusApplied')
            : tool.status === 'approval_rejected'
              ? t('ai.approval.statusRejected')
              : t('ai.toolChecked');

  return (
    <div className="my-1 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
      <Wrench className="w-3 h-3" />
      <span>{statusLabel}</span>
      {statusIcon}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <Suspense fallback={<p className="whitespace-pre-wrap break-words">{content}</p>}>
      <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_code]:text-xs [&_li]:my-0 [&_ol]:my-1 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:my-1">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </Suspense>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const updateToolApproval = useAIChatStore(s => s.updateToolApproval);

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
          <div key={tc.id}>
            <ToolCallBadge tool={tc} />
            {tc.approval &&
              (tc.approval.localStatus === 'pending' || tc.approval.localStatus === 'failed') && (
                <AgentApprovalCard
                  tool={tc}
                  onStatusChange={(toolId, localStatus) =>
                    updateToolApproval(msg.id, toolId, localStatus)
                  }
                />
              )}
          </div>
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

export interface AIChatPanelProps {
  variant?: 'floating' | 'inline';
  seedPrompt?: string | null;
  onSeedPromptConsumed?: () => void;
  /** When set, skips internal status fetch and uses parent value. */
  aiAvailable?: boolean;
  aiStatusLoading?: boolean;
  /** minimal: muted empty state only (workspace banner owns CTA). default: weak configure link. */
  setupPromptVariant?: 'default' | 'minimal';
}

export function AIChatPanel({
  variant = 'floating',
  seedPrompt,
  onSeedPromptConsumed,
  aiAvailable: aiAvailableProp,
  aiStatusLoading = false,
  setupPromptVariant = 'default',
}: AIChatPanelProps) {
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
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');
  const aiModelsPath = getAdminAiModelsPath(aiWorkspaceEnabled);
  const isInline = variant === 'inline';
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [internalAiAvailable, setInternalAiAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSeedRef = useRef<string | null>(null);

  const aiAvailable =
    aiAvailableProp !== undefined ? aiAvailableProp : internalAiAvailable === true;
  const aiChecking = aiAvailableProp === undefined && internalAiAvailable === null;

  useEffect(() => {
    if (aiAvailableProp !== undefined) return;
    let cancelled = false;
    aiSettingsApi
      .getAIStatus()
      .then(s => {
        if (!cancelled) setInternalAiAvailable(s.available);
      })
      .catch(() => {
        if (!cancelled) setInternalAiAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aiAvailableProp]);

  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, [cancelStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const prompt = seedPrompt?.trim();
    if (!prompt || isStreaming || prompt === lastSeedRef.current || !aiAvailable) return;
    lastSeedRef.current = prompt;
    sendMessage(prompt);
    onSeedPromptConsumed?.();
  }, [seedPrompt, isStreaming, sendMessage, onSeedPromptConsumed, aiAvailable]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming || !aiAvailable) return;
    setInput('');
    sendMessage(text);
  }, [input, isStreaming, sendMessage, aiAvailable]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!isInline && !isOpen) {
    return (
      <button
        onClick={toggle}
        className="hidden md:flex fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg items-center justify-center hover:opacity-90 transition-opacity"
        aria-label={t('ai.openAssistant')}
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    );
  }

  const shellClass = isInline
    ? 'relative flex flex-col min-h-[420px] h-[min(520px,62vh)] bg-card border border-border rounded-xl overflow-hidden'
    : 'fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[400px] sm:h-[600px] bg-background border border-border sm:rounded-xl shadow-2xl flex flex-col overflow-hidden';

  return (
    <div className={shellClass}>
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
          {!isInline && (
            <button
              onClick={toggle}
              className="p-1.5 hover:bg-muted rounded-md"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
        {!aiChecking && !aiStatusLoading && !aiAvailable && messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center"
            data-testid="ai-chat-setup-prompt"
          >
            <Bot className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">{t('admin.workspace.chatInputDisabled')}</p>
            {setupPromptVariant === 'default' && (
              <Link
                href={aiModelsPath}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline mt-2"
              >
                {t('admin.workspace.setupBannerCta')} →
              </Link>
            )}
          </div>
        )}
        {messages.length === 0 && aiAvailable && (
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
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-xs flex items-center justify-between gap-2">
          <span className="truncate">
            {error.toLowerCase().includes('not configured')
              ? t('admin.workspace.chatNotConfigured')
              : error}
          </span>
          <button onClick={clearError} className="ml-2 shrink-0" aria-label={t('common.close')}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-3 py-2">
        {!isInline && aiAvailable && <SourceMaterialComposer variant="compact" />}
        <AttachedArtifactChips testIdPrefix="chat-attached-artifact" />
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !aiAvailable && !aiChecking && !aiStatusLoading
                ? t('admin.workspace.chatInputDisabled')
                : t('ai.inputPlaceholder')
            }
            aria-label={t('ai.inputPlaceholder')}
            rows={1}
            className="flex-1 resize-none bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-24 disabled:opacity-60"
            disabled={isStreaming || aiChecking || aiStatusLoading || !aiAvailable}
          />
          {isStreaming ? (
            <button
              onClick={cancelStream}
              className="p-2 rounded-lg bg-muted text-foreground border border-border hover:bg-muted/80 transition-colors"
              aria-label={t('ai.stopGenerating')}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !aiAvailable || aiChecking || aiStatusLoading}
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
