'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Header } from '@/components';
import {
  buyerPortalTokenStorageKey,
  getGuestOrderStatus,
  type GuestOrderStatus,
} from '@mobazha/core/services/api/guestCheckout';
import {
  ExternalWalletPayment,
  type ExternalWalletPaymentInfo,
} from '@/components/Payment/ExternalWalletPayment';
import { getGuestStatusConfig, resolveStatusDisplay } from '@/components/Order/orderStatusConfig';
import { ConfirmationProgress } from '@/components/Order/ConfirmationProgress';
import {
  formatPrice,
  fromMinimalUnit,
  renderPairedPrice,
} from '@mobazha/core/services/currencyService';
import { resolveTokenIdForDisplay } from '@mobazha/core/data/tokens';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import { HelpPopover } from '@/components/GuestCheckout/HelpPopover';
import { SaveOrderLinkCard } from '@/components/GuestCheckout/SaveOrderLinkCard';
import { BuyerDigitalAssetsSection } from '@/components/Order/BuyerDigitalAssetsSection';
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

function buildGuestOrderUrl(orderToken: string, buyerPortalToken?: string): string {
  const path = `${window.location.origin}/guest-order/${encodeURIComponent(orderToken)}`;
  if (!buyerPortalToken) return path;
  return `${path}#buyerPortalToken=${encodeURIComponent(buyerPortalToken)}`;
}

function readBuyerPortalTokenFromURL(): { token?: string; shouldCleanURL: boolean } {
  const url = new URL(window.location.href);
  const fragmentParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
  const fragmentToken = fragmentParams.get('buyerPortalToken') || undefined;
  const legacyQueryToken = url.searchParams.get('buyerPortalToken') || undefined;
  return {
    token: fragmentToken || legacyQueryToken,
    shouldCleanURL: Boolean(fragmentToken || legacyQueryToken),
  };
}

function cleanBuyerPortalTokenFromAddressBar(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('buyerPortalToken');
  url.hash = '';
  const cleanPath = `${url.pathname}${url.search}`;
  window.history.replaceState(window.history.state, '', cleanPath);
}

