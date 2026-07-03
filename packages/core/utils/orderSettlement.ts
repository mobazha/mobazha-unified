import type { AcceptDisputeSettlementContext } from '../services/api/orders';
import type { PaymentSettlementSpec } from '../types/order';

/**
 * A non-empty settlement type is an opaque backend instruction. The frontend
 * deliberately does not encode provider- or chain-specific implementation details.
 */
export function escrowTypeUsesBackendSubmittedSettlement(escrowType?: string | null): boolean {
  return Boolean(escrowType?.trim());
}

function resolveEscrowType(input: {
  escrowType?: string | null;
  settlementSpec?: PaymentSettlementSpec | null;
}): string | null | undefined {
  return input.escrowType ?? input.settlementSpec?.escrowType ?? null;
}

/**
 * Moderated orders with an opaque backend settlement type use settlement-actions
 * before complete or dispute-release. No payment-coin guessing is performed.
 */
export function orderUsesMonitoredBackendSettlement(input: {
  isModerated?: boolean;
  escrowType?: string | null;
  settlementSpec?: PaymentSettlementSpec | null;
  paymentCoin?: string;
}): boolean {
  if (!input.isModerated) return false;
  const escrowType = resolveEscrowType(input);
  if (!escrowType) return false;
  return escrowTypeUsesBackendSubmittedSettlement(escrowType);
}

/**
 * Cancelable orders with an opaque backend settlement type use settlement-actions
 * for confirm/cancel.
 */
export function orderUsesCancelableBackendSettlement(input: {
  paymentProductMode?: string | null;
  escrowType?: string | null;
  settlementSpec?: PaymentSettlementSpec | null;
  paymentCoin?: string;
}): boolean {
  const mode = (input.paymentProductMode || '').trim().toLowerCase();
  if (mode !== 'cancelable') return false;
  const escrowType = resolveEscrowType(input);
  if (!escrowType) return false;
  return escrowTypeUsesBackendSubmittedSettlement(escrowType);
}

export function buildAcceptDisputeSettlementContext(input: {
  paymentCoin?: string;
  isModerated?: boolean;
  escrowType?: string | null;
  settlementSpec?: PaymentSettlementSpec | null;
}): AcceptDisputeSettlementContext {
  return {
    paymentCoin: input.paymentCoin,
    isModerated: input.isModerated,
    escrowType: resolveEscrowType(input) ?? undefined,
  };
}
