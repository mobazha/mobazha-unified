'use client';

import React, { memo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useI18n, type DisplayOrder } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface OrderDealLinkNoticeProps {
  displayOrder: DisplayOrder;
  className?: string;
}

function truncateReference(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

export const OrderDealLinkNotice = memo(function OrderDealLinkNotice({
  displayOrder,
  className,
}: OrderDealLinkNoticeProps) {
  const { t } = useI18n();
  if (!displayOrder.dealLinkID) return null;

  return (
    <section
      className={cn('rounded-xl border border-primary/20 bg-primary/5 p-4', className)}
      data-testid="order-deal-link-notice"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t('order.dealLink.title')}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {displayOrder.userRole === 'seller'
              ? t('order.dealLink.sellerBody')
              : t('order.dealLink.buyerBody')}
          </p>
          <details className="mt-2">
            <summary className="min-h-11 cursor-pointer list-none py-2 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t('order.dealLink.detailsCta')}
            </summary>
            <dl className="grid gap-2 border-t border-primary/15 pt-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t('order.dealLink.linkReference')}</dt>
                <dd className="mt-0.5 font-mono text-foreground">
                  {truncateReference(displayOrder.dealLinkID)}
                </dd>
              </div>
              {displayOrder.dealRevision ? (
                <div>
                  <dt className="text-muted-foreground">{t('order.dealLink.revision')}</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {displayOrder.dealRevision}
                  </dd>
                </div>
              ) : null}
            </dl>
          </details>
        </div>
      </div>
    </section>
  );
});
