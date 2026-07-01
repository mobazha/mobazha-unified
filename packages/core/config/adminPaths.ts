import { isSovereignMode } from './env';

/**
 * Canonical admin route for seller store payment / receiving setup.
 * Sovereign uses /admin/finance (XMR wallet ops); SaaS and standalone use /admin/payments.
 */
export function getAdminStorePaymentsPath(): string {
  return isSovereignMode() ? '/admin/finance' : '/admin/payments';
}

/** Sovereign funds hub — balance overview and XMR wallet entry points. */
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
