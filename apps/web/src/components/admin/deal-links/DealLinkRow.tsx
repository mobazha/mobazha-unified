'use client';

import React, { memo, useState } from 'react';
import { Copy, ExternalLink, Loader2, Pause, Pencil, Play } from 'lucide-react';
import {
  buildSellerDealLinkBrowseHref,
  useCurrency,
  useI18n,
  type SellerDealLink,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface DealLinkRowProps {
  link: SellerDealLink;
  highlighted?: boolean;
  manualCopyToken: string;
  busy?: boolean;
  onCopy: (publicToken: string) => void;
  onEdit?: (link: SellerDealLink) => void;
  onPause?: (link: SellerDealLink) => void;
  onReactivate?: (link: SellerDealLink) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const DealLinkRow = memo(function DealLinkRow({
  link,
  highlighted,
  manualCopyToken,
  busy = false,
  onCopy,
  onEdit,
  onPause,
  onReactivate,
}: DealLinkRowProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const href = buildSellerDealLinkBrowseHref(link);
  const absoluteHref = typeof window === 'undefined' ? href : `${window.location.origin}${href}`;

  // A link past its expiry reads as expired even if hosting still reports it
  // active. Only a genuinely live link resolves on the public deal page, so
  // "Open" is offered for those alone — the rest would dead-end on a 404.
  // Snapshot "now" once so the render stays pure; a refresh re-evaluates it.
  const [renderedAt] = useState(() => Date.now());
  const expired =
    link.status === 'expired' ||
    (link.expiresAt ? new Date(link.expiresAt).getTime() <= renderedAt : false);
  const effectiveStatus = expired ? 'expired' : link.status;
  const isLive = effectiveStatus === 'active';
  const canEdit = !expired && effectiveStatus !== 'draft';
  const canPause = effectiveStatus === 'active';
  const canReactivate = effectiveStatus === 'paused';
  const statusLabelKey: Record<string, string> = {
    draft: 'admin.dealLinks.statusDraft',
    active: 'admin.dealLinks.statusActive',
    paused: 'admin.dealLinks.statusPaused',
    expired: 'admin.dealLinks.statusExpired',
  };
  const statusClass: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600',
    paused: 'bg-muted text-muted-foreground',
    expired: 'bg-amber-500/10 text-amber-600',
    draft: 'bg-muted text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between',
        highlighted ? 'border-primary/40 bg-primary/5' : 'border-border'
      )}
      data-testid={`deal-link-row-${link.id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{link.title}</p>
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
              statusClass[effectiveStatus] ?? 'bg-muted text-muted-foreground'
            )}
            data-testid={`deal-link-status-${link.id}`}
            data-status={effectiveStatus}
          >
            {t(statusLabelKey[effectiveStatus] ?? 'admin.dealLinks.statusUnknown')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatPrice(link.priceAmount, link.priceCurrency)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t('admin.dealLinks.createdLabel')}: {formatDate(link.createdAt)}
          {' · '}
          {t('admin.dealLinks.dealExpiresLabel')}:{' '}
          {link.expiresAt ? formatDate(link.expiresAt) : t('admin.dealLinks.noExpiryLabel')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canEdit && onEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => onEdit(link)}
            disabled={busy}
            data-testid={`deal-link-edit-${link.id}`}
          >
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('admin.dealLinks.editDealCta')}
          </Button>
        ) : null}
        {canPause && onPause ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => onPause(link)}
            disabled={busy}
            data-testid={`deal-link-pause-${link.id}`}
          >
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Pause className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t('admin.dealLinks.pauseDealCta')}
          </Button>
        ) : null}
        {canReactivate && onReactivate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => onReactivate(link)}
            disabled={busy}
            data-testid={`deal-link-reactivate-${link.id}`}
          >
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t('admin.dealLinks.reactivateDealCta')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-9"
          onClick={() => onCopy(link.publicToken)}
        >
          <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('admin.dealLinks.copyDealCta')}
        </Button>
        {isLive ? (
          <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-9">
            <a href={href} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('admin.dealLinks.openDealCta')}
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            disabled
          >
            <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('admin.dealLinks.openDealCta')}
          </Button>
        )}
      </div>
      {manualCopyToken === link.publicToken ? (
        <div className="w-full basis-full space-y-1.5 border-t border-border pt-3">
          <Label htmlFor={`manual-copy-${link.id}`} className="text-xs">
            {t('admin.dealLinks.manualCopyLabel')}
          </Label>
          <Input
            id={`manual-copy-${link.id}`}
            value={absoluteHref}
            readOnly
            className="min-h-11 font-mono text-xs"
            onFocus={event => event.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  );
});
