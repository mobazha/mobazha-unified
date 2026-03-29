const FIAT_PENDING_PREFIX = 'fiat_pending_order:';
const FIAT_PENDING_TTL_MS = 10 * 60 * 1000;

function keyFor(orderID: string): string {
  return `${FIAT_PENDING_PREFIX}${orderID}`;
}

export function markFiatPendingConfirmation(orderID: string): void {
  if (typeof window === 'undefined' || !orderID) return;
  try {
    window.sessionStorage.setItem(keyFor(orderID), String(Date.now()));
  } catch {
    // Ignore storage failures (private mode / storage restrictions).
  }
}

export function clearFiatPendingConfirmation(orderID: string): void {
  if (typeof window === 'undefined' || !orderID) return;
  try {
    window.sessionStorage.removeItem(keyFor(orderID));
  } catch {
    // Ignore storage failures.
  }
}

export function isFiatPendingConfirmation(orderID: string): boolean {
  if (typeof window === 'undefined' || !orderID) return false;
  try {
    const raw = window.sessionStorage.getItem(keyFor(orderID));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() - ts > FIAT_PENDING_TTL_MS) {
      window.sessionStorage.removeItem(keyFor(orderID));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
