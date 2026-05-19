import { getPaymentCoinDisplayLabel } from '../../data';
import type { DisplayOrder } from '../../types/orderDisplay';
import type { PaymentSession } from '../../types/paymentSession';
import { recoverCryptoPaymentCoin } from './cryptoPaymentRecovery';
import { formatMinimalUnitExactAmountString } from './minimalUnit';

/** Fields used to decide whether paid-state UI describes a direct (non-moderated) payment. */
export type DirectPaymentOrderSignals = Pick<DisplayOrder, 'paymentProductMode' | 'moderator'>;

/**
 * True when funds went directly to the seller (no buyer protection / moderator).
 * Prefers payment-session `productMode` when present; otherwise falls back to order
 * contract data (`!moderator`) when the payment-session API is unavailable.
 */
export function isDirectPaymentOrder(order: DirectPaymentOrderSignals): boolean {
  if (order.paymentProductMode === 'direct') return true;
  if (order.paymentProductMode === 'moderated' || order.paymentProductMode === 'cancelable') {
    return false;
  }
  return !order.moderator;
}

function normalizeAmount(value?: string): string | undefined {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : undefined;
}

export function applyPaymentSessionToDisplayOrder(
  order: DisplayOrder,
  paymentSession: PaymentSession | null | undefined
): DisplayOrder {
  if (!paymentSession) return order;

  const rawPaymentCoin = (
    paymentSession.paymentCoin ||
    paymentSession.fundingTarget?.assetID ||
    ''
  ).trim();
  const recoveredPayment = recoverCryptoPaymentCoin({
    reportedCoin: rawPaymentCoin,
    txHash: order.paymentTx,
    toAddress: paymentSession.fundingTarget?.address || order.escrowAddress,
  });
  const paymentCoin = (recoveredPayment.paymentCoin || rawPaymentCoin).trim();
  const observedAmount = normalizeAmount(paymentSession.paymentProgress?.observedAmount);
  const expectedAmount = normalizeAmount(paymentSession.expectedAmount);
  const paymentAmountRaw = observedAmount || expectedAmount;
  const formattedPaymentAmount =
    paymentCoin && paymentAmountRaw
      ? formatMinimalUnitExactAmountString(paymentAmountRaw, paymentCoin)
      : undefined;
  const paymentAddress = (paymentSession.fundingTarget?.address || '').trim();

  return {
    ...order,
    paymentCoin: paymentCoin || order.paymentCoin,
    currency: paymentCoin ? getPaymentCoinDisplayLabel(paymentCoin) : order.currency,
    total: formattedPaymentAmount || order.total,
    paymentAmount: formattedPaymentAmount || order.paymentAmount,
    chainId: recoveredPayment.chainId || order.chainId,
    escrowAddress: paymentAddress || order.escrowAddress,
    paymentSettlementMode: paymentSession.settlementMode,
    paymentProductMode: paymentSession.productMode,
  };
}
