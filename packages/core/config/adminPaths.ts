/**
 * Canonical admin route for seller store payment / receiving setup.
 * All distributions use the generic payments surface. Distribution-specific
 * capabilities are projected by the backend runtime configuration.
 */
export function getAdminStorePaymentsPath(): string {
  return '/admin/payments';
}
