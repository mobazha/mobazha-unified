'use client';

import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import Link from 'next/link';
import { useAIChatStore } from '@mobazha/core/stores';
import {
  useI18n,
  aiSettingsApi,
  useFeature,
  getAdminAiModelsPath,
  type ChatTurnPayload,
} from '@mobazha/core';
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Wrench,
  Square,
  PanelLeft,
  PanelLeftClose,
  Plus,
} from 'lucide-react';
import type { ChatContext, ChatMessage, ToolCallInfo } from '@mobazha/core/services/ai';
import { AgentApprovalCard } from '@/components/ai/AgentApprovalCard';
import { AttachedArtifactChips } from '@/components/ai/AttachedArtifactChips';
import { AttachedSkillRunChips } from '@/components/ai/AttachedSkillRunChips';
import { ChatAttachmentPreview } from '@/components/ai/ChatAttachmentPreview';
import { ChatSessionList } from '@/components/ai/ChatSessionList';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceAssistantMarkdown } from '@/components/ai/WorkspaceAssistantMarkdown';
import { WorkspaceChatContextBar } from '@/components/admin/workspace/WorkspaceChatContextBar';
import { WorkspaceUnifiedComposer } from '@/components/admin/workspace/WorkspaceUnifiedComposer';
import { SourceMaterialComposer } from '@/components/ai/SourceMaterialComposer';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { WorkspaceLayoutControls } from '@/components/admin/workspace/WorkspaceLayoutControls';
import {
  getWorkspaceSessionRailCollapsed,
  setWorkspaceSessionRailCollapsed,
} from '@/components/admin/workspace/workspaceLayoutStorage';
import { cn } from '@/lib/utils';

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

