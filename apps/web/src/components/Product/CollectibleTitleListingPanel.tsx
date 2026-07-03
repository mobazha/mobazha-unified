// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  resolveCollectibleListingCustodyKind,
  type ParsedCollectibleListingMetadata,
  useI18n,
} from '@mobazha/core';

export interface CollectibleTitleListingPanelProps {
  meta: ParsedCollectibleListingMetadata;
  /** Human-readable title network from listing blockchain (e.g. Solana). */
  titleNetworkLabel?: string;
  compact?: boolean;
  className?: string;
}

const BUYER_LIFECYCLE_KEYS = [
  'product.collectibleTitle.lifecycle.buy',
  'product.collectibleTitle.lifecycle.title',
  'product.collectibleTitle.lifecycle.hold',
  'product.collectibleTitle.lifecycle.redeem',
] as const;

export function CollectibleTitleListingPanel({
  meta,
  titleNetworkLabel,
  compact = false,
  className,
}: CollectibleTitleListingPanelProps) {
  const { t } = useI18n();
  const custodyKind = resolveCollectibleListingCustodyKind(meta);

  const custodyKey =
    custodyKind === 'source'
      ? 'product.collectibleTitle.custody.source'
      : custodyKind === 'hub'
        ? 'product.collectibleTitle.custody.hub'
        : 'product.collectibleTitle.custody.unknown';

  const identityRows = [
    titleNetworkLabel
      ? { label: t('product.collectibleTitle.titleNetwork'), value: titleNetworkLabel }
      : null,
    meta.certNumber
      ? { label: t('product.collectibleTitle.certNumber'), value: meta.certNumber }
      : null,
    meta.grade ? { label: t('product.collectibleTitle.grade'), value: meta.grade } : null,
    meta.serial ? { label: t('product.collectibleTitle.serial'), value: meta.serial } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <section
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5',
        compact ? 'p-3 space-y-3' : 'p-4 space-y-4',
        className
      )}
      data-testid="collectible-title-listing-panel"
    >
      <div>
        <h2
          className={cn(
            'font-semibold text-foreground',
            compact ? 'text-sm mb-1' : 'text-base mb-1.5'
          )}
        >
          {t('product.collectibleTitle.whatYouReceiveTitle')}
        </h2>
        <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          {t('product.collectibleTitle.whatYouReceiveBody')}
        </p>
      </div>

      <div
        className={cn(
          'rounded-md border border-border bg-background/80',
          compact ? 'p-2.5' : 'p-3'
        )}
      >
        <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
          {t(custodyKey)}
        </p>
        <p className={cn('mt-1 text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          {t('product.collectibleTitle.deliveryNote')}
        </p>
        {custodyKind === 'source' ? (
          <p className={cn('mt-2 text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
            {t('product.collectibleTitle.sourceEscrowPaymentNote')}
          </p>
        ) : null}
      </div>

      <div>
        <h3
          className={cn('font-medium text-foreground', compact ? 'text-xs mb-2' : 'text-sm mb-2.5')}
        >
          {t('product.collectibleTitle.lifecycleTitle')}
        </h3>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BUYER_LIFECYCLE_KEYS.map((key, index) => (
            <li
              key={key}
              className={cn(
                'rounded-md border border-border bg-background/60 text-center',
                compact ? 'px-2 py-1.5 text-[11px]' : 'px-2 py-2 text-xs'
              )}
            >
              <span className="mb-0.5 block font-semibold text-primary" aria-hidden>
                {index + 1}
              </span>
              <span className="text-foreground">{t(key)}</span>
            </li>
          ))}
        </ol>
      </div>

      {identityRows.length > 0 ? (
        <dl
          className={cn('grid grid-cols-1 gap-2 sm:grid-cols-3', compact ? 'text-xs' : 'text-sm')}
        >
          {identityRows.map(row => (
            <div key={row.label}>
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
        {t('product.collectibleTitle.trustLimitation')}
      </p>

      <Link
        href="/collectibles"
        className={cn(
          'inline-flex font-medium text-primary hover:underline',
          compact ? 'text-xs' : 'text-sm'
        )}
        data-testid="collectible-title-catalog-link"
      >
        {t('product.collectibleTitle.catalogLink')}
      </Link>
    </section>
  );
}
