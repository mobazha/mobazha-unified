// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';

export type CollectiblesTrustVariant = 'catalog' | 'detail' | 'seller' | 'operator';

export interface CollectiblesTrustPanelProps {
  variant?: CollectiblesTrustVariant;
  className?: string;
}

const TRUST_BODY_KEYS: Record<CollectiblesTrustVariant, string> = {
  catalog: 'collectibles.experience.trust.catalog',
  detail: 'collectibles.experience.trust.detail',
  seller: 'collectibles.experience.trust.seller',
  operator: 'collectibles.experience.trust.operator',
};

export function CollectiblesTrustPanel({
  variant = 'catalog',
  className,
}: CollectiblesTrustPanelProps) {
  const { t } = useI18n();

  return (
    <Card
      className={cn('border-primary/20 bg-primary/5 p-4', className)}
      data-testid="collectibles-trust-panel"
    >
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t('collectibles.experience.trust.title')}
          </p>
          <p className="text-sm text-muted-foreground">{t(TRUST_BODY_KEYS[variant])}</p>
        </div>
      </div>
    </Card>
  );
}
