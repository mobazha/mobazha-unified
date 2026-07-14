'use client';

import React, { memo, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
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
  onCopy: (publicToken: string) => void;
}

export const DealLinkRow = memo(function DealLinkRow({
  link,
  highlighted,
  manualCopyToken,
  onCopy,
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
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
          onClick={() => onCopy(link.publicToken)}
        >
          <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('admin.dealLinks.copyDealCta')}
        </Button>
        {isLive ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
          >
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
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
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
