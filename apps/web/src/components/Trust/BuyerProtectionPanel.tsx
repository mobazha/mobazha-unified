'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Buyer protection explanation panel content.
 * Rendered inside a Sheet (bottom on mobile, right on desktop).
 * S6 design: no technical terms (Escrow, Smart Contract, IPFS, multisig).
 */
export function BuyerProtectionPanel({ className }: { className?: string }) {
  const { t } = useI18n();

  const features = [
    t('trust.panel.feature1'),
    t('trust.panel.feature2'),
    t('trust.panel.feature3'),
  ];

  const steps = [
    t('trust.panel.step1'),
    t('trust.panel.step2'),
    t('trust.panel.step3'),
    t('trust.panel.step4'),
    t('trust.panel.step5'),
  ];

  return (
    <div
      className={cn('flex flex-col gap-6 p-4 md:p-6', className)}
      data-testid="buyer-protection-panel"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10">
          <ShieldCheck className="h-5 w-5 text-success" aria-hidden />
        </div>
        <h2
          className="text-lg font-semibold text-foreground"
          data-testid="buyer-protection-panel-title"
        >
          {t('trust.panel.title')}
        </h2>
      </div>

      {/* Intro + Features */}
      <div className="space-y-3">
        <p className="text-sm text-foreground">{t('trust.panel.intro')}</p>
        <ul className="space-y-2" data-testid="buyer-protection-features">
          {features.map((text, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              <span className="text-sm text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* How it works - vertical timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t('trust.panel.howTitle')}</h3>
        <ol
          className="relative space-y-4 border-l-2 border-success/20 pl-5"
          data-testid="buyer-protection-steps"
        >
          {steps.map((text, i) => (
            <li key={i} className="relative flex gap-3">
              <span
                className="absolute -left-[26px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-success/30 bg-success/10 text-xs font-medium text-success"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Zero action note */}
      <p className="rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-muted-foreground">
        {t('trust.panel.zeroAction')}
      </p>

      {/* Policy link */}
      <Link
        href="/policies/buyer-protection"
        className="text-sm font-medium text-primary hover:underline"
        data-testid="buyer-protection-policy-link"
      >
        {t('trust.panel.viewPolicy')} →
      </Link>
    </div>
  );
}
