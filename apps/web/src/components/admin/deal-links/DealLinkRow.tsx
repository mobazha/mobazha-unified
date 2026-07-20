'use client';

import React, { memo, useState } from 'react';
import {
  Archive,
  Copy,
  ExternalLink,
  Loader2,
  Pause,
  Pencil,
  Play,
  ShoppingBag,
} from 'lucide-react';
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
  /** Makes a draft or paused link active (a draft that failed to activate can be retried here). */
  onReactivate?: (link: SellerDealLink) => void;
  onViewOrders?: (link: SellerDealLink) => void;
  onClose?: (link: SellerDealLink) => void;
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
  onViewOrders,
  onClose,
}: DealLinkRowProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const href = buildSellerDealLinkBrowseHref(link);
  const absoluteHref = typeof window === 'undefined' ? href : `${window.location.origin}${href}`;

  // A link past its expiry reads as expired even if hosting still reports it
  // active. Only a genuinely live link resolves on the public deal page, so
  // "Open" is offered for those alone — the rest would dead-end on a 404.
  // Snapshot "now" once so the render stays pure; a refresh re-evaluates it.
  // closed is terminal and must win over expiry: a retired link is "closed",
  // not "expired", regardless of whether its expiresAt has passed.
  const [renderedAt] = useState(() => Date.now());
  const expired =
    link.status !== 'closed' &&
    (link.status === 'expired' ||
      (link.expiresAt ? new Date(link.expiresAt).getTime() <= renderedAt : false));
  const effectiveStatus = expired ? 'expired' : link.status;
  const isLive = effectiveStatus === 'active';
  // Editing appends a new revision and rewrites the expiry, so the backend
  // allows it for any non-closed link — including a draft (so a link whose
  // activation failed can be fixed) and an expired one (editing the expiry is
  // the only way to revive it). Gate on the raw status so a closed link with a
  // past expiry does not offer an edit that always fails.
  const canEdit = link.status !== 'closed';
  // A draft link never produced an order; every other state might have (closed
  // links keep their history).
  const canViewOrders = link.status !== 'draft';
  // Pause only a live link. Making active covers two paths: retrying a draft
  // whose activation failed, and reactivating a paused-and-unexpired link
  // (activating an expired link is rejected — edit its expiry first).
  const canPause = effectiveStatus === 'active';
  const canActivateDraft = link.status === 'draft';
  const canReactivate = effectiveStatus === 'paused';
  // Closing is a terminal, Peer-scoped transition allowed from any live or
  // draft state; a closed link exposes only its order history.
  const canClose = link.status !== 'closed';
  // A closed link's public URL 404s, so copying it is pointless.
  const canCopy = link.status !== 'closed';
  const statusLabelKey: Record<string, string> = {
    draft: 'admin.dealLinks.statusDraft',
    active: 'admin.dealLinks.statusActive',
    paused: 'admin.dealLinks.statusPaused',
    expired: 'admin.dealLinks.statusExpired',
    closed: 'admin.dealLinks.statusClosed',
  };
  const statusClass: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600',
    paused: 'bg-muted text-muted-foreground',
    expired: 'bg-amber-500/10 text-amber-600',
    draft: 'bg-muted text-muted-foreground',
    closed: 'bg-muted text-muted-foreground',
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
        {canViewOrders && onViewOrders ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => onViewOrders(link)}
            data-testid={`deal-link-orders-${link.id}`}
          >
            <ShoppingBag className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('admin.dealLinks.viewOrdersCta')}
          </Button>
        ) : null}
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
        {canActivateDraft && onReactivate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => onReactivate(link)}
            disabled={busy}
            data-testid={`deal-link-activate-${link.id}`}
          >
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t('admin.dealLinks.activateDraftCta')}
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
        {canClose && onClose ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 text-destructive hover:text-destructive sm:min-h-9"
            onClick={() => onClose(link)}
            disabled={busy}
            data-testid={`deal-link-close-${link.id}`}
          >
            <Archive className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('admin.dealLinks.closeDealCta')}
          </Button>
        ) : null}
        {canCopy ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => onCopy(link.publicToken)}
            data-testid={`deal-link-copy-${link.id}`}
          >
            <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('admin.dealLinks.copyDealCta')}
          </Button>
        ) : null}
        {link.status === 'closed' ? null : isLive ? (
          <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-9">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              data-testid={`deal-link-open-${link.id}`}
            >
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
