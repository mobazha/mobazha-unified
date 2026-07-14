// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Seller Deal Link management API — authenticated hosting routes.
 */

import { HOSTING_API } from '../../config/apiPaths';
import type { DealLinkFeeQuote } from '../../types/dealLink';
import type {
  SellerDealLink,
  SellerDealLinkOrdersPage,
  SellerDealLinkRequest,
} from '../../types/sellerDealLink';
import { normalizeDealLinkFeeQuote } from '../../utils/dealLink';
import {
  normalizeSellerDealLink,
  normalizeSellerDealLinkOrdersPage,
} from '../../utils/sellerDealLink';
import { hostingGet, hostingPost, hostingPut } from './helpers';

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

export async function getSellerDealLink(
  dealLinkId: string,
  options?: { signal?: AbortSignal }
): Promise<SellerDealLink> {
  const raw = await hostingGet<unknown>(HOSTING_API.DEAL_LINKS_BY_ID(dealLinkId));
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeSellerDealLink(unwrapRecord(raw));
}

/**
 * Persists an edit as a NEW revision (the backend increments currentRevision
 * and keeps prior versions, so orders placed against an earlier revision keep
 * their original terms). Rejected by the backend once a link is closed.
 */
export async function updateSellerDealLink(
  dealLinkId: string,
  body: SellerDealLinkRequest,
  options?: { signal?: AbortSignal }
): Promise<SellerDealLink> {
  const raw = await hostingPut<unknown>(HOSTING_API.DEAL_LINKS_BY_ID(dealLinkId), body);
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeSellerDealLink(unwrapRecord(raw));
}

/**
 * Creates — or reuses — the authoritative seller fee quote for an active Deal
 * Link. The backend returns 201 when it mints a fresh quote and 200 when the
 * current unexpired quote is still valid; both carry the same
 * `dealFeeQuoteResponse` shape, so a single normalizer covers either case. The
 * POST is deliberately user-triggered: only an active link can be quoted, and
 * the backend answers 409 for a draft/paused/closed link and 404 for a
 * foreign/missing one — both surfaced through the typed {@link ApiError}.
 */
export async function createSellerDealLinkFeeQuote(
  dealLinkId: string,
  options?: { signal?: AbortSignal }
): Promise<DealLinkFeeQuote> {
  const raw = await hostingPost<unknown>(HOSTING_API.DEAL_LINKS_FEE_QUOTES(dealLinkId), undefined);
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeDealLinkFeeQuote(unwrapRecord(raw));
}

export async function listSellerDealLinkOrders(
  dealLinkId: string,
  options?: { signal?: AbortSignal; limit?: number; offset?: number }
): Promise<SellerDealLinkOrdersPage> {
  const params = new URLSearchParams();
  if (options?.limit && options.limit > 0) params.set('limit', String(options.limit));
  if (options?.offset && options.offset > 0) params.set('offset', String(options.offset));
  const query = params.toString();
  const path = `${HOSTING_API.DEAL_LINKS_ORDERS(dealLinkId)}${query ? `?${query}` : ''}`;
  const raw = await hostingGet<unknown>(path);
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeSellerDealLinkOrdersPage(raw);
}

export async function activateSellerDealLink(
  dealLinkId: string,
  options?: { signal?: AbortSignal }
): Promise<SellerDealLink> {
  const raw = await hostingPost<unknown>(HOSTING_API.DEAL_LINKS_ACTIVATE(dealLinkId), undefined);
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeSellerDealLink(unwrapRecord(raw));
}

export async function pauseSellerDealLink(
  dealLinkId: string,
  options?: { signal?: AbortSignal }
): Promise<SellerDealLink> {
  const raw = await hostingPost<unknown>(HOSTING_API.DEAL_LINKS_PAUSE(dealLinkId), undefined);
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeSellerDealLink(unwrapRecord(raw));
}

/**
 * Retires a Deal Link into the terminal closed state. A closed link can no
 * longer be purchased, activated, paused, or edited, but its historical orders
 * remain. Closing an already-closed link is idempotent on the backend.
 */
export async function closeSellerDealLink(
  dealLinkId: string,
  options?: { signal?: AbortSignal }
): Promise<SellerDealLink> {
  const raw = await hostingPost<unknown>(HOSTING_API.DEAL_LINKS_CLOSE(dealLinkId), undefined);
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return normalizeSellerDealLink(unwrapRecord(raw));
}
