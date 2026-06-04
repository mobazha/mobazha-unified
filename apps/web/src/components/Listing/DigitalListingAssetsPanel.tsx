'use client';

import React, { useMemo, useState } from 'react';
import { getVariantLabel, useI18n } from '@mobazha/core';
import type { SkuItem } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { DigitalAssetsManagerSection } from './DigitalAssetsManagerSection';

export interface DigitalListingAssetsPanelProps {
  listingSlug: string;
  skus: SkuItem[];
  readOnly?: boolean;
  className?: string;
}

type ScopeKey = 'listing' | string;

export function DigitalListingAssetsPanel({
  listingSlug,
  skus,
  readOnly = false,
  className,
}: DigitalListingAssetsPanelProps) {
  const { t } = useI18n();
  const [scope, setScope] = useState<ScopeKey>('listing');

  const variantScopes = useMemo(
    () =>
      skus.filter(
        sku =>
          sku.selections?.length > 0 && typeof sku.productID === 'string' && sku.productID.trim()
      ),
    [skus]
  );

  const hasDefinedVariants = skus.some(sku => sku.selections?.length > 0);
  const activeVariantSku = scope === 'listing' ? undefined : scope;

  return (
    <div className={cn('space-y-4', className)}>
      {variantScopes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('listing.digital.scopeHint', {
              defaultValue:
                'Choose whether downloads apply to the whole listing or a specific variant.',
            })}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label={t('listing.digital.scopeLabel', { defaultValue: 'Digital delivery scope' })}
          >
            <ScopeButton
              active={scope === 'listing'}
              onClick={() => setScope('listing')}
              label={t('listing.digital.scopeListingWide', { defaultValue: 'All variants' })}
            />
            {variantScopes.map(sku => (
              <ScopeButton
                key={sku.productID}
                active={scope === sku.productID}
                onClick={() => setScope(sku.productID)}
                label={getVariantLabel(sku.selections)}
              />
            ))}
          </div>
        </div>
      )}

      {hasDefinedVariants && variantScopes.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t('listing.digital.variantSkuHint', {
            defaultValue:
              'Add a SKU code on each variant in the Variants section to configure variant-specific downloads or license keys.',
          })}
        </div>
      )}

      <DigitalAssetsManagerSection
        key={activeVariantSku ?? '__listing__'}
        listingSlug={listingSlug}
        variantSku={activeVariantSku}
        readOnly={readOnly}
      />
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted/50'
      )}
    >
      {label}
    </button>
  );
}
