'use client';

import React from 'react';
import { useI18n, useStorefrontMode } from '@mobazha/core';
import { VStack } from '@/components/layouts';
import { FileText, ShieldCheck, Scale, AlertTriangle } from 'lucide-react';

export default function TermsOfServicePage() {
  const { t } = useI18n();
  const standalone = useStorefrontMode();

  const intro = standalone ? t('policies.termsIntro') : t('policies.termsIntroPlatform');

  const sections = [
    {
      icon: FileText,
      title: t('policies.termsUse'),
      desc: standalone ? t('policies.termsUseDesc') : t('policies.termsUseDescPlatform'),
    },
    { icon: ShieldCheck, title: t('policies.termsEscrow'), desc: t('policies.termsEscrowDesc') },
    { icon: Scale, title: t('policies.termsDisputes'), desc: t('policies.termsDisputesDesc') },
    {
      icon: AlertTriangle,
      title: t('policies.termsLiability'),
      desc: standalone
        ? t('policies.termsLiabilityDesc')
        : t('policies.termsLiabilityDescPlatform'),
    },
  ];

  return (
    <VStack gap="lg">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('policies.termsTitle')}
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
