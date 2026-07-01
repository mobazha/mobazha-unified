import { getPaymentCoinDisplayLabel, parseCanonicalPaymentCoin } from '../../data';
import type { DisplayOrder } from '../../types/orderDisplay';
import type { PaymentSession } from '../../types/paymentSession';
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

/** Treat blank and zero-like strings as absent (note: "0" is truthy in JS). */
function normalizeAmount(value?: string): string | undefined {
  const trimmed = (value || '').trim();
  if (!trimmed || /^0+(\.0+)?$/.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Resolve a display-ready payment amount from the payment session.
 * Session payloads may use standard-unit decimals (EVM) or minimal-unit integers (UTXO).
 */
function resolvePaymentSessionAmount(
  session: PaymentSession,
  paymentCoin: string
): string | undefined {
  const observed = normalizeAmount(session.paymentProgress?.observedAmount);
  const expected =
    normalizeAmount(session.expectedAmount) ?? normalizeAmount(session.fundingTarget?.amount);
  const raw = observed ?? expected;
  if (!raw) return undefined;

  // Standard-unit decimal string (e.g. EVM checkout sessions)
  if (raw.includes('.')) return raw;

  // Minimal-unit integer string (e.g. satoshis)
  if (/^\d+$/.test(raw)) {
    return formatMinimalUnitExactAmountString(raw, paymentCoin) ?? raw;
  }

  return raw;
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
  const paymentCoin = rawPaymentCoin;
  const parsedPaymentCoin = paymentCoin ? parseCanonicalPaymentCoin(paymentCoin) : null;
  const paymentChainId =
    parsedPaymentCoin?.namespace === 'eip155' ? Number(parsedPaymentCoin.chainRef) : undefined;
  const sessionAmount = paymentCoin
    ? resolvePaymentSessionAmount(paymentSession, paymentCoin)
    : undefined;
  const paymentAddress = (paymentSession.fundingTarget?.address || '').trim();
  const hasCanonicalPaidAmount =
    !!order.paymentTx &&
    !!normalizeAmount(order.paymentAmount) &&
    !!normalizeAmount(order.total) &&
    !!paymentCoin &&
    order.paymentCoin?.trim() === paymentCoin;

  return {
    ...order,
    paymentCoin: paymentCoin || order.paymentCoin,
    currency: paymentCoin ? getPaymentCoinDisplayLabel(paymentCoin) : order.currency,
    total: hasCanonicalPaidAmount ? order.total : (sessionAmount ?? order.total),
    paymentAmount: hasCanonicalPaidAmount
      ? order.paymentAmount
      : (sessionAmount ?? order.paymentAmount),
    chainId: Number.isFinite(paymentChainId) ? paymentChainId : order.chainId,
    escrowAddress: paymentAddress || order.escrowAddress,
    paymentSettlementMode: paymentSession.settlementMode,
    paymentProductMode: paymentSession.productMode,
    isModerated: paymentSession.productMode === 'moderated' || order.isModerated,
  };
}
