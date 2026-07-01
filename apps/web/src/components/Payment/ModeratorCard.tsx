'use client';

import React from 'react';
import { Check, Shield, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Moderator } from './types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useI18n, getImageUrl } from '@mobazha/core';
import {
  formatModeratorFee,
  getModeratorDisplayName,
  isModeratorVerified,
} from '@/components/Moderators/moderatorDisplay';

export interface ModeratorCardProps {
  moderator: Moderator;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export const ModeratorCard: React.FC<ModeratorCardProps> = ({
  moderator,
  selected,
  onClick,
  disabled = false,
  compact = false,
  className,
}) => {
  const { t } = useI18n();

  const displayName = getModeratorDisplayName(moderator);
  const feeDisplay = formatModeratorFee(moderator) ?? '';
  const verified = isModeratorVerified(moderator);

  const avatarUrl = moderator.avatarHashes?.small
    ? getImageUrl(moderator.avatarHashes.small)
    : undefined;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex items-center gap-3 w-full p-3 rounded-lg',
          'border transition-all duration-200',
          'text-left',
          selected ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <Avatar className="w-10 h-10">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {displayName[0] || 'M'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground truncate">{displayName}</span>
            {verified && <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </div>
          <span className="text-xs text-muted-foreground">
            {t('payment.moderatorFee')}: {feeDisplay}
          </span>
        </div>

        {selected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col p-4 rounded-xl',
        'border transition-all duration-200',
        'text-left w-full',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-surface hover:bg-muted/30 hover:border-muted-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {displayName[0] || 'M'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-foreground">{displayName}</span>
            {verified && (
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs h-5 gap-0.5">
                <Shield className="w-3 h-3" />
                {t('payment.verified')}
              </Badge>
            )}
          </div>

          {moderator.handle && (
            <span className="text-sm text-muted-foreground">@{moderator.handle}</span>
          )}

          {moderator.location && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{moderator.location}</span>
            </div>
          )}
        </div>
      </div>

      {moderator.description && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{moderator.description}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{t('payment.fee')}:</span>
          <span className="text-sm font-medium text-foreground">{feeDisplay}</span>
        </div>

        {moderator.languages && moderator.languages.length > 0 && (
          <div className="flex items-center gap-1">
            {moderator.languages.slice(0, 3).map(lang => (
              <Badge key={lang} variant="outline" className="text-xs h-5">
                {lang.toUpperCase()}
              </Badge>
            ))}
            {moderator.languages.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{moderator.languages.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

export default ModeratorCard;
