'use client';

import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import type { DealLinkPageErrorKind } from '@mobazha/core/types/dealLink';
import { EmptyState } from '@/components/ui/empty-state';

export interface DealLinkStatusPanelProps {
  kind: 'loading' | DealLinkPageErrorKind | 'inactive' | 'quote_error';
  onRetry?: () => void;
}

export function DealLinkStatusPanel({ kind, onRetry }: DealLinkStatusPanelProps) {
  const { t } = useI18n();

  if (kind === 'loading') {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        data-testid="deal-link-loading"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p>{t('dealLink.loading')}</p>
      </div>
    );
  }

  const titleKey =
    kind === 'not_found'
      ? 'dealLink.notFoundTitle'
      : kind === 'expired'
        ? 'dealLink.expiredTitle'
        : kind === 'inactive'
          ? 'dealLink.inactiveTitle'
          : kind === 'quote_expired' || kind === 'quote_error'
            ? 'dealLink.quoteErrorTitle'
            : kind === 'network'
              ? 'dealLink.networkErrorTitle'
              : 'dealLink.errorTitle';

  const descriptionKey =
    kind === 'not_found'
      ? 'dealLink.notFoundDescription'
      : kind === 'expired'
        ? 'dealLink.expiredDescription'
        : kind === 'inactive'
          ? 'dealLink.inactiveDescription'
          : kind === 'quote_expired' || kind === 'quote_error'
            ? 'dealLink.quoteErrorDescription'
            : kind === 'network'
              ? 'dealLink.networkErrorDescription'
              : 'dealLink.errorDescription';

  return (
    <div data-testid={`deal-link-status-${kind}`}>
      <EmptyState
        icon={AlertCircle}
        title={t(titleKey)}
        description={t(descriptionKey)}
        action={
          onRetry
            ? {
                label: t('dealLink.retry'),
                onClick: onRetry,
              }
            : undefined
        }
      />
    </div>
  );
}
