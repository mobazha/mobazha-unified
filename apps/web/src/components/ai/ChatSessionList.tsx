'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { useAIChatStore } from '@mobazha/core/stores';
import type { ChatSession } from '@mobazha/core/services/ai';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSessionListProps {
  onSelect: (id: string) => void;
  onClose: () => void;
  className?: string;
}

function sessionTitle(session: ChatSession, untitledWithTime: string): string {
  const title = session.title?.trim();
  if (title) return title;
  return untitledWithTime;
}

export function ChatSessionList({ onSelect, onClose, className }: ChatSessionListProps) {
  const { t, formatRelativeTime } = useI18n();
  const sessions = useAIChatStore(s => s.sessions);
  const sessionId = useAIChatStore(s => s.sessionId);
  const loadSessions = useAIChatStore(s => s.loadSessions);
  const deleteSession = useAIChatStore(s => s.deleteSession);
  const newChat = useAIChatStore(s => s.newChat);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadSessions().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSessions]);

  return (
    <div
      className={cn('flex flex-col min-h-0 flex-1 bg-background', className)}
      data-testid="chat-session-list"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">{t('ai.history')}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          newChat();
          onClose();
        }}
        className="mx-3 mt-3 mb-2 inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors shrink-0"
        data-testid="chat-session-new"
      >
        <Plus className="w-4 h-4" />
        {t('ai.newChat')}
      </button>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12 px-4">
            {t('ai.noConversations')}
          </div>
        ) : (
          <ul className="space-y-2">
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
                      'group flex items-start gap-2 rounded-xl border px-3 py-2.5 transition-colors',
                      isActive
                        ? 'border-primary/40 bg-primary/[0.06]'
                        : 'border-border/70 bg-card hover:bg-muted/40'
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        onSelect(session.id);
                        onClose();
                      }}
                      data-testid={`chat-session-item-${session.id}`}
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-2 break-words">
                        {label}
                      </p>
                      {updatedLabel && session.title?.trim() && (
                        <p className="text-xs text-muted-foreground mt-1">{updatedLabel}</p>
                      )}
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-md text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive hover:bg-muted shrink-0"
                      aria-label={t('common.delete')}
                      onClick={e => {
                        e.stopPropagation();
                        void deleteSession(session.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
