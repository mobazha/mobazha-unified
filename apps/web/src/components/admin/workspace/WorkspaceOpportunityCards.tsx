'use client';

import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { ChevronRight, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceOpportunity } from './useWorkspaceOpportunities';

interface WorkspaceOpportunityCardsProps {
  items: WorkspaceOpportunity[];
  onChatAction: (prompt: string) => void;
}

const priorityStyles: Record<WorkspaceOpportunity['priority'], string> = {
  0: 'border-l-4 border-l-destructive/80 bg-destructive/[0.03]',
  1: 'border-l-4 border-l-primary/50',
  2: 'border-l-4 border-l-border',
};

export function WorkspaceOpportunityCards({ items, onChatAction }: WorkspaceOpportunityCardsProps) {
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center"
        data-testid="workspace-opportunities-empty"
      >
        <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
        <p className="text-sm font-medium text-foreground">
          {t('admin.workspace.noOpportunities')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('admin.workspace.noOpportunitiesHint')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      data-testid="workspace-opportunity-cards"
    >
      {items.map(item => {
        const Icon = item.icon;
        const title = t(item.labelKey);
        const description = item.descriptionKey
          ? item.descriptionKey.includes('Count')
            ? t(item.descriptionKey, { count: item.count ?? 0 })
            : t(item.descriptionKey)
          : undefined;
        const isUrgent = item.priority === 0;
        const actionLabel =
          item.action === 'chat'
            ? t('admin.workspace.cardActionAsk')
            : t('admin.workspace.cardActionGo');

        const cardClass = cn(
          'flex flex-col rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all text-left h-full',
          priorityStyles[item.priority]
        );

        const body = (
          <>
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  isUrgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {item.count != null && item.count > 0 && (
                    <span className="text-lg font-bold text-foreground">{item.count}</span>
                  )}
                  <p className="text-sm font-medium text-foreground">{title}</p>
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
                )}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
              <span
                className={cn(
                  'text-xs font-medium',
                  item.action === 'chat' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {actionLabel}
              </span>
              {item.action === 'navigate' ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <MessageSquare className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
          </>
        );

        if (item.action === 'chat' && item.chatPromptKey) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChatAction(t(item.chatPromptKey!))}
              className={cardClass}
            >
              {body}
            </button>
          );
        }

        return (
          <Link key={item.id} href={item.href ?? '/admin'} className={cardClass}>
            {body}
          </Link>
        );
      })}
    </div>
  );
}
