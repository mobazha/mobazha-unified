'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { VStack } from '@/components/layouts';
import { ShieldCheck, Check } from 'lucide-react';

export default function BuyerProtectionPolicyPage() {
  const { t } = useI18n();
  const steps = [
    t('trust.panel.step1'),
    t('trust.panel.step2'),
    t('trust.panel.step3'),
    t('trust.panel.step4'),
  ];

  return (
    <VStack gap="lg">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('trust.panel.title')}
        </h1>
        <p className="text-muted-foreground text-base">{t('trust.panel.intro')}</p>
      </div>

      <ul className="space-y-3 text-base text-foreground">
        <li className="flex items-start gap-2">
          <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden />
          <span>{t('trust.panel.bullet1')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden />
          <span>{t('trust.panel.bullet2')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden />
          <span>{t('trust.panel.bullet3')}</span>
        </li>
      </ul>

      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {t('trust.panel.howItWorks')}
          </h2>
          <ol className="list-decimal list-inside space-y-1.5 text-base text-muted-foreground">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        {t('policies.lastUpdated')}: March 2026
      </p>
    </VStack>
  );
}
