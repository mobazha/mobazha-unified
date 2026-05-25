'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { HStack } from '@/components/layouts';
import { Package, ShieldCheck, Users } from 'lucide-react';

export function MarketplaceTrustFooter() {
  const { t } = useI18n();

  return (
    <div className="mt-8 grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
      <HStack gap="sm">
        <Users className="h-4 w-4 shrink-0 text-primary" />
        <span>{t('marketplace.trustMembership')}</span>
      </HStack>
      <HStack gap="sm">
        <Package className="h-4 w-4 shrink-0 text-primary" />
        <span>{t('marketplace.trustApprovedProducts')}</span>
      </HStack>
      <HStack gap="sm">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <span>{t('marketplace.trustOpsActivated')}</span>
      </HStack>
    </div>
  );
}
