'use client';

import React from 'react';
import { AlertTriangle, Globe, Mail, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useI18n, getImageUrl } from '@mobazha/core';
import type { Moderator } from '@/components/Payment/types';
import {
  formatModeratorFee,
  getModeratorDisplayName,
  getModeratorTrustMetrics,
  isModeratorVerified,
} from './moderatorDisplay';
import { ModeratorVerificationBadge } from './ModeratorVerificationBadge';

export interface ModeratorProfilePreviewProps {
  moderator: Moderator;
  /** Optional slot for add-to-store button etc. */
  actions?: React.ReactNode;
  showPeerID?: boolean;
  showTrustNote?: boolean;
  showLocation?: boolean;
  showDescription?: boolean;
  showFee?: boolean;
  showStats?: boolean;
  showLanguages?: boolean;
  showServiceDetails?: boolean;
  className?: string;
}

export function ModeratorProfilePreview({
  moderator,
  actions,
  showPeerID = true,
  showTrustNote = true,
  showLocation = true,
  showDescription = true,
  showFee = true,
  showStats = true,
  showLanguages = true,
  showServiceDetails = true,
  className,
}: ModeratorProfilePreviewProps) {
  const { t } = useI18n();
  const displayName = getModeratorDisplayName(moderator);
  const verified = isModeratorVerified(moderator);
  const feeText = formatModeratorFee(moderator);
  const avatarUrl = moderator.avatarHashes?.small
    ? getImageUrl(moderator.avatarHashes.small)
    : undefined;
  const bodyText = moderator.description || moderator.shortDescription;
  const languages = moderator.languages ?? [];
  const acceptedCurrencies = moderator.acceptedCurrencies ?? [];
  const metrics = getModeratorTrustMetrics(moderator);
  const statItems = [
    { label: t('moderator.fee'), value: metrics.fee, highlight: true },
    { label: t('settingsExtended.rating'), value: metrics.rating },
    { label: t('settingsExtended.disputes'), value: metrics.disputes },
    { label: t('settingsExtended.successRate'), value: metrics.successRate },
    { label: t('settingsExtended.avgResolution'), value: metrics.avgResolution },
  ];
  const hasContact = Boolean(moderator.contactInfo?.email || moderator.contactInfo?.website);
  const hasTerms = Boolean(moderator.termsAndConditions?.trim());
  const showDetails =
    showServiceDetails &&
    ((showLanguages && languages.length > 0) ||
      acceptedCurrencies.length > 0 ||
      hasContact ||
      hasTerms);

  return (
    <div className={cn('rounded-xl border border-border bg-surface/60 p-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {displayName[0] || 'M'}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground">{displayName}</p>
              <ModeratorVerificationBadge moderator={moderator} />
            </div>

            {showPeerID && moderator.peerID && (
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {moderator.peerID}
              </p>
            )}

            {showLocation && moderator.location && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                <span>{moderator.location}</span>
              </div>
            )}

            {showDescription && bodyText && (
              <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-3">
                {bodyText}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="sm:flex-shrink-0">{actions}</div>}
      </div>

      {showStats && (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-5">
          {statItems.map(item => (
            <div
              key={item.label}
              className="rounded-lg border border-border/60 bg-background/70 p-2.5"
            >
              <p
                className={cn(
                  'text-base font-semibold tabular-nums',
                  item.highlight ? 'text-primary' : 'text-foreground'
                )}
              >
                {item.value}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {showDetails && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
          {showLanguages && languages.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground">
                {t('moderator.language')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {languages.map(lang => (
                  <Badge key={lang} variant="outline" className="text-xs">
                    {lang.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {acceptedCurrencies.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground">
                {t('settingsExtended.acceptedCryptocurrencies')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {acceptedCurrencies.map(currency => (
                  <Badge
                    key={currency}
                    variant="secondary"
                    className="bg-primary/10 text-primary text-xs"
                  >
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {hasContact && (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-medium text-foreground">
                {t('settingsExtended.contactInfo')}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                {moderator.contactInfo?.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                    {moderator.contactInfo.email}
                  </span>
                )}
                {moderator.contactInfo?.website && (
                  <a
                    href={moderator.contactInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                    <span className="break-all">{moderator.contactInfo.website}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {hasTerms && (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-medium text-foreground">
                {t('settingsExtended.moderatorTerms')}
              </p>
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                {moderator.termsAndConditions}
              </p>
            </div>
          )}
        </div>
      )}

      {showTrustNote && !verified && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <p>{t('moderator.customLookupTrustNote')}</p>
        </div>
      )}

      {(!showStats && showFee && feeText) ||
      (!showDetails && showLanguages && languages.length > 0) ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          {showFee && feeText && !showStats && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">{t('payment.fee')}:</span>
              <span className="font-medium text-foreground">{feeText}</span>
            </div>
          )}

          {showLanguages && languages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {languages.slice(0, 4).map(lang => (
                <Badge key={lang} variant="outline" className="text-xs h-5">
                  {lang.toUpperCase()}
                </Badge>
              ))}
              {languages.length > 4 && (
                <span className="text-xs text-muted-foreground">+{languages.length - 4}</span>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
