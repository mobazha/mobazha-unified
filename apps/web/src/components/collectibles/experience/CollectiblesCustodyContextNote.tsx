// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';

export type CollectiblesCustodyContextVariant = 'catalog' | 'detail';

export interface CollectiblesCustodyContextNoteProps {
  variant?: CollectiblesCustodyContextVariant;
  className?: string;
}

const BODY_KEYS: Record<CollectiblesCustodyContextVariant, string> = {
  catalog: 'collectibles.experience.custodyNote.catalog',
  detail: 'collectibles.experience.custodyNote.detail',
};

export function CollectiblesCustodyContextNote({
  variant = 'catalog',
  className,
}: CollectiblesCustodyContextNoteProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-3 sm:gap-3 sm:px-4',
        className
      )}
      data-testid="collectibles-custody-context-note"
    >
      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <p className="text-xs text-muted-foreground sm:text-sm">{t(BODY_KEYS[variant])}</p>
    </div>
  );
}
