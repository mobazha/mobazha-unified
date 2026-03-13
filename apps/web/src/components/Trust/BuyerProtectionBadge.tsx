'use client';

import React, { useState, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { ShieldCheck, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface BuyerProtectionBadgeProps {
  variant?: 'inline' | 'card';
  /** When true, badge is not clickable (e.g. in checkout summary). */
  static?: boolean;
  className?: string;
}

/** Panel content: buyer protection explanation (no technical terms). */
function BuyerProtectionPanelContent() {
  const { t } = useI18n();
  const steps = [
    t('trust.panel.step1'),
    t('trust.panel.step2'),
    t('trust.panel.step3'),
    t('trust.panel.step4'),
  ];
  return (
    <div className="space-y-4 pb-6">
      <p className="text-sm text-muted-foreground">{t('trust.panel.intro')}</p>
      <ul className="space-y-2 text-sm text-foreground">
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden />
          <span>{t('trust.panel.bullet1')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden />
          <span>{t('trust.panel.bullet2')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden />
          <span>{t('trust.panel.bullet3')}</span>
        </li>
      </ul>
      <div>
        <p className="text-sm font-medium text-foreground mb-2">{t('trust.panel.howItWorks')}</p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function BuyerProtectionBadge({
  variant = 'inline',
  static: isStatic = false,
  className,
}: BuyerProtectionBadgeProps) {
  const { t } = useI18n();
  const [panelOpen, setPanelOpen] = useState(false);
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const badgeContent = (
    <>
      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
      <span className="text-xs font-medium">{t('trust.badge.title')}</span>
    </>
  );

  if (variant === 'card') {
    const cardContent = (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-3',
          !isStatic && 'cursor-pointer hover:bg-success/10 transition-colors',
          className
        )}
      >
        <ShieldCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-sm font-medium text-foreground">{t('trust.badge.title')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('trust.badge.description')}</p>
        </div>
      </div>
    );
    if (isStatic) {
      return cardContent;
    }
    return (
      <>
        <button
          type="button"
          onClick={openPanel}
          className={cn(
            'flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-3 w-full text-left',
            'hover:bg-success/10 transition-colors min-h-[44px]',
            className
          )}
          aria-label={t('trust.badge.title')}
          data-testid="buyer-protection-badge-card"
        >
          <ShieldCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">{t('trust.badge.title')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('trust.badge.description')}</p>
          </div>
        </button>
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="w-5 h-5 text-success" aria-hidden />
                {t('trust.panel.title')}
              </SheetTitle>
            </SheetHeader>
            <BuyerProtectionPanelContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  if (isStatic) {
    return (
      <div className={cn('flex items-center gap-1.5 text-success', className)}>
        {badgeContent}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className={cn(
          'flex items-center gap-1.5 text-success min-h-[44px] min-w-[44px]',
          'hover:opacity-90 transition-opacity',
          className
        )}
        aria-label={t('trust.badge.title')}
        data-testid="buyer-protection-badge-inline"
      >
        {badgeContent}
      </button>
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-success" aria-hidden />
              {t('trust.panel.title')}
            </SheetTitle>
          </SheetHeader>
          <BuyerProtectionPanelContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
