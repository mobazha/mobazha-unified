import type {
  DisplayDispute,
  DisplayOrderSettlementBreakdown,
  DisplayOrderStatus,
} from '../types/orderDisplay';
import { formatPaymentAmount } from '../services/currencyService';
import { resolvePaymentDisplayLabel } from './orderPaymentDisplay';
import { formatMinimalUnitAmountString } from './transforms/minimalUnit';

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export interface DisputeSettlementDisplayOptions {
  /** Payment coin from order (CAIP-19 or legacy code) for symbol + precision */
  paymentCoin?: string;
}

const CAIP_SUFFIX_PATTERN = /\s+crypto:[^\s]+$/i;
const TRAILING_SYMBOL_PATTERN = /\s+([A-Za-z]{2,10})$/;

export interface DisputePayoutLine {
  label: string;
  amount: string;
}

/** Headline for a closed dispute (buyer/seller/split/custom percent). */
export function getDisputeResolutionHeadline(
  dispute: Pick<DisplayDispute, 'resolution' | 'buyerPayoutPercent' | 'vendorPayoutPercent'>,
  t: TranslateFn
): string | null {
  if (dispute.resolution === 'buyer') {
    return t('order.disputeOverview.resolvedFavor', { party: t('order.buyer') });
  }
  if (dispute.resolution === 'seller') {
    return t('order.disputeOverview.resolvedFavor', { party: t('order.seller') });
  }
  if (dispute.resolution === 'split') {
    if (
      dispute.buyerPayoutPercent != null &&
      dispute.vendorPayoutPercent != null &&
      dispute.buyerPayoutPercent !== 50
    ) {
      return t('order.disputeOverview.payoutSplit', {
        buyerPercent: dispute.buyerPayoutPercent,
        vendorPercent: dispute.vendorPayoutPercent,
      });
    }
    return t('order.disputeOverview.resolvedSplit');
  }
  if (dispute.buyerPayoutPercent != null && dispute.vendorPayoutPercent != null) {
    return t('order.disputeOverview.payoutSplit', {
      buyerPercent: dispute.buyerPayoutPercent,
      vendorPercent: dispute.vendorPayoutPercent,
    });
  }
  return null;
}

export function isDisputeRulingAvailable(
  dispute:
    | Pick<
        DisplayDispute,
        'status' | 'resolution' | 'resolutionText' | 'buyerPayoutPercent' | 'vendorPayoutPercent'
      >
    | null
    | undefined
): boolean {
  if (!dispute) return false;
  return (
    dispute.status === 'resolved' ||
    !!dispute.resolution ||
    !!dispute.resolutionText ||
    dispute.buyerPayoutPercent != null ||
    dispute.vendorPayoutPercent != null
  );
}

export function isActiveCryptoDisputeStatus(status: DisplayOrderStatus): boolean {
  return status === 'disputed' || status === 'decided';
}

export function shouldShowDisputeArchiveCard(
  dispute: DisplayDispute | null | undefined,
  status: DisplayOrderStatus
): boolean {
  return !!dispute && isDisputeRulingAvailable(dispute) && !isActiveCryptoDisputeStatus(status);
}

export type DigitalEntitlementDisputePhase = 'none' | 'active' | 'resolved';

export function resolveDigitalEntitlementDisputePhase(
  status: DisplayOrderStatus,
  dispute: DisplayDispute | null | undefined
): DigitalEntitlementDisputePhase {
  if (!dispute) return 'none';
  if (isActiveCryptoDisputeStatus(status)) return 'active';
  if (isDisputeRulingAvailable(dispute)) return 'resolved';
  return 'none';
}

const TERMINAL_ORDER_STATUSES: DisplayOrderStatus[] = ['completed', 'cancelled', 'refunded'];

