'use client';

import React, { useState } from 'react';
import { useI18n } from '@mobazha/core';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { BuyerProtectionPanel } from './BuyerProtectionPanel';

interface BuyerProtectionBadgeProps {
  variant?: 'inline' | 'card';
  className?: string;
}

export function BuyerProtectionBadge({ variant = 'inline', className }: BuyerProtectionBadgeProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const panel = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>{t('trust.panel.title')}</SheetTitle>
        </SheetHeader>
        <BuyerProtectionPanel />
      </SheetContent>
    </Sheet>
  );

  if (variant === 'card') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-3 w-full text-left',
            'hover:border-success/40 transition-colors cursor-pointer',
            className
          )}
          data-testid="buyer-protection-badge-card"
        >
          <ShieldCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('trust.badge.title')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('trust.badge.description')}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        </button>
        {panel}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 text-success cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
        data-testid="buyer-protection-badge-inline"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{t('trust.badge.title')}</span>
      </button>
      {panel}
    </>
  );
}
