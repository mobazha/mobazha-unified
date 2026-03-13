'use client';

import React, { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n, getDisputeTimeoutDetails, type DisplayOrder } from '@mobazha/core';

export interface OrderDisputeBannerProps {
  displayOrder: DisplayOrder;
  onOpenDispute?: () => void;
  onResolve?: (decision: 'buyer' | 'seller' | 'split') => void;
  className?: string;
}

export const OrderDisputeBanner = memo(function OrderDisputeBanner({
  displayOrder: order,
  onOpenDispute,
  onResolve,
  className,
}: OrderDisputeBannerProps) {
  const { t } = useI18n();

  const canOpenDispute =
    order.userRole === 'buyer' &&
    ['paid', 'processing', 'shipped', 'delivered'].includes(order.status) &&
    !order.dispute;

  const canResolveDispute = order.userRole === 'moderator' && order.status === 'disputed';

  const isFiatDispute = !!order.fiatPayment && order.status === 'disputed';
  const fiatDisputeDashboardUrl = useMemo(() => {
    if (!isFiatDispute || !order.fiatPayment) return '';
    return order.fiatPayment.provider === 'stripe'
      ? 'https://dashboard.stripe.com/disputes'
      : 'https://www.paypal.com/resolutioncenter';
  }, [isFiatDispute, order.fiatPayment]);

  return (
    <div className={className}>
      {/* Active dispute banner */}
      {order.dispute && (
        <div className="p-3 sm:p-4 bg-error/8 border border-error/20 rounded-lg mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-error mb-0.5 text-sm sm:text-base">
                {t('order.disputeOpen')}
              </h3>
              <p className="text-xs sm:text-sm text-error">{order.dispute.claim}</p>
              <p className="text-xs text-error mt-0.5">
                {t('order.initiatedBy', { party: order.dispute.initiator })} •{' '}
                {t('order.disputeStatus', { status: order.dispute.status })}
              </p>
              {isFiatDispute && order.userRole === 'seller' && (
                <a
                  href={fiatDisputeDashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-error underline mt-1.5 hover:text-error/80"
                >
                  {t('order.dispute.viewInProviderDashboard')}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
            {canResolveDispute && onResolve && (
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => onResolve('buyer')} className="text-xs">
                  {t('order.favorBuyer')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve('seller')}
                  className="text-xs"
                >
                  {t('order.favorSeller')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onResolve('split')}
                  className="text-xs"
                >
                  {t('order.splitFunds')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispute timeout warning */}
      {onOpenDispute && canOpenDispute && !order.dispute && (
        <DisputeTimeoutCard createdAt={order.createdAt} onOpenDispute={onOpenDispute} />
      )}
    </div>
  );
});

function DisputeTimeoutCard({
  createdAt,
  onOpenDispute,
}: {
  createdAt: string;
  onOpenDispute: () => void;
}) {
  const { t } = useI18n();
  const timeoutDetails = useMemo(() => getDisputeTimeoutDetails(createdAt), [createdAt]);

  if (timeoutDetails.isExpired) return null;

  return (
    <div className="mb-4 p-3 bg-warning/8 border border-warning/20 rounded-lg">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-3.5 h-3.5 text-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="flex-1 text-xs text-warning leading-snug">
          {t('order.dispute.escrowHint', { time: timeoutDetails.timeRemainingStr })}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-destructive text-destructive hover:bg-destructive/10 font-medium"
        onClick={onOpenDispute}
        data-testid="order-detail-open-dispute"
      >
        {t('order.openDispute')}
      </Button>
    </div>
  );
}
