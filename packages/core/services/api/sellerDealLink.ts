// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Seller Deal Link management API — authenticated hosting routes.
 */

import { HOSTING_API } from '../../config/apiPaths';
import type { SellerDealLink, SellerDealLinkRequest } from '../../types/sellerDealLink';
import { normalizeSellerDealLink } from '../../utils/sellerDealLink';
import { hostingGet, hostingPost } from './helpers';

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

function unwrapRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw) {
    const data = (raw as Record<string, unknown>).data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
  }
  return (raw ?? {}) as Record<string, unknown>;
}

export async function listSellerDealLinks(options?: {
  signal?: AbortSignal;
}): Promise<SellerDealLink[]> {
  const raw = await hostingGet<unknown>(HOSTING_API.DEAL_LINKS);
  if (options?.signal?.aborted) return [];
  return unwrapList(raw).map(normalizeSellerDealLink);
}

export async function createSellerDealLink(
  body: SellerDealLinkRequest,
  options?: { signal?: AbortSignal }
): Promise<SellerDealLink> {
  const raw = await hostingPost<unknown>(HOSTING_API.DEAL_LINKS, body);
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeSellerDealLink(unwrapRecord(raw));
}

export async function activateSellerDealLink(
  dealLinkId: string,
  options?: { signal?: AbortSignal }
): Promise<SellerDealLink> {
  const raw = await hostingPost<unknown>(HOSTING_API.DEAL_LINKS_ACTIVATE(dealLinkId), undefined);
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeSellerDealLink(unwrapRecord(raw));
}
