'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { VStack } from '@/components/layouts';
import { RotateCcw, MessageSquare, Wallet, Shield, Info } from 'lucide-react';

export default function RefundPolicyPage() {
  const { t } = useI18n();

  const sections = [
    {
      icon: RotateCcw,
      title: t('policies.returnsEligibility'),
      desc: t('policies.returnsEligibilityDesc'),
    },
    {
      icon: MessageSquare,
      title: t('policies.returnsProcess'),
      desc: t('policies.returnsProcessDesc'),
    },
    { icon: Wallet, title: t('policies.returnsRefunds'), desc: t('policies.returnsRefundsDesc') },
    { icon: Shield, title: t('policies.returnsDisputes'), desc: t('policies.returnsDisputesDesc') },
  ];

  return (
    <VStack gap="lg">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('policies.refundPolicyTitle')}
        </h1>
        <p className="text-muted-foreground text-base">{t('policies.refundPolicyIntro')}</p>
      </div>

      <div className="flex gap-4 p-3 rounded-lg bg-muted/50 border border-border">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm text-muted-foreground">{t('policies.refundPolicyListingNote')}</p>
      </div>

      <div className="space-y-6">
        {sections.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{desc}</p>
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
