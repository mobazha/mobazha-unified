'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { VStack } from '@/components/layouts';
import { Package, Truck, MapPin, Globe } from 'lucide-react';

export default function ShippingPolicyPage() {
  const { t } = useI18n();

  const sections = [
    {
      icon: Package,
      title: t('policies.shippingProcessing'),
      desc: t('policies.shippingProcessingDesc'),
    },
    { icon: Truck, title: t('policies.shippingMethods'), desc: t('policies.shippingMethodsDesc') },
    {
      icon: MapPin,
      title: t('policies.shippingTracking'),
      desc: t('policies.shippingTrackingDesc'),
    },
    {
      icon: Globe,
      title: t('policies.shippingInternational'),
      desc: t('policies.shippingInternationalDesc'),
    },
  ];

  return (
    <VStack gap="lg">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('policies.shippingTitle')}
        </h1>
        <p className="text-muted-foreground">{t('policies.shippingIntro')}</p>
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