export default function GuestOrderPage() {
  const { orderToken } = useParams<{ orderToken: string }>();
  const { t } = useI18n();
  const [order, setOrder] = useState<GuestOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buyerPortalToken, setBuyerPortalToken] = useState<string | undefined>();
  const guestStatusCfg = useMemo(() => getGuestStatusConfig(t), [t]);

  // Keep the recovery token out of Referer headers even for legacy query-link
  // visits, then strip it from the visible URL after local recovery.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // eslint-disable-next-line no-undef
    const existing = document.querySelector<HTMLMetaElement>('meta[name="referrer"]');
    const previousContent = existing?.getAttribute('content') ?? null;
    let meta = existing;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'referrer');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'no-referrer');
    return () => {
      if (!meta) return;
      if (previousContent === null) {
        meta.remove();
      } else {
        meta.setAttribute('content', previousContent);
      }
    };
  }, []);

  useEffect(() => {
    if (!orderToken || typeof window === 'undefined') return;
    const fromURL = readBuyerPortalTokenFromURL();
    const key = buyerPortalTokenStorageKey(orderToken);
    const legacyPersistedToken = window.localStorage.getItem(key) || undefined;
    const token = fromURL.token || window.sessionStorage.getItem(key) || legacyPersistedToken;
    if (token) {
      window.sessionStorage.setItem(key, token);
    }
    if (legacyPersistedToken) {
      window.localStorage.removeItem(key);
    }
    if (fromURL.shouldCleanURL) {
      cleanBuyerPortalTokenFromAddressBar();
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBuyerPortalToken(token);
  }, [orderToken]);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      if (!orderToken || cancelled) return;
      getGuestOrderStatus(orderToken)
        .then(res => {
          if (!cancelled) {
            setOrder(res);
            setError(null);
          }
        })
        .catch(err => {
          if (!cancelled && !order)
            setError(err instanceof Error ? err.message : t('guestOrder.notFoundTitle'));
        });
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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
  const coinSymbol = resolveTokenIdForDisplay(order.paymentCoin);
  const priceCur = order.priceCurrency || coinSymbol;

  const showPaymentInfo = order.state === 'AWAITING_PAYMENT' && !order.poolDetected;
  const isPoolDetected = order.state === 'AWAITING_PAYMENT' && !!order.poolDetected;
  const showConfirmations = order.state === 'PAYMENT_DETECTED' || isPoolDetected;
  const showTracking = order.state === 'SHIPPED' && order.trackingNumber;
  // Digital deliveries become available once the order is FUNDED. For a
  // physical-only order, BuyerDigitalAssetsSection short-circuits to render
  // nothing (no grants found), so it's safe to mount for any post-funded
  // state without leaking a misleading empty card.
  const showDigitalDeliveries =
    order.state === 'FUNDED' || order.state === 'SHIPPED' || order.state === 'COMPLETED';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">{t('guestOrder.title')}</h1>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <span>
              {t('guestOrder.tokenLabel')} {order.orderToken.slice(0, 12)}...
            </span>
            <HelpPopover
              title={t('guestOrder.tokenHelpTitle')}
              body={t('guestOrder.tokenHelpBody')}
              ariaLabel={t('guestOrder.tokenHelpTitle')}
            />
          </div>
        </div>

        <div className={cn('p-4 rounded-lg text-center', display.color)}>
          <div className="flex items-center justify-center gap-2">
            {display.icon && React.createElement(display.icon, { className: 'w-5 h-5' })}
            <p className="font-semibold text-lg">{display.label}</p>
          </div>
          {display.description && <p className="text-sm mt-1 opacity-80">{display.description}</p>}
        </div>

        {order.state === 'EXPIRED' && (
          <div
            role="note"
            className="rounded-lg border border-amber-300/60 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 text-sm"
          >
            <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              {t('guestOrder.expiredHelpTitle')}
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
              {t('guestOrder.expiredHelpBody')}
            </p>
          </div>
        )}

        {(order.state === 'AWAITING_PAYMENT' || order.state === 'PAYMENT_DETECTED') &&
          typeof window !== 'undefined' && (
            <SaveOrderLinkCard
              orderUrl={buildGuestOrderUrl(order.orderToken, buyerPortalToken)}
              title={t('guestOrder.saveLinkTitle')}
              description={t('guestOrder.saveLinkDescription')}
              copyLabel={t('guestOrder.saveLinkCopy')}
              copiedLabel={t('guestOrder.saveLinkCopied')}
              testId="guest-order-save-link"
            />
          )}

        {showPaymentInfo && (
          <ExternalWalletPayment paymentInfo={toPaymentInfo(order)} tokenId={coinSymbol} />
        )}

        {showConfirmations && (
          <div
            role="status"
            className="rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3 text-sm text-primary text-center"
            data-testid="do-not-pay-again"
          >
            {t('guestOrder.doNotPayAgain')}
          </div>
        )}

        {showConfirmations && (
          <ConfirmationProgress
            confirmations={order.confirmations}
            requiredConfs={order.requiredConfs}
            chainBlockTimeSec={order.chainBlockTimeSec}
            poolDetected={isPoolDetected}
            poolTxHash={order.poolTxHash}
            txHash={order.txHash}
          />
        )}

        {showDigitalDeliveries && buyerPortalToken && (
          <BuyerDigitalAssetsSection
            orderId={order.orderToken}
            buyerPortalToken={buyerPortalToken}
          />
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
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.listingTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('guestOrder.quantityLabel')} {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono flex-shrink-0">
                    {renderPairedPrice(item.unitPrice, priceCur, priceCur, {
                      isMinimalUnit: true,
                      divisibility: order.priceDivisibility,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 flex justify-between items-center font-medium">
            <span>{t('guestOrder.total')}</span>
            <div className="flex items-center gap-2">
              <TokenIcon token={coinSymbol} size={20} />
              <span className="font-mono">
                {formatPrice(fromMinimalUnit(order.paymentAmount, coinSymbol), coinSymbol, {
                  showSymbol: false,
                  showCode: true,
                })}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t('guestOrder.autoRefreshNote')}
        </p>
      </div>
    </div>
  );
}
