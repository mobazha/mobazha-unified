'use client';

import React from 'react';
import { useI18n, isStandalone } from '@mobazha/core';
import { VStack } from '@/components/layouts';
import { CheckCircle2, MessageSquare, Clock, XCircle } from 'lucide-react';

export default function RefundPolicyPage() {
  const { t } = useI18n();
  const standalone = isStandalone();

  const intro = standalone ? t('policies.refundIntro') : t('policies.refundIntroPlatform');

  const sections = [
    {
      icon: CheckCircle2,
      title: t('policies.refundEligibility'),
      desc: t('policies.refundEligibilityDesc'),
    },
    {
      icon: MessageSquare,
      title: t('policies.refundProcess'),
      desc: t('policies.refundProcessDesc'),
    },
    {
      icon: Clock,
      title: t('policies.refundTimeline'),
      desc: t('policies.refundTimelineDesc'),
    },
    {
      icon: XCircle,
      title: t('policies.refundNonRefundable'),
      desc: t('policies.refundNonRefundableDesc'),
    },
  ];

  return (
    <VStack gap="lg">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('policies.refundTitle')}
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
