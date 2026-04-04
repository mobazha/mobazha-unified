'use client';

import React from 'react';
import { useI18n, useStorefrontMode } from '@mobazha/core';
import { VStack } from '@/components/layouts';
import { Timer, Lock, RotateCcw, Scale, Clock, CalendarPlus } from 'lucide-react';

export default function BuyerProtectionPolicyPage() {
  const { t } = useI18n();
  const standalone = useStorefrontMode();

  const intro = standalone
    ? t('policies.buyerProtectionIntro')
    : t('policies.buyerProtectionIntroPlatform');

  const sections = [
    {
      icon: Timer,
      title: t('policies.bpAutoComplete'),
      desc: t('policies.bpAutoCompleteDesc'),
    },
    {
      icon: Lock,
      title: t('policies.bpFundsHeld'),
      desc: t('policies.bpFundsHeldDesc'),
    },
    {
      icon: RotateCcw,
      title: t('policies.bpAutoRefund'),
      desc: t('policies.bpAutoRefundDesc'),
    },
    {
      icon: Scale,
      title: t('policies.bpDisputeProcess'),
      desc: t('policies.bpDisputeProcessDesc'),
    },
    {
      icon: Clock,
      title: t('policies.bpAfterSale'),
      desc: t('policies.bpAfterSaleDesc'),
    },
    {
      icon: CalendarPlus,
      title: t('policies.bpExtend'),
      desc: t('policies.bpExtendDesc'),
    },
  ];

  return (
    <VStack gap="lg">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('policies.buyerProtectionTitle')}
        </h1>
        <p className="text-muted-foreground">{intro}</p>
      </div>

      <div className="space-y-6">
        {sections.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        {t('policies.lastUpdated')}: March 2026
      </p>
    </VStack>
  );
}
