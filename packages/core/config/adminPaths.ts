import { isOutpostMode } from './env';

/**
 * Canonical admin route for seller store payment / receiving setup.
 * Outpost uses /admin/finance (XMR wallet ops); SaaS and standalone use /admin/payments.
 */
export function getAdminStorePaymentsPath(): string {
  return isOutpostMode() ? '/admin/finance' : '/admin/payments';
}
