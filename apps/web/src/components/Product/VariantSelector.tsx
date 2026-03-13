'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@mobazha/core';
import type { ProductOption } from '@mobazha/core';

interface VariantSelectorProps {
  options: ProductOption[];
  selectedOptions: Record<string, string>;
  onSelectOption: (optionName: string, variantName: string) => void;
  unavailableVariants?: Record<string, Set<string>>;
  compact?: boolean;
}

export function VariantSelector({
  options,
  selectedOptions,
  onSelectOption,
  unavailableVariants = {},
  compact = false,
}: VariantSelectorProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {options.map(option => (
        <div key={option.name}>
          <label
            className={cn(
              'block font-medium text-foreground mb-1.5',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {option.name}
            {selectedOptions[option.name] && (
              <span className="font-normal text-muted-foreground ml-1.5">
                — {selectedOptions[option.name]}
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {option.variants.map(variant => {
              const isSelected = selectedOptions[option.name] === variant.name;
              const isUnavailable = unavailableVariants[option.name]?.has(variant.name) ?? false;
              const hasImage =
                variant.image && getImageUrl(variant.image.small || variant.image.tiny);

              return (
                <button
                  key={variant.name}
                  type="button"
                  onClick={() => !isUnavailable && onSelectOption(option.name, variant.name)}
                  disabled={isUnavailable}
                  className={cn(
                    'inline-flex items-center gap-1.5 border rounded-lg transition-all relative',
                    compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                    isUnavailable
                      ? 'border-border/50 bg-muted/30 text-muted-foreground/50 cursor-not-allowed line-through'
                      : isSelected
                        ? 'border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30'
                        : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/50'
                  )}
                  data-testid={`variant-option-${option.name}-${variant.name}`}
                >
                  {hasImage && (
                    <img
                      src={getImageUrl(variant.image!.small || variant.image!.tiny)!}
                      alt={variant.name}
                      className={cn('w-5 h-5 rounded object-cover', isUnavailable && 'opacity-40')}
                    />
                  )}
                  {variant.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
