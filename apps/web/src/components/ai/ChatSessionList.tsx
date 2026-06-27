'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import type { ChatSession } from '@mobazha/core/services/ai';
import { sessionDisplayTitle } from '@mobazha/core/utils/chatSessionTitle';
import { Loader2, PanelLeftClose, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSessionListProps {
  onSelect: (id: string) => void;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  variant?: 'rail' | 'panel';
  hideHeader?: boolean;
  className?: string;
}

function sessionTitle(session: ChatSession, untitledWithTime: string): string {
  return sessionDisplayTitle(session.title, untitledWithTime);
}

export function ChatSessionList({
  onSelect,
  onClose,
  onToggleCollapse,
  variant = 'panel',
  hideHeader = false,
  className,
}: ChatSessionListProps) {
  const { t, formatRelativeTime } = useI18n();
  const sessions = useAIChatStore(s => s.sessions);
  const sessionId = useAIChatStore(s => s.sessionId);
  const loadSessions = useAIChatStore(s => s.loadSessions);
  const deleteSession = useAIChatStore(s => s.deleteSession);
  const newChat = useAIChatStore(s => s.newChat);
  const [loading, setLoading] = useState(true);
  const isRail = variant === 'rail';
  const closeOnSelect = Boolean(onClose);

  useEffect(() => {
    let cancelled = false;
    void loadSessions().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSessions]);

  const handleSelect = (id: string) => {
    onSelect(id);
    if (closeOnSelect) onClose?.();
  };

  const handleNewChat = () => {
    newChat();
    onClose?.();
  };

  return (
    <div
      className={cn('flex flex-col min-h-0 flex-1 bg-background', className)}
      data-testid="chat-session-list"
    >
      {!hideHeader && (
        <div
          className={cn(
            'flex items-center justify-between border-b border-border shrink-0',
            isRail ? 'px-3 py-2.5' : 'px-4 py-3'
          )}
        >
          <span className={cn('font-semibold text-foreground', isRail ? 'text-xs' : 'text-sm')}>
            {t('ai.history')}
          </span>
          <div className="flex items-center gap-0.5">
            {isRail && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label={t('admin.workspace.layoutCollapseHistory')}
                data-testid="chat-session-rail-collapse"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
            {!isRail && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleNewChat}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border text-foreground hover:bg-muted/60 transition-colors shrink-0',
          isRail
            ? hideHeader
              ? 'mx-2 mt-2 mb-1.5 px-2 py-1.5 text-xs'
              : 'mx-2 mt-2 mb-1.5 px-2.5 py-2 text-xs'
            : 'mx-3 mt-3 mb-2 px-3 py-2.5 text-sm'
        )}
        data-testid="chat-session-new"
      >
        <Plus className={cn(isRail ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        {t('ai.newChat')}
      </button>

      <div className={cn('flex-1 min-h-0 overflow-y-auto', isRail ? 'px-2 pb-2' : 'px-3 pb-3')}>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div
            className={cn(
              'text-center text-muted-foreground py-12 px-4',
              isRail ? 'text-xs' : 'text-sm'
            )}
          >
            {t('ai.noConversations')}
          </div>
        ) : (
          <ul className={cn(isRail ? 'space-y-1' : 'space-y-2')}>
            {sessions.map(session => {
              const isActive = session.id === sessionId;
              const updatedLabel = session.updated_at ? formatRelativeTime(session.updated_at) : '';
              const label = sessionTitle(
                session,
                updatedLabel ? t('ai.untitledWithTime', { time: updatedLabel }) : t('ai.untitled')
              );

              return (
                <li key={session.id}>
                  <div
                    className={cn(
                      'group flex items-start gap-1.5 transition-colors',
                      isRail
                        ? cn(
                            'rounded-lg px-2 py-2',
                            isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                          )
                        : cn(
                            'rounded-xl border px-3 py-2.5',
                            isActive
                              ? 'border-primary/40 bg-primary/[0.06]'
                              : 'border-border/70 bg-card hover:bg-muted/40'
                          )
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleSelect(session.id)}
                      data-testid={`chat-session-item-${session.id}`}
                    >
                      <p
                        className={cn(
                          'font-medium text-foreground break-words',
                          isRail ? 'text-xs line-clamp-3' : 'text-sm line-clamp-2'
                        )}
                      >
                        {label}
                      </p>
                      {updatedLabel && session.title?.trim() && (
                        <p
                          className={cn(
                            'text-muted-foreground mt-0.5',
                            isRail ? 'text-[10px] line-clamp-1' : 'text-xs mt-1'
                          )}
                        >
                          {updatedLabel}
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'rounded-md text-muted-foreground hover:text-destructive hover:bg-muted shrink-0',
                        isRail
                          ? 'p-1 opacity-0 group-hover:opacity-100'
                          : 'p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                      )}
                      aria-label={t('common.delete')}
                      onClick={e => {
                        e.stopPropagation();
                        void deleteSession(session.id);
                      }}
                    >
                      <Trash2 className={cn(isRail ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