export function isTerminalOrderStatus(status: DisplayOrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

type DigitalDeliveryUiStatus =
  | 'not_digital'
  | 'ready'
  | 'delivered'
  | 'manual_required'
  | 'pending'
  | 'restricted'
  | null;

/** Hide stale seller auto-delivery banners after dispute resolution or terminal order states. */
export function shouldHideSellerDigitalInProgress(params: {
  status: DigitalDeliveryUiStatus;
  orderStatus?: DisplayOrderStatus;
  disputePhase: DigitalEntitlementDisputePhase;
  orderInDispute: boolean;
  isDelivered: boolean;
}): boolean {
  if (params.orderInDispute && !params.isDelivered) return true;
  if (params.isDelivered || !params.status) return false;

  const staleInProgress =
    params.status === 'pending' ||
    params.status === 'ready' ||
    (params.status === 'restricted' && params.disputePhase === 'resolved');

  if (!staleInProgress) return false;
  if (params.disputePhase === 'resolved') return true;
  if (params.orderStatus && isTerminalOrderStatus(params.orderStatus)) return true;

  return false;
}

export function formatDigitalEntitlementRestrictedReason(
  reason: string | undefined,
  t: TranslateFn,
  context: {
    disputePhase: DigitalEntitlementDisputePhase;
    resolution?: DisplayDispute['resolution'];
    buyerPayoutPercent?: number;
  }
): string | undefined {
  if (context.disputePhase === 'active') {
    if (!reason?.trim()) {
      return t('order.digital.disputeFrozenNote');
    }
    const normalized = reason.trim().toLowerCase();
    const knownKeys: Record<string, string> = {
      frozen: 'order.digital.restrictedReason.frozen',
      disputed: 'order.digital.restrictedReason.disputed',
      dispute: 'order.digital.restrictedReason.disputed',
      revoked: 'order.digital.restrictedReason.revoked',
      expired: 'order.digital.restrictedReason.expired',
    };
    const key = knownKeys[normalized];
    if (key) {
      return normalized === 'revoked' || normalized === 'frozen' || normalized.includes('dispute')
        ? t('order.digital.disputeFrozenNote')
        : t(key);
    }
    if (normalized.includes('dispute') || normalized === 'frozen') {
      return t('order.digital.disputeFrozenNote');
    }
    return reason;
  }

  if (context.disputePhase === 'resolved') {
    const normalized = reason?.trim().toLowerCase() ?? '';
    if (normalized === 'revoked') {
      if (context.resolution === 'buyer' || context.buyerPayoutPercent === 100) {
        return t('order.digital.disputeRevokedBuyerWon');
      }
      if (context.resolution === 'seller' || context.buyerPayoutPercent === 0) {
        return t('order.digital.disputeRevokedSellerWon');
      }
      return t('order.digital.disputeRevokedAfterSplit');
    }
    if (normalized === 'frozen' || normalized === 'disputed' || normalized.includes('dispute')) {
      return t('order.digital.disputeResolvedRestoring');
    }
  }

  if (!reason?.trim()) return undefined;
  const normalized = reason.trim().toLowerCase();
  const knownKeys: Record<string, string> = {
    frozen: 'order.digital.restrictedReason.frozen',
    disputed: 'order.digital.restrictedReason.disputed',
    dispute: 'order.digital.restrictedReason.disputed',
    revoked: 'order.digital.restrictedReason.revoked',
    expired: 'order.digital.restrictedReason.expired',
  };
  const key = knownKeys[normalized];
  if (key) return t(key);
  return reason;
}

function settlementLineLabel(type: string, t: TranslateFn): string {
  switch (type) {
    case 'buyer':
      return t('order.disputeDisplay.buyerReceives');
    case 'seller':
    case 'vendor':
      return t('order.disputeDisplay.sellerReceives');
    case 'moderator':
      return t('order.disputeDisplay.moderatorFee');
    case 'platform':
      return t('order.platformFee');
    case 'network_fee':
    case 'transaction_fee':
      return t('order.networkFee');
    default:
      return type;
  }
}

function isMeaningfulAmount(amount?: string): amount is string {
  if (!amount) return false;
  const trimmed = amount.trim();
  return trimmed !== '' && trimmed !== '0' && trimmed !== '0.0' && trimmed !== '0.00';
}

/** User-facing crypto/fiat label for dispute payout rows (never CAIP-19 IDs). */
export function formatDisputeMoneyAmount(rawAmount: string, paymentCoin?: string): string {
  let amount = rawAmount.trim();
  if (!amount) return amount;

  const displayLabel = resolvePaymentDisplayLabel(paymentCoin, '');

  amount = amount.replace(CAIP_SUFFIX_PATTERN, '').trim();

  const symbolMatch = amount.match(TRAILING_SYMBOL_PATTERN);
  if (symbolMatch && !symbolMatch[1].toLowerCase().startsWith('crypto')) {
    const numericPart = amount.slice(0, -symbolMatch[0].length).trim();
    const label = symbolMatch[1].toUpperCase();
    const formatted =
      formatPaymentAmount(numericPart, paymentCoin, label) ??
      formatPaymentAmount(numericPart, undefined, label);
    return formatted ?? `${numericPart} ${label}`;
  }

  if (/^\d+$/.test(amount)) {
    const formatted =
      formatMinimalUnitAmountString(amount, 18, paymentCoin) ??
      formatMinimalUnitAmountString(amount, 18, displayLabel);
    return formatted ? `${formatted} ${displayLabel}` : `${amount} ${displayLabel}`;
  }

  const formatted =
    formatPaymentAmount(amount, paymentCoin, displayLabel) ??
    formatPaymentAmount(amount, undefined, displayLabel);
  return formatted ?? `${amount} ${displayLabel}`;
}

function hasDisputeRulingPayouts(
  dispute: Pick<
    DisplayDispute,
    'buyerPayoutAmount' | 'vendorPayoutAmount' | 'moderatorPayoutAmount'
  >
): boolean {
  return (
    isMeaningfulAmount(dispute.buyerPayoutAmount) ||
    isMeaningfulAmount(dispute.vendorPayoutAmount) ||
    isMeaningfulAmount(dispute.moderatorPayoutAmount)
  );
}

function resolvePaymentCoinForBreakdown(
  settlementBreakdown: DisplayOrderSettlementBreakdown | undefined,
  options?: DisputeSettlementDisplayOptions
): string | undefined {
  return options?.paymentCoin || settlementBreakdown?.currency;
}

/**
 * Ruling payout lines for dispute UI. Prefers immutable disputeClose amounts over
 * post-settlement chain observation (settlement_action lines may be partial).
 */
export function getDisputeSettlementPayoutLines(
  dispute: DisplayDispute,
  settlementBreakdown: DisplayOrderSettlementBreakdown | undefined,
  t: TranslateFn,
  options?: DisputeSettlementDisplayOptions
): DisputePayoutLine[] {
  const paymentCoin = resolvePaymentCoinForBreakdown(settlementBreakdown, options);
  const format = (amount?: string) => (amount ? formatDisputeMoneyAmount(amount, paymentCoin) : '');

  const lines: DisputePayoutLine[] = [];
  const push = (label: string, amount?: string) => {
    if (!isMeaningfulAmount(amount)) return;
    lines.push({ label, amount: format(amount) });
  };

  if (hasDisputeRulingPayouts(dispute)) {
    push(t('order.disputeDisplay.buyerReceives'), dispute.buyerPayoutAmount);
    push(t('order.disputeDisplay.sellerReceives'), dispute.vendorPayoutAmount);
    push(t('order.disputeDisplay.moderatorFee'), dispute.moderatorPayoutAmount);
    push(t('order.platformFee'), settlementBreakdown?.platformAmount);
    push(t('order.networkFee'), settlementBreakdown?.transactionFee);
    return lines;
  }

  if (settlementBreakdown?.lines?.length) {
    return settlementBreakdown.lines
      .filter(line => isMeaningfulAmount(line.amount))
      .map(line => ({
        label: settlementLineLabel(line.type, t),
        amount: format(line.amount),
      }));
  }

  push(t('order.disputeDisplay.buyerReceives'), dispute.buyerPayoutAmount);
  push(t('order.disputeDisplay.sellerReceives'), dispute.vendorPayoutAmount);
  push(t('order.disputeDisplay.moderatorFee'), dispute.moderatorPayoutAmount);
  push(t('order.platformFee'), settlementBreakdown?.platformAmount);
  push(t('order.networkFee'), settlementBreakdown?.transactionFee);

  return lines;
}

export function getDisputeEscrowTotalLabel(
  settlementBreakdown: DisplayOrderSettlementBreakdown | undefined,
  options?: DisputeSettlementDisplayOptions
): string | null {
  if (!isMeaningfulAmount(settlementBreakdown?.escrowedAmount)) return null;
  const paymentCoin = resolvePaymentCoinForBreakdown(settlementBreakdown, options);
  return formatDisputeMoneyAmount(settlementBreakdown!.escrowedAmount!, paymentCoin);
}

/** On-chain release tx for a closed dispute (settlement action or legacy releaseTx). */
export function getDisputeReleaseTxHash(
  settlementBreakdown: DisplayOrderSettlementBreakdown | undefined,
  releaseTx?: string
): string | undefined {
  const hash = settlementBreakdown?.txHash?.trim();
  if (
    hash &&
    (settlementBreakdown?.source === 'dispute' ||
      settlementBreakdown?.source === 'settlement_action')
  ) {
    return hash;
  }
  return releaseTx?.trim() || undefined;
}
