'use client';

import React from 'react';
import { ChevronDown, MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useI18n, getImageUrl } from '@mobazha/core';
import type { Moderator } from '@/components/Payment/types';
import {
  ADDED_TO_STORE_BADGE_CLASS,
  formatModeratorFee,
  getModeratorDisplayName,
} from './moderatorDisplay';
import { ModeratorVerificationBadge } from './ModeratorVerificationBadge';
import { ModeratorDetailPanel } from './ModeratorDetailPanel';

export interface ModeratorExpandableRowProps {
  moderator: Moderator;
  detailModerator?: Moderator | null;
  isDetailLoading?: boolean;
  expanded: boolean;
  onToggle: () => void;
  /** Slot for trailing actions (remove, add, etc.) */
  trailing?: React.ReactNode;
  /** Footer rendered below the detail panel when expanded */
  expandedFooter?: React.ReactNode;
  /** Show "added to store" status badge in the collapsed header */
  showAddedBadge?: boolean;
  className?: string;
}

export function ModeratorExpandableRow({
  moderator,
  detailModerator,
  isDetailLoading,
  expanded,
  onToggle,
  trailing,
  expandedFooter,
  showAddedBadge = false,
  className,
}: ModeratorExpandableRowProps) {
  const { t } = useI18n();
  const panelModerator = detailModerator ?? moderator;
  const avatarUrl = moderator.avatarHashes?.small
    ? getImageUrl(moderator.avatarHashes.small)
    : undefined;
  const displayName = getModeratorDisplayName(moderator, 'Moderator');
  const feeText = formatModeratorFee(moderator);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        showAddedBadge && 'border-border/60',
        className
      )}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={cn(
            'flex min-h-[72px] flex-1 items-center gap-3 p-4 text-left transition-colors',
            'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
          )}
        >
          <Avatar className="h-11 w-11 flex-shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-base text-primary">
              {displayName[0] || 'M'}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-medium text-foreground">{displayName}</span>
              <ModeratorVerificationBadge moderator={moderator} />
              {showAddedBadge && (
                <Badge variant="outline" className={cn('h-5 text-xs', ADDED_TO_STORE_BADGE_CLASS)}>
                  <Check className="h-3 w-3" aria-hidden />
                  {t('moderator.addedToStore')}
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {moderator.location && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                  {moderator.location}
                </span>
              )}
              {feeText && (
                <span className="text-xs text-muted-foreground">
                  {moderator.location ? '· ' : ''}
                  {t('moderator.fee')} {feeText}
                </span>
              )}
              {moderator.shortDescription && (
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {feeText || moderator.location
                    ? `· ${moderator.shortDescription}`
                    : moderator.shortDescription}
                </span>
              )}
            </div>
          </div>

          <ChevronDown
            className={cn(
              'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180'
            )}
            aria-hidden
          />
        </button>

        {trailing && (
          <div className="flex flex-shrink-0 items-center self-stretch border-l border-border/60 px-2">
            {trailing}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-4">
          <ModeratorDetailPanel moderator={panelModerator} isLoading={isDetailLoading} />
          {expandedFooter && (
            <div className="mt-4 border-t border-border/60 pt-4">{expandedFooter}</div>
          )}
        </div>
      )}
    </div>
  );
}
