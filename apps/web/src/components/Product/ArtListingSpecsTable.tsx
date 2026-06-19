'use client';

import React from 'react';
import { useI18n, type ArtListingSpecRow, ART_LISTING_UNIQUE_EDITION } from '@mobazha/core';
import { cn } from '@/lib/utils';

const LABEL_KEYS: Record<ArtListingSpecRow['key'], string> = {
  medium: 'product.artSpecs.medium',
  dimensions: 'product.artSpecs.dimensions',
  shipping: 'product.artSpecs.shipping',
  edition: 'product.artSpecs.edition',
};

interface ArtListingSpecsTableProps {
  specs: ArtListingSpecRow[];
  compact?: boolean;
  className?: string;
}

export function ArtListingSpecsTable({
  specs,
  compact = false,
  className,
}: ArtListingSpecsTableProps) {
  const { t } = useI18n();

  if (specs.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/20',
        compact ? 'p-3' : 'p-4',
        className
      )}
      data-testid="product-art-specs-table"
    >
      <h3
        className={cn(
          'font-semibold text-foreground',
          compact ? 'text-sm mb-2' : 'text-sm sm:text-base mb-3'
        )}
      >
        {t('product.artSpecs.title')}
      </h3>
      <dl className={cn('grid gap-2', compact ? 'text-xs' : 'text-sm')}>
        {specs.map(row => (
          <div
            key={row.key}
            className="grid grid-cols-[minmax(5rem,30%)_1fr] gap-x-3 gap-y-0.5 sm:grid-cols-[7rem_1fr]"
          >
            <dt className="font-medium text-muted-foreground">{t(LABEL_KEYS[row.key])}</dt>
            <dd className="text-foreground">
              {row.value === ART_LISTING_UNIQUE_EDITION
                ? t('product.artSpecs.uniqueEdition')
                : row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
