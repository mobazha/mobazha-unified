'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n, type DisplayOrder } from '@mobazha/core';
import type { Order as CoreOrder, Product } from '@mobazha/core';
import { PaymentCard } from '@/components/Order';
import { RwaAssetDetail } from '@/components/RwaToken';
import { getBlockExplorerUrl } from '@/components/Order/utils';

export interface OrderPaymentCardProps {
  displayOrder: DisplayOrder & {
    onRwaCancelOrder?: () => Promise<void>;
    onRwaClaimExpired?: () => Promise<void>;
  };
  coreOrder?: CoreOrder | null;
  className?: string;
}

export const OrderPaymentCard = memo(function OrderPaymentCard({
  displayOrder: order,
  coreOrder,
  className,
}: OrderPaymentCardProps) {
  const { t } = useI18n();

  const listing = coreOrder?.contract?.orderOpen?.listings?.[0]?.listing;
  const isRwaTokenOrder = listing?.metadata?.contractType === 'RWA_TOKEN';
  const rwaProduct: Product | null =
    isRwaTokenOrder && listing
      ? {
          slug: listing.slug,
          vendorID: listing.vendorID,
          metadata: {
            version: 1,
            contractType: 'RWA_TOKEN',
            format: 'FIXED_PRICE',
            expiry: '',
            acceptedCurrencies: listing.metadata.acceptedCurrencies || [],
            pricingCurrency: listing.metadata.pricingCurrency,
            escrowTimeoutHours: 0,
          },
          item: listing.item,
        }
      : null;

  if (!order.paymentTx && !order.paymentLocked && !order.fiatPayment) return null;

  return (
    <div className={className}>
      {/* Fiat Payment */}
      {order.fiatPayment && <FiatPaymentCard order={order} />}

      {/* Traditional Payment */}
      {order.paymentTx && !order.paymentLocked && !order.fiatPayment && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-semibold text-foreground">
                {t('order.payment.title')}
              </span>
              <div className="text-xs text-muted-foreground">
                {order.timeline.find(e => e.status === 'paid')?.timestamp
                  ? new Date(
                      order.timeline.find(e => e.status === 'paid')!.timestamp
                    ).toLocaleDateString()
                  : ''}
              </div>
            </div>
            <button
              onClick={() => {
                const url = getBlockExplorerUrl(
                  order.paymentTx!,
                  order.paymentCoin || order.currency || '',
                  order.chainId
                );
                if (url) window.open(url, '_blank');
              }}
              className="text-xs text-primary hover:underline"
            >
              {t('order.viewTransaction')}
            </button>
          </div>
          <PaymentCard
            amount={order.total}
            currency={order.currency}
            paymentCoin={order.paymentCoin}
            pricingAmount={order.pricingAmount}
            pricingCurrency={order.pricingCurrency}
            txHash={order.paymentTx}
            confirmations={order.txConfirmations}
            chainId={order.chainId}
            timestamp={order.timeline.find(e => e.status === 'paid')?.timestamp}
            title={t('order.paid')}
            description={
              order.paymentProductMode === 'direct' ? t('order.directPaymentDesc') : undefined
            }
            showDivider={true}
          />
        </>
      )}

      {/* RWA Payment Locked */}
      {order.paymentLocked && <RwaPaymentLockedCard order={order} />}

      {/* RWA Asset Details */}
      {isRwaTokenOrder && rwaProduct && (
        <div className="mb-4">
          <RwaAssetDetail product={rwaProduct} showPurchaseHint={false} compact={true} />
        </div>
      )}
    </div>
  );
});

