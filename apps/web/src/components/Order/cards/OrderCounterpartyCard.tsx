'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { HStack, VStack } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n, type DisplayOrder } from '@mobazha/core';
import { formatUserName } from '@mobazha/core/utils/identity';

export interface OrderCounterpartyCardProps {
  displayOrder: DisplayOrder;
  /** 'compact' for mobile inline, 'full' for desktop cards grid */
  variant?: 'compact' | 'full';
  className?: string;
}

export const OrderCounterpartyCard = memo(function OrderCounterpartyCard({
  displayOrder: order,
  variant = 'full',
  className,
}: OrderCounterpartyCardProps) {
  const { t } = useI18n();

  if (variant === 'compact') {
    const other = order.userRole === 'buyer' ? order.vendor : order.buyer;
    const roleLabel = order.userRole === 'buyer' ? t('order.seller') : t('order.buyer');
    if (!other?.peerID) return null;

    const displayName = formatUserName(other, { fallback: roleLabel });

    return (
      <Link
        href={`/store/${other.peerID}`}
        className={`flex items-center gap-2.5 p-2.5 bg-muted/20 rounded-lg border border-border/40 ${className ?? ''}`}
      >
        <Avatar
          src={other.avatar}
          name={displayName}
          size="md"
          className="w-9 h-9 ring-1 ring-border/50"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${className ?? ''}`}>
      <PartyCard
        label={t('order.seller')}
        name={formatUserName(order.vendor, { fallback: t('order.seller') })}
        avatar={order.vendor?.avatar}
        location={order.vendor?.location}
        href={order.vendor?.peerID ? `/store/${order.vendor.peerID}` : '#'}
      />
      {order.buyer && (
        <PartyCard
          label={t('order.buyer')}
          name={formatUserName(order.buyer, { fallback: t('order.buyer') })}
          avatar={order.buyer.avatar}
          location={order.buyer.location}
          href={order.buyer.peerID ? `/store/${order.buyer.peerID}` : '#'}
        />
      )}
      {order.moderator && (
        <PartyCard
          label={t('order.moderatorStandby')}
          name={formatUserName(order.moderator, { fallback: t('order.moderator') })}
          avatar={order.moderator.avatar}
          location={order.moderator.location}
          href={`/moderators/${order.moderator.id}`}
          extra={
            <span className="text-xs text-primary font-medium">
              {t('order.moderatorFeeOnDispute', { fee: order.moderator.fee })}
            </span>
          }
        />
      )}
    </div>
  );
});

function PartyCard({
  label,
  name,
  avatar,
  location,
  href,
  extra,
}: {
  label: string;
  name?: string;
  avatar?: string;
  location?: string;
  href: string;
  extra?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group">
      <div className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {label}
        </h4>
        <HStack gap="sm" align="center">
          <Avatar
            src={avatar}
            name={name}
            size="md"
            className="w-11 h-11 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
          />
          <VStack gap="none">
            <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
              {name}
            </span>
            {location && <span className="text-xs text-muted-foreground">{location}</span>}
            {extra}
          </VStack>
        </HStack>
      </div>
    </Link>
  );
}
