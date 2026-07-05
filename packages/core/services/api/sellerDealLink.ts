/**
 * Seller Deal Link management API — authenticated hosting routes.
 */

import { HOSTING_API } from '../../config/apiPaths';
import type { SellerDealLink } from '../../types/sellerDealLink';
import { normalizeSellerDealLink } from '../../utils/sellerDealLink';
import { hostingGet } from './helpers';

function unwrapList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
    );
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw) {
    const data = (raw as Record<string, unknown>).data;
    if (Array.isArray(data)) {
      return data.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
      );
    }
  }
  return [];
}

export async function listSellerDealLinks(options?: {
  signal?: AbortSignal;
}): Promise<SellerDealLink[]> {
  const raw = await hostingGet<unknown>(HOSTING_API.DEAL_LINKS);
  if (options?.signal?.aborted) return [];
  return unwrapList(raw).map(normalizeSellerDealLink);
}
