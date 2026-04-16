import { getStandardStatusConfig, resolveStatusDisplay } from '../orderStatusConfig';

type TranslateFn = (key: string) => string;

/**
 * Compute human-readable status label from order status.
 */
export function getStatusLabel(status: string, t: TranslateFn): string {
  const config = getStandardStatusConfig(t);
  return resolveStatusDisplay(status, config).label;
}
