import { getPaymentCoinDisplayLabel, getTokenByPaymentCoin, getTokenDecimals } from '../../data';
import type { DisplayOrder } from '../../types/orderDisplay';
import type { PaymentSession } from '../../types/paymentSession';
import { recoverCryptoPaymentCoin } from './cryptoPaymentRecovery';

function normalizeAmount(value?: string): string | undefined {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : undefined;
}

function formatMinimalUnitFixed(
  rawAmount: string,
  decimals: number,
  displayDecimals: number
): string {
  let amount = BigInt(rawAmount);

  if (decimals > displayDecimals) {
    const divisor = BigInt(10) ** BigInt(decimals - displayDecimals);
    const quotient = amount / divisor;
    const remainder = amount % divisor;
    amount = remainder * BigInt(2) >= divisor ? quotient + BigInt(1) : quotient;
  } else if (displayDecimals > decimals) {
    amount *= BigInt(10) ** BigInt(displayDecimals - decimals);
  }

  const rendered = amount.toString();
  if (displayDecimals === 0) return rendered;

  const padded = rendered.padStart(displayDecimals + 1, '0');
  const integerPart = padded.slice(0, -displayDecimals);
  const fractionalPart = padded.slice(-displayDecimals).replace(/0+$/, '');
  return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
}

function formatMinimalUnitAmountString(rawAmount: string, coin?: string): string | undefined {
  const trimmed = rawAmount.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }

  const token = coin ? getTokenByPaymentCoin(coin) : undefined;
  const displayLabel = coin ? getPaymentCoinDisplayLabel(coin) : '';
  const decimals = Math.max(
    0,
    Math.floor(token?.decimals ?? (displayLabel ? getTokenDecimals(displayLabel) : 0))
  );

  return formatMinimalUnitFixed(trimmed, decimals, decimals);
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
      ? formatMinimalUnitAmountString(paymentAmountRaw, paymentCoin)
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
