import type { AcceptDisputeSettlementContext } from '../services/api/orders';
import type { PaymentSettlementSpec } from '../types/order';

/** Community Edition uses standard order endpoints for every supported rail. */
export function escrowTypeUsesBackendSubmittedSettlement(escrowType?: string | null): boolean {
  void escrowType;
  return false;
}

function resolveEscrowType(input: {
  escrowType?: string | null;
  settlementSpec?: PaymentSettlementSpec | null;
}): string | null | undefined {
  return input.escrowType ?? input.settlementSpec?.escrowType ?? null;
}

/**
 * Community Edition never routes moderated orders through private settlement providers.
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
 * Community Edition never routes cancelable orders through private settlement providers.
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
