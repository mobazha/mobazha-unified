/**
 * Deal Link API — buyer-facing public endpoints on mobazha_hosting.
 *
 * Public read + fee quote creation are anonymous. Acceptance requires auth and
 * an Idempotency-Key header.
 */

import { HOSTING_API } from '../../config/apiPaths';
import type {
  DealLinkAcceptanceRequest,
  DealLinkAcceptanceResult,
  DealLinkFeeQuote,
  PublicDealLink,
} from '../../types/dealLink';
import {
  normalizeDealLinkAcceptanceResult,
  normalizeDealLinkFeeQuote,
  normalizePublicDealLink,
} from '../../utils/dealLink';
import { get, post, request } from './client';
import { getAuthHeaders, getHostingUrl } from './config';

function hostingPublicGet<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const url = `${getHostingUrl()}${path}`;
  if (!options?.signal) return get<T>(url);
  return request<T>(url, { method: 'GET', signal: options.signal });
}

function hostingPublicPost<T>(
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal }
): Promise<T> {
  const url = `${getHostingUrl()}${path}`;
  if (!options?.signal) return post<T>(url, body);
  return request<T>(url, { method: 'POST', body, signal: options.signal });
}

function hostingAuthPost<T>(
  path: string,
  body: unknown,
  headers: Record<string, string>,
  options?: { signal?: AbortSignal }
): Promise<T> {
  const url = `${getHostingUrl()}${path}`;
  const mergedHeaders = { ...getAuthHeaders(), ...headers };
  if (!options?.signal) return post<T>(url, body, mergedHeaders);
  return request<T>(url, { method: 'POST', body, headers: mergedHeaders, signal: options.signal });
}

export async function getPublicDealLink(
  token: string,
  options?: { signal?: AbortSignal }
): Promise<PublicDealLink> {
  const raw = await hostingPublicGet<Record<string, unknown>>(
    HOSTING_API.PUBLIC_DEAL_LINKS(token),
    options
  );
  return normalizePublicDealLink(raw, token);
}

export async function createDealLinkFeeQuote(
  token: string,
  options?: { signal?: AbortSignal }
): Promise<DealLinkFeeQuote> {
  const raw = await hostingPublicPost<Record<string, unknown>>(
    HOSTING_API.PUBLIC_DEAL_LINKS_FEE_QUOTES(token),
    undefined,
    options
  );
  return normalizeDealLinkFeeQuote(raw);
}

export async function acceptPublicDealLink(
  token: string,
  body: DealLinkAcceptanceRequest,
  idempotencyKey: string,
  options?: { signal?: AbortSignal }
): Promise<DealLinkAcceptanceResult> {
  const raw = await hostingAuthPost<Record<string, unknown>>(
    HOSTING_API.PUBLIC_DEAL_LINKS_ACCEPT(token),
    body,
    { 'Idempotency-Key': idempotencyKey },
    options
  );
  return normalizeDealLinkAcceptanceResult(raw);
}
