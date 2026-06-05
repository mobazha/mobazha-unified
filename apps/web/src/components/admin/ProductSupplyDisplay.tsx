'use client';

import { useI18n } from '@mobazha/core';
import {
  buildProductAvailabilityView,
  resolveProductSupplyMode,
  supplyModeLabelKey,
  type ListingSupplySummaryItem,
  type LicensePoolListHint,
  type ProductListItem,
} from '@mobazha/core';
import { cn } from '@/lib/utils';
import { KeyRound, Download, Package, Truck } from 'lucide-react';

interface ProductSupplyContextInput {
  product: ProductListItem;
  syncedProvider?: string;
  licenseHint?: LicensePoolListHint | null;
  summary?: ListingSupplySummaryItem;
  summaryLoading?: boolean;
}

function useSupplyContext(input: ProductSupplyContextInput) {
  const mode = resolveProductSupplyMode(input);
  const availability = buildProductAvailabilityView(input);
  const modeKey = supplyModeLabelKey(mode);
  return { mode, availability, modeKey };
}

const modeStyles: Record<string, string> = {
  external: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  license_codes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  instant_download: 'bg-success/15 text-success',
  tracked_stock: 'bg-muted text-muted-foreground',
};

function ModeIcon({ mode }: { mode: ReturnType<typeof resolveProductSupplyMode> }) {
  const cls = 'w-3 h-3';
  switch (mode) {
    case 'external':
      return <Truck className={cls} />;
    case 'license_codes':
      return <KeyRound className={cls} />;
    case 'instant_download':
      return <Download className={cls} />;
    case 'tracked_stock':
      return <Package className={cls} />;
    default:
      return null;
  }
}

export function ProductSupplyModeBadge(props: ProductSupplyContextInput) {
  const { t } = useI18n();
  const { mode, modeKey } = useSupplyContext(props);
  if (!modeKey) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
        modeStyles[mode] ?? modeStyles.tracked_stock
      )}
    >
      <ModeIcon mode={mode} />
      {t(modeKey)}
    </span>
  );
}

const toneClass: Record<string, string> = {
  default: 'text-foreground',
  warning: 'text-warning font-medium',
  destructive: 'text-destructive font-medium',
  success: 'text-success font-medium',
  muted: 'text-muted-foreground',
};

export function ProductAvailabilityCell(props: ProductSupplyContextInput) {
  const { t } = useI18n();
  const { availability } = useSupplyContext(props);
  return (
    <span className={cn('text-sm', toneClass[availability.tone] ?? toneClass.default)}>
      {t(availability.messageKey, availability.messageParams)}
    </span>
  );
}
