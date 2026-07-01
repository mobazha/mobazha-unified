/**
 * Map low-level fetch / parse failures to seller-friendly copy.
 * Technical details stay in the console — never on the admin UI.
 */
const TECH_ERROR_RE =
  /JSON\.parse|Unexpected token|unexpected character|SyntaxError|Failed to fetch|NetworkError|Load failed/i;

const WALLET_NOT_PROVISIONED_RE = /wallet not provisioned|not provisioned/i;
const WALLET_NOT_OPEN_RE = /wallet not open|wallet-rpc unreachable/i;

export interface SanitizeErrorOptions {
  walletNotProvisioned?: string;
  walletNotOpen?: string;
  generic?: string;
}

export function sanitizeUserFacingError(
  message: string,
  options: SanitizeErrorOptions = {}
): string {
  const trimmed = message.trim();
  if (!trimmed) return options.generic ?? '';

  if (WALLET_NOT_PROVISIONED_RE.test(trimmed)) {
    return (
      options.walletNotProvisioned ??
      'Monero wallet is not set up yet. Create or restore a wallet to accept XMR payments.'
    );
  }

  if (WALLET_NOT_OPEN_RE.test(trimmed)) {
    return (
      options.walletNotOpen ??
      'Monero wallet is not open. Restart the store or complete wallet setup.'
    );
  }

  if (TECH_ERROR_RE.test(trimmed)) {
    return options.generic ?? 'Could not load wallet data. Try again in a moment.';
  }

  return trimmed;
}

export function isWalletNotProvisionedMessage(message?: string | null): boolean {
  if (!message) return false;
  return WALLET_NOT_PROVISIONED_RE.test(message);
}
