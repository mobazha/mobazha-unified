/**
 * Deal Link single-level attribution API — mobazha_hosting platform routes.
 */

import { HOSTING_API } from '../../config/apiPaths';
import type {
  DealAttributionClaim,
  DealPromotionLink,
  DealPromotionProgram,
  DealPromotionProgramRequest,
  PublicDealPromotionLink,
} from '../../types/dealPromotion';
import {
  normalizeDealAttributionClaim,
  normalizeDealPromotionLink,
  normalizeDealPromotionProgram,
  normalizePublicDealPromotionLink,
} from '../../utils/dealPromotion';
import { get, post, request } from './client';
import { getAuthHeaders, getHostingUrl } from './config';
import { hostingGet, hostingPost } from './helpers';

function hostingPublicGet<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const url = `${getHostingUrl()}${path}`;
  if (!options?.signal) return get<T>(url);
  return request<T>(url, { method: 'GET', signal: options.signal });
}

function hostingPublicPost<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const url = `${getHostingUrl()}${path}`;
  if (!options?.signal) return post<T>(url, undefined);
  return request<T>(url, { method: 'POST', signal: options.signal });
}

function unwrapList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
    );
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw) {
    const data = (raw as Record<string, unknown>).data;
    return unwrapList(data);
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

export async function listDealPromotionPrograms(options?: {
  signal?: AbortSignal;
}): Promise<DealPromotionProgram[]> {
  const raw = await hostingGet<unknown>(HOSTING_API.DEAL_PROMOTION_PROGRAMS);
  if (options?.signal?.aborted) return [];
  return unwrapList(raw).map(normalizeDealPromotionProgram);
}

export async function createDealPromotionProgram(
  body: DealPromotionProgramRequest,
  options?: { signal?: AbortSignal }
): Promise<DealPromotionProgram> {
  const raw = await hostingPost<unknown>(HOSTING_API.DEAL_PROMOTION_PROGRAMS, body);
  if (options?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  return normalizeDealPromotionProgram(unwrapRecord(raw));
}

export async function activateDealPromotionProgram(
  programId: string,
  options?: { signal?: AbortSignal }
): Promise<DealPromotionProgram> {
  const raw = await hostingPost<unknown>(
    HOSTING_API.DEAL_PROMOTION_PROGRAMS_ACTIVATE(programId),
    undefined
  );
  if (options?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  return normalizeDealPromotionProgram(unwrapRecord(raw));
}

export async function pauseDealPromotionProgram(
  programId: string,
  options?: { signal?: AbortSignal }
): Promise<DealPromotionProgram> {
  const raw = await hostingPost<unknown>(
    HOSTING_API.DEAL_PROMOTION_PROGRAMS_PAUSE(programId),
    undefined
  );
  if (options?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  return normalizeDealPromotionProgram(unwrapRecord(raw));
}

export async function createDealPromotionLink(
  programId: string,
  options?: { signal?: AbortSignal }
): Promise<DealPromotionLink> {
  const url = `${getHostingUrl()}${HOSTING_API.DEAL_PROMOTION_PROGRAMS_LINKS(programId)}`;
  const raw = options?.signal
    ? await request<unknown>(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        signal: options.signal,
      })
    : await hostingPost<unknown>(HOSTING_API.DEAL_PROMOTION_PROGRAMS_LINKS(programId), undefined);
  return normalizeDealPromotionLink(unwrapRecord(raw));
}

export async function getPublicDealPromotionLink(
  token: string,
  options?: { signal?: AbortSignal }
): Promise<PublicDealPromotionLink> {
  const raw = await hostingPublicGet<unknown>(
    HOSTING_API.PUBLIC_DEAL_PROMOTION_LINKS(token),
    options
  );
  return normalizePublicDealPromotionLink(unwrapRecord(raw));
}

export async function issueDealAttributionClaim(
  token: string,
  options?: { signal?: AbortSignal }
): Promise<DealAttributionClaim> {
  const raw = await hostingPublicPost<unknown>(
    HOSTING_API.PUBLIC_DEAL_PROMOTION_LINKS_CLAIMS(token),
    options
  );
  return normalizeDealAttributionClaim(unwrapRecord(raw));
}
