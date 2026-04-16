'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '@mobazha/core';
import { Header } from '@/components';
import { getGuestOrderStatus, type GuestOrderStatus } from '@mobazha/core/services/api/guestCheckout';
import { ExternalWalletPayment, type ExternalWalletPaymentInfo } from '@/components/Payment/ExternalWalletPayment';
import { cn } from '@/lib/utils';

interface StateDisplay {
  label: string;
  color: string;
  description: string;
}

function useStateDisplay(t: (key: string) => string): Record<string, StateDisplay> {
  return useMemo(() => ({
    AWAITING_PAYMENT: {
      label: t('guestOrder.stateAwaitingPayment'),
      color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
      description: t('guestOrder.stateAwaitingPaymentDesc'),
    },
    PENDING_CONFIRMATION: {
      label: t('guestOrder.statePendingConfirmation'),
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      description: t('guestOrder.statePendingConfirmationDesc'),
    },
    FUNDED: {
      label: t('guestOrder.stateFunded'),
      color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
      description: t('guestOrder.stateFundedDesc'),
    },
    PROCESSING: {
      label: t('guestOrder.stateProcessing'),
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
      description: t('guestOrder.stateProcessingDesc'),
    },
    FULFILLED: {
      label: t('guestOrder.stateFulfilled'),
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
      description: t('guestOrder.stateFulfilledDesc'),
    },
    COMPLETED: {
      label: t('guestOrder.stateCompleted'),
      color: 'text-green-700 bg-green-50 dark:bg-green-900/20',
      description: t('guestOrder.stateCompletedDesc'),
    },
    EXPIRED: {
      label: t('guestOrder.stateExpired'),
      color: 'text-red-600 bg-red-50 dark:bg-red-900/20',
      description: t('guestOrder.stateExpiredDesc'),
    },
    CANCELLED: {
      label: t('guestOrder.stateCancelled'),
      color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20',
      description: t('guestOrder.stateCancelledDesc'),
    },
  }), [t]);
}

function toPaymentInfo(order: GuestOrderStatus): ExternalWalletPaymentInfo {
  return {
    paymentAddress: order.paymentAddress,
    amount: order.paymentAmount,
    coin: order.paymentCoin,
    expiresAt: order.expiresAt,
    orderID: order.orderToken,
  };
}

export default function GuestOrderPage() {
  const { orderToken } = useParams<{ orderToken: string }>();
  const { t } = useI18n();
  const [order, setOrder] = useState<GuestOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateDisplay = useStateDisplay(t);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      if (!orderToken || cancelled) return;
      getGuestOrderStatus(orderToken)
        .then(res => { if (!cancelled) { setOrder(res.data); setError(null); } })
        .catch(err => { if (!cancelled && !order) setError(err instanceof Error ? err.message : t('guestOrder.notFoundTitle')); });
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [orderToken]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="text-destructive text-4xl mb-4">!</div>
          <h2 className="text-lg font-semibold mb-2">{t('guestOrder.notFoundTitle')}</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const display = stateDisplay[order.state] ?? {
    label: order.state,
    color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20',
    description: '',
  };

  const showPaymentInfo = order.state === 'AWAITING_PAYMENT';
  const showConfirmations = order.state === 'PENDING_CONFIRMATION';
  const showTracking = order.state === 'FULFILLED' && order.trackingNumber;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">{t('guestOrder.title')}</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {t('guestOrder.tokenLabel')} {order.orderToken.slice(0, 12)}...
          </p>
        </div>

        <div className={cn('p-4 rounded-lg text-center', display.color)}>
          <p className="font-semibold text-lg">{display.label}</p>
          <p className="text-sm mt-1 opacity-80">{display.description}</p>
        </div>

        {showPaymentInfo && (
          <ExternalWalletPayment
            paymentInfo={toPaymentInfo(order)}
            tokenId={order.paymentCoin}
          />
        )}

        {showConfirmations && (
          <div className="rounded-lg border p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">{t('guestOrder.confirmations')}</p>
            <p className="text-2xl font-bold">
              {order.confirmations} / {order.requiredConfirmations}
            </p>
            {order.txHash && (
              <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                {t('guestOrder.txLabel')} {order.txHash}
              </p>
            )}
          </div>
        )}

        {showTracking && (
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium mb-1">{t('guestOrder.trackingInfo')}</p>
            <p className="text-sm">
              {order.carrier && <span className="text-muted-foreground">{order.carrier}: </span>}
              <span className="font-mono">{order.trackingNumber}</span>
            </p>
          </div>
        )}

        <div className="rounded-lg border divide-y">
          <div className="p-4">
            <p className="text-sm font-medium mb-2">{t('guestOrder.items')}</p>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1">
                <span>
                  {item.title} &times; {item.quantity}
                </span>
                <span className="text-muted-foreground font-mono">{item.unitPrice}</span>
              </div>
            ))}
          </div>
          <div className="p-4 flex justify-between font-medium">
            <span>{t('guestOrder.total')}</span>
            <span className="font-mono">
              {order.paymentAmount} {order.paymentCoin}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t('guestOrder.autoRefreshNote')}
        </p>
      </div>
    </div>
  );
}
