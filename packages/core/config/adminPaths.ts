import { isOutpostMode } from './env';

/**
 * Canonical admin route for seller store payment / receiving setup.
 * Outpost uses /admin/finance (XMR wallet ops); SaaS and standalone use /admin/payments.
 */
export function getAdminStorePaymentsPath(): string {
  return isOutpostMode() ? '/admin/finance' : '/admin/payments';
}

/** Outpost funds hub — balance overview and XMR wallet entry points. */
export function getAdminFinancePath(): string {
  return '/admin/finance';
}

export function getAdminXmrWalletPath(): string {
  return `${getAdminFinancePath()}/xmr-wallet`;
}

export function getAdminXmrWithdrawPath(): string {
  return `${getAdminFinancePath()}/xmr-withdraw`;
}

export function getAdminXmrSecretsPath(): string {
  return `${getAdminFinancePath()}/xmr-secrets`;
}

export function getAdminXmrTransfersPath(): string {
  return `${getAdminFinancePath()}/xmr-transfers`;
}