/** Internal: RWA payment locked card (extracted for readability) */
function RwaPaymentLockedCard({
  order,
}: {
  order: DisplayOrder & {
    onRwaCancelOrder?: () => Promise<void>;
    onRwaClaimExpired?: () => Promise<void>;
  };
}) {
  const { t } = useI18n();
  const locked = order.paymentLocked!;
  const completedStatuses = ['shipped', 'delivered', 'completed', 'split_resolved'];
  const isReleased = completedStatuses.includes(order.status);
  const isExpired =
    !isReleased && locked.expiresAt ? new Date(locked.expiresAt) <= new Date() : false;

  const cardColor = isReleased
    ? 'from-info/8 to-info/8 border-info/20'
    : isExpired
      ? 'from-error/8 to-error/8 border-error/20'
      : 'from-success/8 to-success/8 border-success/20';
  const textColor = isReleased ? 'text-info' : isExpired ? 'text-error' : 'text-success';
  const badgeColor = isReleased ? 'bg-info' : isExpired ? 'bg-error' : 'bg-success';
  const borderColor = isReleased
    ? 'border-info/15'
    : isExpired
      ? 'border-error/15'
      : 'border-success/15';
  const labelColor = isReleased ? 'text-info/70' : isExpired ? 'text-error/70' : 'text-success/70';
  const statusText = isReleased
    ? t('order.paymentLocked.released')
    : isExpired
      ? t('order.paymentLocked.expired')
      : t('order.paymentLocked.locked');

  return (
    <div className={`bg-gradient-to-r ${cardColor} border rounded-lg p-4 mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h4 className={`font-semibold ${textColor}`}>{t('order.paymentLocked.title')}</h4>
          {order.paymentTx && (
            <button
              onClick={() => {
                const url = getBlockExplorerUrl(
                  order.paymentTx!,
                  order.currency || '',
                  order.chainId
                );
                if (url) window.open(url, '_blank');
              }}
              className={`text-xs hover:underline ${textColor}`}
            >
              {t('order.viewTransaction')}
            </button>
          )}
        </div>
        <span className={`${badgeColor} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
          {statusText}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <Row
          label={t('order.paymentLocked.amount')}
          value={`${locked.amount} ${locked.coin}`}
          borderClass={borderColor}
          labelClass={labelColor}
          valueClass={textColor}
        />
        {order.items?.[0]?.quantity && (
          <Row
            label={t('order.paymentLocked.purchaseQuantity')}
            value={String(order.items[0].quantity)}
            borderClass={borderColor}
            labelClass={labelColor}
            valueClass={textColor}
          />
        )}
        <Row
          label={t('order.paymentLocked.token')}
          value={locked.coin}
          borderClass={borderColor}
          labelClass={labelColor}
          valueClass={textColor}
        />
        {locked.buyerReceiveAddress && (
          <Row
            label={t('order.paymentLocked.buyerAddress')}
            value={`${locked.buyerReceiveAddress.slice(0, 8)}...${locked.buyerReceiveAddress.slice(-6)}`}
            borderClass={borderColor}
            labelClass={labelColor}
            valueClass={`font-mono text-xs truncate max-w-[180px] ${textColor}`}
            title={locked.buyerReceiveAddress}
          />
        )}
        {locked.timestamp && (
          <Row
            label={t('order.paymentLocked.lockedTime')}
            value={new Date(locked.timestamp).toLocaleString()}
            borderClass={borderColor}
            labelClass={labelColor}
            valueClass={textColor}
          />
        )}
        {locked.expiresAt && !isReleased && (
          <div className="flex justify-between items-center py-1">
            <span className={labelColor}>{t('order.paymentLocked.expiresAt')}</span>
            <span className={textColor}>{new Date(locked.expiresAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Buyer actions */}
      {order.userRole === 'buyer' && !isReleased && (
        <div
          className={`mt-3 pt-3 border-t ${isExpired ? 'border-error/20' : 'border-success/20'}`}
        >
          {isExpired ? (
            <>
              <p className="text-sm text-error mb-3">{t('order.paymentLocked.expiredCanClaim')}</p>
              {order.onRwaClaimExpired && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={order.onRwaClaimExpired}
                  className="w-full"
                >
                  {t('order.paymentLocked.claimRefund')}
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-success text-sm mb-3">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('order.paymentLocked.waitingForSeller')}
              </div>
              {order.onRwaCancelOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={order.onRwaCancelOrder}
                  className="w-full"
                >
                  {t('order.paymentLocked.cancelOrder')}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {isReleased && (
        <div className="mt-3 pt-3 border-t border-info/20">
          <p className="text-sm text-info">{t('order.paymentLocked.fundsReleasedToSeller')}</p>
        </div>
      )}

      {order.userRole === 'seller' && !isExpired && !isReleased && (
        <div className="mt-3 pt-3 border-t border-success/20">
          <p className="text-sm text-success">{t('order.paymentLocked.waitingToConfirm')}</p>
        </div>
      )}
    </div>
  );
}

function getProviderPaymentUrl(provider: string, paymentID: string): string | null {
  if (!paymentID) return null;
  if (provider === 'stripe') return `https://dashboard.stripe.com/payments/${paymentID}`;
  if (provider === 'paypal') return `https://www.paypal.com/activity/payment/${paymentID}`;
  return null;
}

/** Internal: Fiat payment info card */
function FiatPaymentCard({ order }: { order: DisplayOrder }) {
  const { t } = useI18n();
  const fiat = order.fiatPayment!;
  const providerLabel = fiat.provider === 'stripe' ? 'Stripe' : 'PayPal';
  const paymentUrl = getProviderPaymentUrl(fiat.provider, fiat.paymentID);

  const paidTimestamp = order.timeline.find(e => e.status === 'paid')?.timestamp;
  const statusColor =
    order.status === 'refunded'
      ? 'text-warning'
      : order.status === 'disputed'
        ? 'text-error'
        : 'text-success';
  const statusBadgeColor =
    order.status === 'refunded'
      ? 'bg-warning'
      : order.status === 'disputed'
        ? 'bg-error'
        : 'bg-success';
  const statusText =
    order.status === 'refunded'
      ? t('order.fiatPayment.refunded')
      : order.status === 'disputed'
        ? t('order.fiatPayment.disputed')
        : t('order.fiatPayment.paid');

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/5 border border-primary/15 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground">{t('order.fiatPayment.title')}</h4>
          {paymentUrl && (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {t('order.viewTransaction')}
            </a>
          )}
        </div>
        <span
          className={`${statusBadgeColor} text-white text-xs font-semibold px-3 py-1 rounded-full`}
        >
          {statusText}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center py-1 border-b border-primary/10">
          <span className="text-muted-foreground">{t('order.fiatPayment.provider')}</span>
          <span className="font-medium text-foreground">{providerLabel}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-primary/10">
          <span className="text-muted-foreground">{t('order.fiatPayment.method')}</span>
          <span className="font-medium text-foreground">{fiat.methodLabel}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-primary/10">
          <span className="text-muted-foreground">{t('order.fiatPayment.amount')}</span>
          <span className={`font-medium ${statusColor}`}>
            {order.pricingAmount} {order.pricingCurrency}
          </span>
        </div>
        {fiat.paymentID && (
          <div className="flex justify-between items-center py-1 border-b border-primary/10">
            <span className="text-muted-foreground">{t('order.fiatPayment.transactionId')}</span>
            <span
              className="font-medium font-mono text-xs text-foreground truncate max-w-[200px]"
              title={fiat.paymentID}
            >
              {fiat.paymentID.length > 20
                ? `${fiat.paymentID.slice(0, 10)}...${fiat.paymentID.slice(-6)}`
                : fiat.paymentID}
            </span>
          </div>
        )}
        {paidTimestamp && (
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">{t('order.fiatPayment.paidAt')}</span>
            <span className="font-medium text-foreground">
              {new Date(paidTimestamp).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  borderClass,
  labelClass,
  valueClass,
  title,
}: {
  label: string;
  value: string;
  borderClass: string;
  labelClass: string;
  valueClass: string;
  title?: string;
}) {
  return (
    <div className={`flex justify-between items-center py-1 border-b ${borderClass}`}>
      <span className={labelClass}>{label}</span>
      <span className={`font-medium ${valueClass}`} title={title}>
        {value}
      </span>
    </div>
  );
}
