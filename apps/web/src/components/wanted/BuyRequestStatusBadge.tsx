// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@mobazha/core';
import type { BuyRequestStatus } from '@mobazha/core';

const STATUS_LABELS: Record<
  BuyRequestStatus,
  { key: string; fallback: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  open: { key: 'wanted.statusOpen', fallback: 'Open', variant: 'default' },
  locked: { key: 'wanted.statusLocked', fallback: 'Offer accepted', variant: 'secondary' },
  completed: { key: 'wanted.statusCompleted', fallback: 'Completed', variant: 'outline' },
  cancelled: { key: 'wanted.statusCancelled', fallback: 'Closed', variant: 'outline' },
};

/** Status pill for a buy request. Shared by the board and the detail page. */
export function BuyRequestStatusBadge({ status }: { status: BuyRequestStatus }) {
  const { t } = useI18n();
  const entry = STATUS_LABELS[status] ?? STATUS_LABELS.open;

  // The pill shares a flex row with the title, so it must never be the item
  // that wraps: without this a narrow card renders 进行/中 across two lines.
  return (
    <Badge variant={entry.variant} className="shrink-0 whitespace-nowrap">
      {t(entry.key, { defaultValue: entry.fallback })}
    </Badge>
  );
}
