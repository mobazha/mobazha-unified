'use client';

import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import type { ProductSupplyContext, SupplySummaryAction, SupplySummaryView } from '@mobazha/core';
import { ProductSupplyModeBadge } from '@/components/admin/ProductSupplyDisplay';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SupplySummaryBarProps {
  context: ProductSupplyContext;
  summary: SupplySummaryView;
  loading?: boolean;
  onAction?: (action: SupplySummaryAction) => void;
  className?: string;
}

const toneClass: Record<string, string> = {
  default: 'text-foreground',
  warning: 'text-warning',
  destructive: 'text-destructive',
  success: 'text-success',
  muted: 'text-muted-foreground',
};

export function SupplySummaryBar({
  context,
  summary,
  loading,
  onAction,
  className,
}: SupplySummaryBarProps) {
  const { t } = useI18n();

  const handleAction = () => {
    if (!summary.primaryAction || !onAction) return;
    onAction(summary.primaryAction);
  };

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        summary.warning ? 'border-warning/40 bg-warning/5' : 'border-border bg-muted/30',
        className
      )}
      data-testid="listing-supply-summary-bar"
    >
      <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center sm:gap-3">
        <ProductSupplyModeBadge {...context} />
        <p className={cn('text-sm font-medium', toneClass[summary.tone] ?? toneClass.default)}>
          {loading
            ? t('admin.products.availabilityLoading')
            : t(summary.detailKey, summary.detailParams)}
        </p>
      </div>

      {summary.primaryAction &&
        summary.primaryActionKey &&
        (summary.primaryAction === 'sourcing' ? (
          <Link
            href="/admin/sourcing/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
          >
            {t(summary.primaryActionKey)}
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAction}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0 text-left"
          >
            {t(summary.primaryActionKey)}
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        ))}
    </div>
  );
}
