'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, useCurrency } from '@mobazha/core';
import { Button } from '@/components/ui/button';

export interface CheckoutBottomBarProps {
  totalAmount: number;
  currency: string;
  cryptoAmount?: string;
  cryptoCurrency?: string;
  onPay: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  payLabel?: string;
  className?: string;
}

export const CheckoutBottomBar: React.FC<CheckoutBottomBarProps> = ({
  totalAmount,
  currency,
  cryptoAmount,
  cryptoCurrency,
  onPay,
  isLoading = false,
  disabled = false,
  payLabel,
  className,
}) => {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  const formattedTotal = formatPrice(totalAmount, currency);

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-surface/95 backdrop-blur-sm border-t border-border',
        'p-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
        'md:hidden',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('checkout.total')}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-foreground">{formattedTotal}</span>
            {cryptoAmount && cryptoCurrency && (
              <span className="text-sm text-muted-foreground">
                ≈ {cryptoAmount} {cryptoCurrency}
              </span>
            )}
          </div>
        </div>

        <Button
          size="lg"
          onClick={onPay}
          disabled={disabled || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {t('checkout.processing')}
            </>
          ) : (
            payLabel || t('checkout.pay')
          )}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutBottomBar;
