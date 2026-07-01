'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { WorkspaceOpportunity } from './useWorkspaceOpportunities';

const VISIBLE_LIMIT = 3;

interface WorkspaceOpportunityCardsProps {
  items: WorkspaceOpportunity[];
  activeOpportunityId?: string | null;
  onChatAction: (prompt: string, contextLabel: string, opportunityId: string) => void;
  /** Desktop rail: vertical queue. Mobile uses sheet via WorkspaceOpportunitiesRail. */
  layout?: 'grid' | 'queue';
  className?: string;
}

const priorityStyles: Record<WorkspaceOpportunity['priority'], string> = {
  0: 'border-l-4 border-l-destructive/80 bg-destructive/[0.03]',
  1: 'border-l-4 border-l-primary/50',
  2: 'border-l-4 border-l-border',
};

const toneStyles: Record<
  NonNullable<WorkspaceOpportunity['tone']>,
  { card: string; icon: string }
> = {
  critical: {
    card: 'border-l-4 border-l-destructive/80 bg-destructive/[0.03]',
    icon: 'bg-destructive/10 text-destructive',
  },
  warning: {
    card: 'border-l-4 border-l-warning/80 bg-warning/[0.06]',
    icon: 'bg-warning/15 text-warning',
  },
  info: {
    card: 'border-l-4 border-l-primary/60 bg-primary/[0.03]',
    icon: 'bg-primary/10 text-primary',
  },
  neutral: {
    card: 'border-l-4 border-l-border',
    icon: 'bg-muted text-muted-foreground',
  },
};

function OpportunityCard({
  item,
  activeOpportunityId,
  onChatAction,
  titleFor,
}: {
  item: WorkspaceOpportunity;
  activeOpportunityId?: string | null;
  onChatAction: (prompt: string, contextLabel: string, opportunityId: string) => void;
  titleFor: (item: WorkspaceOpportunity) => string;
}) {
  const { t } = useI18n();
  const Icon = item.icon;
  const title = titleFor(item);
  const description = item.descriptionKey
    ? item.descriptionKey.includes('Count')
      ? t(item.descriptionKey, { count: item.count ?? 0 })
      : t(item.descriptionKey)
    : undefined;
  const outcome = item.outcomeKey ? t(item.outcomeKey) : undefined;
  const chatPrompt = item.chatPromptKey ? t(item.chatPromptKey) : undefined;
  const contextLabel = item.count != null && item.count > 0 ? `${item.count} · ${title}` : title;
  const tone = item.tone ? toneStyles[item.tone] : null;

  const cardClass = cn(
    'flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all',
    tone?.card ?? priorityStyles[item.priority],
    activeOpportunityId === item.id && 'border-primary/50 ring-2 ring-primary/20 shadow-sm'
  );

  const header = (
    <div className="flex items-start gap-3 min-w-0">
      <div
        className={cn(
          'p-2 rounded-lg shrink-0',
          tone?.icon ??
            (item.priority === 0
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary')
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.count != null && item.count > 0 && (
            <span className="text-lg font-bold text-foreground">{item.count}</span>
          )}
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        )}
        {outcome && <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{outcome}</p>}
      </div>
    </div>
  );

  const actions = (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      {(item.action === 'chat' || item.action === 'both') && chatPrompt ? (
        <Button
          type="button"
          size="sm"
          className="min-h-8 h-8 text-xs"
          onClick={() => onChatAction(chatPrompt, contextLabel, item.id)}
        >
          {t(item.actionLabelKey ?? 'admin.workspace.cardActionHelp')}
        </Button>
      ) : null}
      {item.href && (
        <Link
          href={item.href}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 min-h-8 px-1"
        >
          {t('admin.workspace.cardActionGo')}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );

  if (item.action === 'navigate' && item.href) {
    return (
      <Link href={item.href} className={cn(cardClass, 'hover:border-primary/30 hover:shadow-sm')}>
        {header}
        {actions}
      </Link>
    );
  }

  return (
    <div className={cardClass} data-testid={`workspace-opportunity-${item.id}`}>
      {header}
      {actions}
    </div>
  );
}

export function WorkspaceOpportunityCards({
  items,
  activeOpportunityId,
  onChatAction,
  layout = 'queue',
  className,
}: WorkspaceOpportunityCardsProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const titleFor = useMemo(() => (item: WorkspaceOpportunity) => t(item.labelKey), [t]);

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

  const visible = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, items.length - VISIBLE_LIMIT);

  return (
    <div className={cn('space-y-3', className)} data-testid="workspace-opportunity-cards">
      <div
        className={cn(
          layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'flex flex-col gap-3'
        )}
      >
        {visible.map(item => (
          <OpportunityCard
            key={item.id}
            item={item}
            activeOpportunityId={activeOpportunityId}
            onChatAction={onChatAction}
            titleFor={titleFor}
          />
        ))}
      </div>
      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-primary hover:underline"
          data-testid="workspace-opportunities-show-more"
        >
          {t('admin.workspace.opportunitiesShowMore', { count: hiddenCount })}
        </button>
      )}
    </div>
  );
}

interface WorkspaceOpportunitiesRailProps {
  items: WorkspaceOpportunity[];
  loading?: boolean;
  activeOpportunityId?: string | null;
  onChatAction: (prompt: string, contextLabel: string, opportunityId: string) => void;
  /** When true, only render the desktop queue rail (lg+). */
  desktopOnly?: boolean;
  /** When true, only render the mobile bottom sheet trigger. */
  mobileOnly?: boolean;
}

export function WorkspaceOpportunitiesRail({
  items,
  loading,
  activeOpportunityId,
  onChatAction,
  desktopOnly = false,
  mobileOnly = false,
}: WorkspaceOpportunitiesRailProps) {
  const { t } = useI18n();
  const showDesktop = !mobileOnly;
  const showMobile = !desktopOnly;

  return (
    <>
      {showDesktop && (
        <div className="hidden lg:block">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {t('admin.workspace.opportunitiesTitle')}
          </h3>
          {loading ? (
            <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          ) : (
            <WorkspaceOpportunityCards
              items={items}
              activeOpportunityId={activeOpportunityId}
              onChatAction={onChatAction}
              layout="queue"
            />
          )}
        </div>
      )}

      {showMobile && (
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="w-full min-h-11 justify-between"
                data-testid="workspace-opportunities-mobile-trigger"
              >
                <span>{t('admin.workspace.opportunitiesTitle')}</span>
                <span className="text-muted-foreground text-xs">
                  {items.length > 0
                    ? t('admin.workspace.opportunitiesMobileCount', { count: items.length })
                    : t('admin.workspace.noOpportunities')}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t('admin.workspace.opportunitiesTitle')}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 pb-6">
                {loading ? (
                  <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
                ) : (
                  <WorkspaceOpportunityCards
                    items={items}
                    activeOpportunityId={activeOpportunityId}
                    onChatAction={onChatAction}
                    layout="queue"
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  );
}
