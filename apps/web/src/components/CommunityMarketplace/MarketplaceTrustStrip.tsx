'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/layouts';
import { ShieldCheck } from 'lucide-react';

export function MarketplaceTrustStrip() {
  const { t } = useI18n();

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5 p-4">
      <HStack gap="md" align="start" className="flex-wrap">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {t('marketplace.detail.trustStripTitle')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('marketplace.detail.trustStripBody')}
          </p>
          <Link
            href="/policies/buyer-protection"
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t('footer.buyerProtection')}
          </Link>
        </div>
      </HStack>
    </Card>
  );
}
