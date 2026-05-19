import { getPaymentCoinDisplayLabel, getTokenByPaymentCoin, getTokenDecimals } from '../../data';

function formatMinimalUnitFixed(
  rawAmount: string,
  decimals: number,
  displayDecimals: number,
  trimTrailingZeros = false
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
  const fractionalPart = padded.slice(-displayDecimals);

  if (!trimTrailingZeros) {
    return `${integerPart}.${fractionalPart}`;
  }

  const trimmedFractionalPart = fractionalPart.replace(/0+$/, '');
  return trimmedFractionalPart ? `${integerPart}.${trimmedFractionalPart}` : integerPart;
}

function smartDisplayDecimalsForMinimalUnit(
  rawAmount: string,
  decimals: number,
  desiredDecimals: number,
  significantDigits = 4
): number {
  if (decimals <= desiredDecimals) return decimals;

  const normalized = rawAmount.replace(/^0+/, '') || '0';
  if (normalized === '0') return desiredDecimals;
  if (normalized.length > decimals) return desiredDecimals;

  const fractional = normalized.padStart(decimals, '0');
  const firstNonZero = fractional.search(/[1-9]/);
  if (firstNonZero < 0) return desiredDecimals;

  const requiredDecimals = firstNonZero + significantDigits;
  return Math.min(Math.max(requiredDecimals, desiredDecimals), decimals);
}

export function formatMinimalUnitAmountString(
  rawAmount: string,
  divisibility = 2,
  coin?: string
): string | undefined {
  const trimmed = rawAmount.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;

  const token = coin ? getTokenByPaymentCoin(coin) : undefined;
  const decimals = Math.max(0, Math.floor(token?.decimals ?? divisibility));
  const baseDisplayDecimals = decimals >= 6 ? 2 : Math.min(decimals, 8);
  const displayDecimals = smartDisplayDecimalsForMinimalUnit(
    trimmed,
    decimals,
    baseDisplayDecimals
  );

  return formatMinimalUnitFixed(trimmed, decimals, displayDecimals);
}

export function formatMinimalUnitExactAmountString(
  rawAmount: string,
  coin?: string
): string | undefined {
  const trimmed = rawAmount.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;

  const token = coin ? getTokenByPaymentCoin(coin) : undefined;
  const decimals = Math.max(
    0,
    Math.floor(
      token?.decimals ?? getTokenDecimals(getPaymentCoinDisplayLabel(coin || '') || coin || '')
    )
  );

  return formatMinimalUnitFixed(trimmed, decimals, decimals, true);
}