function ChatBubble({ msg, workspaceMode = false }: { msg: ChatMessage; workspaceMode?: boolean }) {
  const isUser = msg.role === 'user';
  const updateToolApproval = useAIChatStore(s => s.updateToolApproval);
  const bubbleMaxWidth = workspaceMode
    ? isUser
      ? 'max-w-[min(100%,24rem)]'
      : 'max-w-[min(100%,42rem)]'
    : 'max-w-[80%]';

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
        className={`${bubbleMaxWidth} rounded-lg px-3 py-2 text-sm ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        {msg.content &&
          (isUser ? (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          ) : workspaceMode ? (
            <WorkspaceAssistantMarkdown content={msg.content} />
          ) : (
            <MarkdownContent content={msg.content} />
          ))}
        {isUser && msg.attachmentDisplay && msg.attachmentDisplay.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {msg.attachmentDisplay.map((item, index) => (
              <li key={item.artifactId || `${item.name}-${index}`}>
                <ChatAttachmentPreview
                  artifactId={item.artifactId}
                  name={item.name}
                  previewUrl={item.previewUrl}
                  contentType={item.contentType}
                  variant="user"
                />
              </li>
            ))}
          </ul>
        )}
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

export interface AIChatPanelProps {
  variant?: 'floating' | 'inline';
  seedPrompt?: string | null;
  onSeedPromptConsumed?: () => void;
  /** When set, skips internal status fetch and uses parent value. */
  aiAvailable?: boolean;
  aiStatusLoading?: boolean;
  /** minimal: muted empty state only (workspace banner owns CTA). default: weak configure link. */
  setupPromptVariant?: 'default' | 'minimal';
  workspaceMode?: boolean;
  /** Full-width workspace layout — taller chat shell */
  workspaceFocusMode?: boolean;
  chatContextLabel?: string | null;
  onChatContextDismiss?: () => void;
  onImportComplete?: (runId: string) => void;
  /** Clears workspace context (task chip, seed prompt) when starting a fresh chat. */
  onNewChat?: () => void;
  workspaceLayoutControls?: {
    focusMode: boolean;
    railCollapsed: boolean;
    opportunityCount: number;
    onToggleRail: () => void;
    onToggleFocus: () => void;
  };
}

export function AIChatPanel({
  variant = 'floating',
  seedPrompt,
  onSeedPromptConsumed,
  aiAvailable: aiAvailableProp,
  aiStatusLoading = false,
  setupPromptVariant = 'default',
  workspaceMode = false,
  workspaceFocusMode = false,
  chatContextLabel,
  onChatContextDismiss,
  onImportComplete,
  onNewChat,
  workspaceLayoutControls,
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
    newChat,
  } = useAIChatStore();

  const { t, locale } = useI18n();
  const { toast } = useToast();
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');
  const aiModelsPath = getAdminAiModelsPath(aiWorkspaceEnabled);
  const isInline = variant === 'inline';
  const [input, setInput] = useState('');
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [sessionRailCollapsed, setSessionRailCollapsed] = useState(() =>
    getWorkspaceSessionRailCollapsed()
  );
  const sessionRailHidden = workspaceMode && (workspaceFocusMode || sessionRailCollapsed);
  const [internalAiAvailable, setInternalAiAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSeedRef = useRef<string | null>(null);

  const aiAvailable =
    aiAvailableProp !== undefined ? aiAvailableProp : internalAiAvailable === true;
  const aiChecking = aiAvailableProp === undefined && internalAiAvailable === null;

  const chatContext = useCallback((): ChatContext => ({ locale }), [locale]);

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

  const handleToggleSessionRail = useCallback(() => {
    setSessionRailCollapsed(prev => {
      const next = !prev;
      setWorkspaceSessionRailCollapsed(next);
      return next;
    });
  }, []);

  const handleNewChat = useCallback(() => {
    const { sessionId: activeSessionId } = useAIChatStore.getState();
    const hadContent = messages.length > 0 || Boolean(activeSessionId);
    newChat();
    onNewChat?.();
    if (hadContent) {
      toast({ title: t('ai.newChat') });
    } else {
      requestAnimationFrame(() => {
        if (workspaceMode) {
          (
            document.querySelector(
              '[data-testid="workspace-unified-composer-input"]'
            ) as HTMLTextAreaElement | null
          )?.focus();
        } else {
          inputRef.current?.focus();
        }
      });
    }
  }, [messages.length, newChat, onNewChat, toast, t, workspaceMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatContextLabel]);

  const scrollChatIntoView = useCallback(() => {
    messagesScrollRef.current?.scrollTo({
      top: messagesScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
    if (workspaceMode && typeof document !== 'undefined') {
      document
        .getElementById('workspace-chat-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [workspaceMode]);

  useEffect(() => {
    const prompt = seedPrompt?.trim();
    if (!prompt) {
      lastSeedRef.current = null;
      return;
    }
    if (isStreaming || prompt === lastSeedRef.current || !aiAvailable) return;
    lastSeedRef.current = prompt;
    sendMessage(prompt, chatContext(), {
      onProductImportRun: onImportComplete,
    });
    onSeedPromptConsumed?.();
    requestAnimationFrame(() => scrollChatIntoView());
  }, [
    seedPrompt,
    isStreaming,
    sendMessage,
    onSeedPromptConsumed,
    onImportComplete,
    aiAvailable,
    scrollChatIntoView,
    chatContext,
  ]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming || !aiAvailable) return;
    setInput('');
    sendMessage(text, chatContext(), {
      onProductImportRun: onImportComplete,
    });
  }, [input, isStreaming, onImportComplete, sendMessage, aiAvailable, chatContext]);

  const handleWorkspaceSend = useCallback(
    async (payload: { text: string; turn?: ChatTurnPayload }) => {
      if (!payload.text.trim() || isStreaming || !aiAvailable) return;
      await sendMessage(payload.text, chatContext(), {
        onProductImportRun: onImportComplete,
        turn: payload.turn,
      });
    },
    [aiAvailable, isStreaming, onImportComplete, sendMessage, chatContext]
  );

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
    ? workspaceMode
      ? workspaceFocusMode
        ? 'relative flex flex-col min-h-[calc(100dvh-5.5rem)] h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] bg-card border border-border rounded-lg sm:rounded-xl overflow-hidden shadow-sm'
        : 'relative flex flex-col min-h-[520px] h-[min(680px,calc(100dvh-16rem))] max-h-[calc(100dvh-16rem)] bg-card border border-border rounded-xl overflow-hidden shadow-sm'
      : 'relative flex flex-col min-h-[420px] h-[min(520px,62vh)] bg-card border border-border rounded-xl overflow-hidden'
    : 'fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[400px] sm:h-[600px] bg-background border border-border sm:rounded-xl shadow-2xl flex flex-col overflow-hidden';

  const messageAreaClass = cn(
    'flex-1 overflow-y-auto min-h-0',
    workspaceMode ? (workspaceFocusMode ? 'px-4 py-4' : 'px-4 py-4') : 'px-3 py-3 space-y-3'
  );

  const messageInnerClass = cn(
    workspaceMode && !workspaceFocusMode && 'mx-auto w-full max-w-3xl space-y-4',
    workspaceMode && workspaceFocusMode && 'w-full space-y-4',
    !workspaceMode && 'space-y-3'
  );

  const composerWrapClass = cn(
    workspaceMode && !workspaceFocusMode && 'mx-auto w-full max-w-3xl',
    workspaceMode && workspaceFocusMode && 'w-full'
  );

  const chatBody = (
    <>
      {workspaceMode && chatContextLabel && (
        <WorkspaceChatContextBar
          label={chatContextLabel}
          onDismiss={() => onChatContextDismiss?.()}
        />
      )}

      <div ref={messagesScrollRef} className={messageAreaClass}>
        <div className={messageInnerClass}>
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
            <div
              className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center"
              data-testid={workspaceMode ? 'workspace-chat-empty' : undefined}
            >
              <Bot className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">{t('ai.welcomeMessage')}</p>
              <p className="text-xs mt-1">{t('ai.welcomeHint')}</p>
            </div>
          )}
          {messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} workspaceMode={workspaceMode} />
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
      </div>

      {error && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-xs flex items-center justify-between gap-2 shrink-0">
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

      <div
        className={cn('border-t border-border shrink-0', workspaceMode ? 'px-4 py-3' : 'px-3 py-2')}
      >
        <div className={composerWrapClass}>
          <AttachedArtifactChips testIdPrefix="chat-attached-artifact" />
          <AttachedSkillRunChips testIdPrefix="chat-attached-skill-run" />
          {workspaceMode && aiAvailable ? (
            <WorkspaceUnifiedComposer
              disabled={aiChecking || aiStatusLoading || !aiAvailable}
              isStreaming={isStreaming}
              onSendMessage={handleWorkspaceSend}
              onCancelStream={cancelStream}
            />
          ) : (
            <>
              {aiAvailable && !isInline && <SourceMaterialComposer variant="compact" />}
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
            </>
          )}
        </div>
      </div>
    </>
  );

  const workspaceHeader = (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Bot className="w-5 h-5 text-primary shrink-0" />
        <span className="font-medium text-sm truncate">
          {t('admin.workspace.chatAssistantTitle')}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setHistoryDrawerOpen(true)}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-md hover:bg-muted lg:hidden"
          aria-label={t('ai.history')}
          data-testid="chat-history-drawer-open"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleToggleSessionRail}
          className="hidden lg:inline-flex p-1.5 hover:bg-muted rounded-md"
          aria-label={
            sessionRailHidden
              ? t('admin.workspace.layoutExpandHistory')
              : t('admin.workspace.layoutCollapseHistory')
          }
          aria-pressed={!sessionRailHidden}
          data-testid="chat-session-rail-toggle"
        >
          {sessionRailHidden ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
        {sessionRailHidden && (
          <button
            type="button"
            onClick={handleNewChat}
            className="hidden lg:inline-flex p-1.5 hover:bg-muted rounded-md"
            aria-label={t('ai.newChat')}
            title={t('ai.newChat')}
            data-testid="chat-session-rail-new"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {workspaceLayoutControls && <WorkspaceLayoutControls {...workspaceLayoutControls} />}
      </div>
    </div>
  );

  const floatingHeader = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Bot className="w-5 h-5 text-primary shrink-0" />
        <span className="font-medium text-sm truncate">{t('ai.title')}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setHistoryDrawerOpen(true)}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-md hover:bg-muted sm:min-h-0 sm:min-w-0 sm:p-1.5"
          aria-label={t('ai.history')}
          data-testid="chat-history-drawer-open"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={toggle}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-md hover:bg-muted sm:min-h-0 sm:min-w-0 sm:p-1.5"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className={shellClass} data-testid={workspaceMode ? 'workspace-chat-shell' : undefined}>
      {workspaceMode ? workspaceHeader : floatingHeader}

      <div className="flex flex-1 min-h-0 min-w-0 lg:flex-row flex-col">
        {workspaceMode && (
          <aside
            className={cn(
              'hidden lg:flex flex-col shrink-0 border-r border-border bg-muted/10 min-h-0 transition-[width] duration-200',
              sessionRailHidden ? 'w-0 overflow-hidden border-r-0' : 'w-[240px]'
            )}
            data-testid="chat-session-rail"
          >
            {!sessionRailHidden && (
              <ChatSessionList
                variant="rail"
                hideHeader
                onSelect={id => void loadSession(id)}
                onNewChat={handleNewChat}
                onToggleCollapse={handleToggleSessionRail}
                className="min-h-0 h-full"
              />
            )}
          </aside>
        )}

        <div className="flex flex-col flex-1 min-w-0 min-h-0">{chatBody}</div>
      </div>

      <Sheet open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[min(100vw,320px)] p-0 flex flex-col"
        >
          <ChatSessionList
            variant="panel"
            onSelect={id => void loadSession(id)}
            onNewChat={handleNewChat}
            onClose={() => setHistoryDrawerOpen(false)}
            className="h-full"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
