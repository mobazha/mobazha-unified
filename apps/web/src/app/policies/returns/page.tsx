'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { VStack } from '@/components/layouts';
import { RotateCcw, MessageSquare, Wallet, Shield } from 'lucide-react';

export default function ReturnsPolicyPage() {
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
          {t('policies.returnsTitle')}
        </h1>
        <p className="text-muted-foreground">{t('policies.returnsIntro')}</p>
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
        {t('policies.lastUpdated')}: February 2026
      </p>
    </VStack>
  );
}
