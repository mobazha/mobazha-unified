'use client';

import React, { useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, filterVisibleFiatProviderIDs } from '@mobazha/core';
import { FIAT_METHODS } from './config';

export interface PaymentMethodBadgesProps {
  fiatProviders?: string[];
  showCrypto?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const PaymentMethodBadges: React.FC<PaymentMethodBadgesProps> = ({
  fiatProviders = [],
  showCrypto = true,
  size = 'sm',
  className,
}) => {
  const { t } = useI18n();
  const activeMethods = useMemo(
    () =>
      FIAT_METHODS.filter(m => filterVisibleFiatProviderIDs(fiatProviders).includes(m.providerID)),
    [fiatProviders]
  );

  if (activeMethods.length === 0 && !showCrypto) return null;

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const gap = size === 'sm' ? 'gap-1' : 'gap-1.5';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

  return (
    <div className={cn('flex flex-wrap items-center', gap, className)}>
      {activeMethods.map(method => (
        <span
          key={method.id}
          className={cn(
            'inline-flex items-center gap-1 rounded-full',
            'bg-muted/50 text-muted-foreground',
            padding,
            textSize
          )}
        >
          <CreditCard className={iconSize} style={{ color: method.color }} />
          <span className="font-medium">{method.name}</span>
        </span>
      ))}
      {showCrypto && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full',
            'bg-muted/50 text-muted-foreground',
            padding,
            textSize
          )}
        >
          <span className="font-medium">{t('fiat.cryptoBadge')}</span>
        </span>
      )}
    </div>
  );
};

export default PaymentMethodBadges;
