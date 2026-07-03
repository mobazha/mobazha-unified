'use client';

import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  useI18n,
  formatSupplyItemStatusLabel,
  hasSupplyAvailabilityWarning,
  type CheckoutSupplyQuoteItem,
  type CheckoutSupplyQuoteResponse,
} from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface SupplyAvailabilityDisplayItem {
  listingSlug: string;
  title: string;
}

export interface SupplyAvailabilityPanelProps {
  displayItems: SupplyAvailabilityDisplayItem[];
  quote: CheckoutSupplyQuoteResponse | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
  /** Guest checkout blocks submit when authoritative quote says cannot sell. */
  blocking?: boolean;
  testIdPrefix?: string;
}

export function SupplyAvailabilityPanel({
  displayItems,
  quote,
  loading = false,
  error = null,
  className,
  blocking = false,
  testIdPrefix = 'supply-quote',
}: SupplyAvailabilityPanelProps) {
  const { t } = useI18n();

  const titleBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of displayItems) {
      if (!map.has(item.listingSlug)) map.set(item.listingSlug, item.title);
    }
    return map;
  }, [displayItems]);

  if (loading && !quote) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground',
          className
        )}
        data-testid={`${testIdPrefix}-loading`}
      >
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        {t('supplyAvailability.checking', { defaultValue: 'Checking availability…' })}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="note"
        className={cn(
          'rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground',
          className
        )}
        data-testid={`${testIdPrefix}-error`}
      >
        {t('supplyAvailability.quoteError', {
          defaultValue: 'Could not verify availability. You can still try to continue.',
        })}
      </div>
    );
  }

  if (!quote) return null;

  const hardBlock = blocking && quote.canSell === false;
  const warning = hasSupplyAvailabilityWarning(quote);

  if (!hardBlock && !warning) {
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm',
          className
        )}
        data-testid={`${testIdPrefix}-ok`}
      >
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
        <span>
          {t('supplyAvailability.allAvailable', { defaultValue: 'All items are available.' })}
        </span>
      </div>
    );
  }

  const summaryTitle = hardBlock
    ? t('supplyAvailability.unavailableTitle', {
        defaultValue: 'Some items are unavailable',
      })
    : quote.manualActionRequired
      ? t('supplyAvailability.manualActionTitle', {
          defaultValue: 'Seller review may be required',
        })
      : t('supplyAvailability.warningTitle', {
          defaultValue: 'Check availability before continuing',
        });

  const summaryBody = hardBlock
    ? t('supplyAvailability.unavailableBody', {
        defaultValue: 'Reduce quantities or remove unavailable items to continue.',
      })
    : t('supplyAvailability.manualActionBody', {
        defaultValue:
          'One or more items may need seller confirmation. You can try to continue, but checkout might not complete.',
      });

  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border px-4 py-3 text-sm',
        hardBlock
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-warning/40 bg-warning/10',
        className
      )}
      data-testid={`${testIdPrefix}-alert`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="font-medium">{summaryTitle}</p>
            <p className={cn('mt-1', hardBlock ? 'opacity-90' : 'text-muted-foreground')}>
              {summaryBody}
            </p>
          </div>
          {quote.items.length > 0 && (
            <ul className="space-y-1 text-xs">
              {quote.items.map((item: CheckoutSupplyQuoteItem, index: number) => {
                const title = titleBySlug.get(item.listingSlug) ?? item.listingSlug;
                const statusLabel = formatSupplyItemStatusLabel(item, t);
                return (
                  <li
                    key={`${item.listingSlug}-${index}-${item.quantity}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">{title}</span>
                    <span className="shrink-0 tabular-nums">{statusLabel}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
