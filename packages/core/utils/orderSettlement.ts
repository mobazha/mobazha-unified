import type { AcceptDisputeSettlementContext } from '../services/api/orders';
import type { PaymentSettlementSpec } from '../types/order';

const BACKEND_SUBMITTED_ESCROW_TYPES = new Set(['managed_escrow', 'solana_escrow', 'utxo_script']);

/** configured backend settlement types use backend-submitted settlement actions. */
export function escrowTypeUsesBackendSubmittedSettlement(escrowType?: string | null): boolean {
  if (!escrowType) return false;
  return BACKEND_SUBMITTED_ESCROW_TYPES.has(escrowType.trim().toLowerCase());
}

function resolveEscrowType(input: {
  escrowType?: string | null;
  settlementSpec?: PaymentSettlementSpec | null;
}): string | null | undefined {
  return input.escrowType ?? input.settlementSpec?.escrowType ?? null;
}

/**
 * Moderated managed settlement / Solana Anchor / UTXO orders use settlement-actions before complete or dispute-release.
 * Requires escrowType on the payment settlement spec; no payment-coin guessing.
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
 * Cancelable managed settlement / Solana orders use settlement-actions for confirm/cancel.
 * Mirrors backend settlement service (CANCELABLE method only).
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
