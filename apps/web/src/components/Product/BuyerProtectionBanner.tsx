'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { ShieldCheck, Lock, Scale } from 'lucide-react';

export function BuyerProtectionBanner() {
  const { t } = useI18n();

  const features = [
    {
      icon: ShieldCheck,
      label: t('trust.escrowProtected'),
      desc: t('trust.escrowDesc'),
    },
    {
      icon: Scale,
      label: t('trust.disputeResolution'),
      desc: t('trust.disputeDesc'),
    },
    {
      icon: Lock,
      label: t('trust.cryptoPayment'),
      desc: t('trust.cryptoPaymentDesc'),
    },
  ];

  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-success" />
        <span className="text-sm font-semibold text-success">{t('trust.buyerProtection')}</span>
      </div>
      <div className="space-y-2.5">
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-2.5">
            <Icon className="w-3.5 h-3.5 mt-0.5 text-success/70 flex-shrink-0" />
            <div>
              <span className="text-xs font-medium text-foreground">{label}</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
