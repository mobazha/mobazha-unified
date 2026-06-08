import { isFiatPaymentCoin } from '../data';
import { ApiError } from '../services/api/client';
import type { Order } from '../types/order';
import type { DisplayOrder } from '../types/orderDisplay';
import type { PaymentSession } from '../types/paymentSession';
import { isTerminalOrderStatus } from './disputeRulingDisplay';

export const REFUND_ADDRESS_REQUIRED_CODE = 'REFUND_ADDRESS_REQUIRED' as const;

/** Resolve the buyer-declared crypto refund destination from order + session views. */
export function resolveBuyerRefundAddress(
  coreOrder: Order | null | undefined,
  paymentSession?: PaymentSession | null
): string {
  const fromSession = paymentSession?.refundAddress?.trim();
  if (fromSession) return fromSession;

  const fromContract = coreOrder?.contract?.refundAddress?.trim();
  if (fromContract) return fromContract;

  const fromPaymentSent = coreOrder?.contract?.paymentSent?.refundAddress?.trim();
  if (fromPaymentSent) return fromPaymentSent;

  return '';
}

/** True when an API/action error indicates a missing buyer refund address. */
export function isRefundAddressRequiredError(err: unknown): boolean {
  if (err instanceof ApiError && err.code === REFUND_ADDRESS_REQUIRED_CODE) {
    return true;
  }
  const message =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : null;
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('refund address is required') ||
    lower.includes('refund wallet required') ||
    lower.includes('buyer must provide a refund address') ||
    lower.includes('no buyer refund address') ||
    lower.includes('buyer refund address is not available')
  );
}

function isCryptoBuyerOrder(displayOrder: DisplayOrder, coreOrder: Order): boolean {
  if (displayOrder.fiatPayment) return false;
  const paymentCoin = displayOrder.paymentCoin || coreOrder.contract?.paymentSent?.coin;
  return !paymentCoin || !isFiatPaymentCoin(paymentCoin);
}

function hasCryptoPaymentActivity(displayOrder: DisplayOrder, coreOrder: Order): boolean {
  if (coreOrder.funded) return true;
  if (coreOrder.contract?.paymentSent) return true;
  if (displayOrder.paymentTx) return true;
  if (displayOrder.awaitingPaymentVerification) return true;
  if (displayOrder.paymentVerificationStatus === 'verified') return true;
  return false;
}

/** True when the buyer must declare a refund wallet before cancel / refund / dispute payout. */
export function buyerNeedsRefundAddress(input: {
  displayOrder: DisplayOrder | null | undefined;
  coreOrder: Order | null | undefined;
  paymentSession?: PaymentSession | null;
  /** Pass false while the payment session query is still loading. */
  paymentSessionKnown?: boolean;
}): boolean {
  const { displayOrder, coreOrder, paymentSession, paymentSessionKnown = true } = input;
  if (!displayOrder || !coreOrder) return false;
  if (displayOrder.userRole !== 'buyer') return false;
  if (isTerminalOrderStatus(displayOrder.status)) return false;
  if (!isCryptoBuyerOrder(displayOrder, coreOrder)) return false;
  if (!hasCryptoPaymentActivity(displayOrder, coreOrder)) return false;
  if (!paymentSessionKnown) return false;

  if (paymentSession?.refundRequiresInput) return true;
  if (resolveBuyerRefundAddress(coreOrder, paymentSession) !== '') return false;
  if (paymentSession === null) return true;
  return false;
}

/** Whether the order detail page should show a read-only refund destination card. */
export function shouldShowRefundDestination(input: {
  displayOrder: DisplayOrder | null | undefined;
  coreOrder: Order | null | undefined;
  paymentSession?: PaymentSession | null;
  paymentSessionKnown?: boolean;
}): boolean {
  const { displayOrder, coreOrder, paymentSession, paymentSessionKnown = true } = input;
  if (!displayOrder || !coreOrder) return false;
  if (displayOrder.userRole !== 'buyer') return false;
  if (!isCryptoBuyerOrder(displayOrder, coreOrder)) return false;
  if (!paymentSessionKnown) return false;
  if (buyerNeedsRefundAddress({ displayOrder, coreOrder, paymentSession, paymentSessionKnown })) {
    return false;
  }
  return resolveBuyerRefundAddress(coreOrder, paymentSession) !== '';
}
