'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '@mobazha/core';
import { Header } from '@/components';
import { getGuestOrderStatus, type GuestOrderStatus } from '@mobazha/core/services/api/guestCheckout';
import { ExternalWalletPayment, type ExternalWalletPaymentInfo } from '@/components/Payment/ExternalWalletPayment';
import { getGuestStatusConfig, resolveStatusDisplay } from '@/components/Order/orderStatusConfig';
import { renderPairedPrice } from '@mobazha/core/services/currencyService';
import { cn } from '@/lib/utils';

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
  const guestStatusCfg = useMemo(() => getGuestStatusConfig(t), [t]);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      if (!orderToken || cancelled) return;
      getGuestOrderStatus(orderToken)
        .then(res => { if (!cancelled) { setOrder(res); setError(null); } })
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

  const display = resolveStatusDisplay(order.state, guestStatusCfg);

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
          <div className="flex items-center justify-center gap-2">
            {display.icon && React.createElement(display.icon, { className: 'w-5 h-5' })}
            <p className="font-semibold text-lg">{display.label}</p>
          </div>
          {display.description && <p className="text-sm mt-1 opacity-80">{display.description}</p>}
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
                <span className="text-muted-foreground font-mono">
                  {renderPairedPrice(item.unitPrice, order.priceCurrency, order.priceCurrency, {
                    isMinimalUnit: true,
                    divisibility: order.priceDivisibility,
                  })}
                </span>
              </div>
            ))}
          </div>
          <div className="p-4 flex justify-between font-medium">
            <span>{t('guestOrder.total')}</span>
            <span className="font-mono">
              {renderPairedPrice(order.paymentAmount, order.paymentCoin, order.paymentCoin, {
                isMinimalUnit: true,
              })}
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
