'use client';

import React, { useState } from 'react';
import { useI18n } from '@mobazha/core';
import { ShieldCheck, Lock, Scale, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { BuyerProtectionPanel } from '@/components/Trust/BuyerProtectionPanel';

export function BuyerProtectionBanner() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-success/30 bg-success/5 p-4 w-full text-left hover:border-success/50 transition-colors cursor-pointer"
        data-testid="buyer-protection-banner"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span className="text-sm font-semibold text-success">{t('trust.buyerProtection')}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('trust.panel.title')}</SheetTitle>
          </SheetHeader>
          <BuyerProtectionPanel />
        </SheetContent>
      </Sheet>
    </>
  );
}
