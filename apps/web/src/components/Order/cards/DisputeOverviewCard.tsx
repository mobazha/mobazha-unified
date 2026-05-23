'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { ProductImageNative } from '@/components/ui/product-image';
import { useI18n, useCurrency, getGatewayUrl, NODE_API, type DisplayOrder } from '@mobazha/core';
import { formatUserName } from '@mobazha/core/utils/identity';
import { ShieldAlert, ChevronRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusLabel } from './orderProgressUtils';

export interface DisputeOverviewCardProps {
  displayOrder: DisplayOrder;
  className?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-error/10 text-error border-error/20',
  in_progress: 'bg-warning/10 text-warning border-warning/20',
  resolved: 'bg-success/10 text-success border-success/20',
};

function PartyLinkCard({
  label,
  participant,
  roleFallback,
  href,
  isInitiator,
  initiatorBadgeLabel,
}: {
  label: string;
  participant?: { name?: string; avatar?: string; peerID?: string };
  roleFallback: string;
  href: string | null;
  isInitiator: boolean;
  initiatorBadgeLabel: string;
}) {
  const displayName = formatUserName(participant, { fallback: roleFallback });
  const inner = (
    <div
      className={cn(
        'flex items-center gap-2 p-2.5 rounded-lg border transition-all min-h-[52px]',
        href
          ? 'bg-muted/30 border-border/40 hover:border-primary/40 hover:bg-muted/50 cursor-pointer'
          : 'bg-muted/30 border-border/40',
        isInitiator && 'ring-1 ring-error/25 border-error/20'
      )}
    >
      <Avatar
        src={participant?.avatar}
        name={displayName}
        size="sm"
        className="w-8 h-8 flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs text-muted-foreground">{label}</p>
          {isInitiator && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-error/10 text-error border border-error/20">
              {initiatorBadgeLabel}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
      </div>
      {href && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

export const DisputeOverviewCard = memo(function DisputeOverviewCard({
  displayOrder,
  className,
}: DisputeOverviewCardProps) {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const dispute = displayOrder.dispute;
  const item = displayOrder.items?.[0];
  const formattedUnitPrice =
    item?.price && item?.currency ? formatCurrencyPrice(item.price, item.currency) : null;

  if (!dispute) return null;

  const hasSlug = !!displayOrder.slug;
  const productHref =
    hasSlug && displayOrder.vendor?.peerID
      ? `/product/${displayOrder.slug}?peerID=${displayOrder.vendor.peerID}`
      : hasSlug
        ? `/product/${displayOrder.slug}`
        : null;

  const statusStyle =
    STATUS_STYLE[dispute.status] ?? 'bg-muted text-muted-foreground border-border';

  const statusLabel =
    dispute.status === 'open'
      ? t('order.disputeDisplay.statusOpen')
      : dispute.status === 'in_progress'
        ? t('order.disputeDisplay.statusInProgress')
        : t('order.disputeDisplay.statusResolved');

  const resolutionLabel =
    dispute.resolution === 'buyer'
      ? t('order.disputeOverview.resolvedFavor', { party: t('order.buyer') })
      : dispute.resolution === 'seller'
        ? t('order.disputeOverview.resolvedFavor', { party: t('order.seller') })
        : dispute.resolution === 'split'
          ? t('order.disputeOverview.resolvedSplit')
          : null;

  const openedAt =
    dispute.openedAt ||
    displayOrder.timeline?.find(e => e.descriptionKey === 'order.timeline.disputeOpened')
      ?.timestamp ||
    displayOrder.createdAt;

  const orderStatusLabel = getStatusLabel(displayOrder.status, t);
  const buyerHref = displayOrder.buyer?.peerID ? `/store/${displayOrder.buyer.peerID}` : null;
  const sellerHref = displayOrder.vendor?.peerID ? `/store/${displayOrder.vendor.peerID}` : null;

  const productRow = (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border/50">
        <ProductImageNative
          src={item?.image}
          alt={item?.title ?? ''}
          className="w-full h-full"
          iconSize="sm"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground line-clamp-2">{item?.title ?? '—'}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
          {formattedUnitPrice && (
            <span>
              {t('order.product.unitPrice')}:{' '}
              <span className="text-foreground font-medium">{formattedUnitPrice}</span>
            </span>
          )}
          <span>
            {t('order.product.quantity')}:{' '}
            <span className="text-foreground font-medium">{item?.quantity ?? 1}</span>
          </span>
        </div>
      </div>
      {productHref && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </div>
  );

  return (
    <Card className={cn('overflow-hidden border-error/20', className)}>
      <div className="bg-error/8 border-b border-error/15 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-error flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {t('order.disputeOverview.title')}
          </span>
        </div>
        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', statusStyle)}>
          {statusLabel}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Product — clickable when slug available */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            {t('order.disputeOverview.product')}
          </p>
          {productHref ? (
            <Link
              href={productHref}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:opacity-95 transition-opacity"
            >
              {productRow}
            </Link>
          ) : (
            productRow
          )}
        </div>

        {/* Amount + dispute opened */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">
              {t('order.disputeOverview.disputeAmount')}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {displayOrder.total} {displayOrder.currency}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('order.disputeOverview.openedOn')}</p>
            <p className="text-sm text-foreground">{formatDate(openedAt)}</p>
          </div>
        </div>

        {/* Order fulfillment snapshot */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/25 border border-border/50 text-sm">
          <Package className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {t('order.disputeOverview.orderStatus')}
            </p>
            <p className="font-medium text-foreground">{orderStatusLabel}</p>
            {displayOrder.trackingNumber && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {t('order.disputeOverview.tracking')}:{' '}
                <span className="font-mono text-foreground">{displayOrder.trackingNumber}</span>
              </p>
            )}
          </div>
        </div>

        {dispute.claim && (
          <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              {t('order.disputeOverview.claim')}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{dispute.claim}</p>
          </div>
        )}

        {dispute.response && (
          <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              {t('order.disputeDisplay.response')}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{dispute.response}</p>
          </div>
        )}

        {dispute.evidenceHashes && dispute.evidenceHashes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {t('order.disputeOverview.evidence')} ({dispute.evidenceHashes.length})
            </p>
            <div className="flex gap-2 flex-wrap">
              {dispute.evidenceHashes.slice(0, 4).map((hash, idx) => (
                <a
                  key={hash}
                  href={`${getGatewayUrl()}${NODE_API.MEDIA_IMAGE(hash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-16 h-16 rounded-lg overflow-hidden border border-border/60 hover:border-primary/50 transition-colors flex-shrink-0"
                >
                  <img
                    src={`${getGatewayUrl()}${NODE_API.MEDIA_IMAGE(hash)}`}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
              {dispute.evidenceHashes.length > 4 && (
                <div className="w-16 h-16 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                  +{dispute.evidenceHashes.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parties — clickable store links */}
        <div className="grid grid-cols-2 gap-3">
          <PartyLinkCard
            label={t('order.buyer')}
            participant={displayOrder.buyer}
            roleFallback={t('order.buyer')}
            href={buyerHref}
            isInitiator={dispute.initiator === 'buyer'}
            initiatorBadgeLabel={t('order.disputeOverview.initiatorBadge')}
          />
          <PartyLinkCard
            label={t('order.seller')}
            participant={displayOrder.vendor}
            roleFallback={t('order.seller')}
            href={sellerHref}
            isInitiator={dispute.initiator === 'seller'}
            initiatorBadgeLabel={t('order.disputeOverview.initiatorBadge')}
          />
        </div>

        {/* Resolution — show outcome or honest empty state */}
        {(dispute.status === 'resolved' || dispute.resolution) && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 space-y-1">
            <p className="text-xs text-muted-foreground">{t('order.disputeDisplay.resolution')}</p>
            {resolutionLabel ? (
              <p className="text-sm font-semibold text-primary">{resolutionLabel}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('order.disputeOverview.resolutionUnknown')}
              </p>
            )}
            {dispute.resolvedAt && (
              <p className="text-xs text-muted-foreground">
                {t('order.disputeOverview.resolvedOn')}: {formatDate(dispute.resolvedAt)}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});
