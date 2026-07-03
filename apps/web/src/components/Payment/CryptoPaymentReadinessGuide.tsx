'use client';

import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EXCHANGE_USDT_PAYMENT_HELP_PATH,
  useI18n,
  isExchangeUsdtPaymentGuideLocale,
  useExchangeUsdtGuideDismiss,
} from '@mobazha/core';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface CryptoPaymentReadinessGuideProps {
  className?: string;
}

/**
 * Slim exchange USDT checkout guide (P0.5): TRC20 warning + summary + link to full Help page.
 * Placed below crypto token selection so payment choice stays primary.
 * Full guide opens in a new tab so the payment drawer / checkout page is not lost.
 */
export const CryptoPaymentReadinessGuide: React.FC<CryptoPaymentReadinessGuideProps> = ({
  className,
}) => {
  const { t, locale } = useI18n();
  const { dismissed, dismiss } = useExchangeUsdtGuideDismiss();

  if (!isExchangeUsdtPaymentGuideLocale(locale) || dismissed) {
    return null;
  }

  return (
    <div
      className={cn('rounded-xl border border-border bg-muted/30 overflow-hidden', className)}
      data-testid="crypto-payment-readiness-guide"
    >
      <Accordion type="single" collapsible>
        <AccordionItem value="readiness" className="border-0">
          <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
            {t('payment.cryptoReadiness.title')}
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed m-0">
              {t('payment.cryptoReadiness.summary')}
            </p>

            <div
              className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-100/80 dark:bg-amber-900/30 dark:border-amber-700/60 p-3"
              role="note"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-800 dark:text-amber-200 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed m-0">
                {t('payment.cryptoReadiness.trc20Warning')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <a
                href={EXCHANGE_USDT_PAYMENT_HELP_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline min-h-[44px] inline-flex items-center gap-1"
                aria-label={t('payment.cryptoReadiness.fullGuideLinkNewTab')}
              >
                {t('payment.cryptoReadiness.fullGuideLink')}
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden />
              </a>
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] px-1"
              >
                {t('payment.cryptoReadiness.dismiss')}
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CryptoPaymentReadinessGuide;
