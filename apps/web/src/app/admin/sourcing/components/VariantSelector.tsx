'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { type Variant, getVariantTitle, getVariantPrice, getVariantInStock } from './variant-utils';

interface VariantSelectorProps {
  variants: Variant[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  currency: string;
}

export function VariantSelector({
  variants,
  selectedIds,
  onSelectionChange,
  currency,
}: VariantSelectorProps) {
  const { t } = useI18n();

  if (variants.length <= 1) return null;

  const toggleVariant = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === variants.length) {
      onSelectionChange(new Set([variants[0].id]));
    } else {
      onSelectionChange(new Set(variants.map(v => v.id)));
    }
  };

  const inStockCount = variants.filter(getVariantInStock).length;

  return (
    <section className="rounded-lg border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium">
            {t('admin.sourcing.variantSelection')} ({selectedIds.size}/{variants.length})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {inStockCount}/{variants.length} {t('admin.sourcing.inStock')}
          </p>
        </div>
        <button onClick={toggleAll} className="text-sm text-primary hover:underline">
          {selectedIds.size === variants.length
            ? t('admin.sourcing.deselectAll')
            : t('admin.sourcing.selectAll')}
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
        {variants.map(variant => {
          const inStock = getVariantInStock(variant);
          const price = getVariantPrice(variant);
          const isSelected = selectedIds.has(variant.id);

          return (
            <label
              key={variant.id}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
              } ${!inStock ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleVariant(variant.id)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="flex-1 truncate">{getVariantTitle(variant)}</span>
              <span className="text-muted-foreground font-mono text-xs">
                {price.toFixed(2)} {currency}
              </span>
              {inStock ? (
                <span className="text-xs px-1.5 py-0.5 rounded bg-success/15 text-success">
                  {t('admin.sourcing.inStock')}
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded bg-warning/15 text-warning">
                  {t('admin.sourcing.outOfStock')}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}
