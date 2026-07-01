'use client';

import React from 'react';
import { Globe, Loader2, Mail, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@mobazha/core';
import type { Moderator } from '@/components/Payment/types';
import { getModeratorTrustMetrics } from './moderatorDisplay';

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/80 p-3 text-center">
      <p
        className={cn(
          'text-lg font-bold tabular-nums',
          highlight ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export interface ModeratorDetailPanelProps {
  moderator: Moderator;
  isLoading?: boolean;
  className?: string;
}

/** Full moderator profile fields — used in expanded list rows and detail side panels. */
export function ModeratorDetailPanel({
  moderator,
  isLoading,
  className,
}: ModeratorDetailPanelProps) {
  const { t } = useI18n();
  const languages = moderator.languages ?? [];
  const bodyText = moderator.description || moderator.shortDescription;
  const showFullDescription =
    bodyText && bodyText.trim() !== (moderator.shortDescription ?? '').trim();
  const metrics = getModeratorTrustMetrics(moderator);

  const statItems: { label: string; value: string; highlight?: boolean }[] = [
    { label: t('moderator.fee'), value: metrics.fee, highlight: true },
    { label: t('settingsExtended.rating'), value: metrics.rating },
    { label: t('settingsExtended.disputes'), value: metrics.disputes },
    { label: t('settingsExtended.successRate'), value: metrics.successRate },
    { label: t('settingsExtended.avgResolution'), value: metrics.avgResolution },
  ];

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 py-2 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('settingsExtended.moderatorPreviewLoading')}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {moderator.peerID && (
        <div>
          <p className="mb-1 text-xs font-medium text-foreground">
            {t('moderator.customPeerIdLabel')}
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">{moderator.peerID}</p>
        </div>
      )}

      {moderator.location && (
        <div>
          <p className="mb-1 text-xs font-medium text-foreground">{t('profile.location')}</p>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            <span>{moderator.location}</span>
          </p>
        </div>
      )}

      {showFullDescription && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">
            {t('settingsExtended.detailedDescription')}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {bodyText}
          </p>
        </div>
      )}

      <div className={cn('grid gap-2.5', 'grid-cols-2 md:grid-cols-5')}>
        {statItems.map(item => (
          <StatCell
            key={item.label}
            label={item.label}
            value={item.value}
            highlight={item.highlight}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">{t('moderator.language')}</p>
          {languages.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {languages.map(lang => (
                <Badge key={lang} variant="outline" className="text-xs">
                  {lang.toUpperCase()}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('common.none')}</p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">
            {t('settingsExtended.acceptedCryptocurrencies')}
          </p>
          {moderator.acceptedCurrencies && moderator.acceptedCurrencies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {moderator.acceptedCurrencies.map(currency => (
                <Badge
                  key={currency}
                  variant="secondary"
                  className="bg-primary/10 text-xs text-primary"
                >
                  {currency}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('common.none')}</p>
          )}
        </div>
      </div>

      {(moderator.contactInfo?.email || moderator.contactInfo?.website) && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">
            {t('settingsExtended.contactInfo')}
          </p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            {moderator.contactInfo.email && (
              <div className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span>{moderator.contactInfo.email}</span>
              </div>
            )}
            {moderator.contactInfo.website && (
              <div className="inline-flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <a
                  href={moderator.contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {moderator.contactInfo.website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground">
          {t('settingsExtended.moderatorTerms')}
        </p>
        {moderator.termsAndConditions ? (
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {moderator.termsAndConditions}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t('common.none')}</p>
        )}
      </div>
    </div>
  );
}
