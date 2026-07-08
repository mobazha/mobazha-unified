// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

export const DEAL_LINKS_TABS = ['links', 'programs', 'attribution'] as const;

export type DealLinksTab = (typeof DEAL_LINKS_TABS)[number];

export const PROGRAM_STATUS_FILTERS = ['all', 'active', 'paused', 'draft'] as const;

export type ProgramStatusFilter = (typeof PROGRAM_STATUS_FILTERS)[number];

export const ATTRIBUTION_STATUS_FILTERS = [
  'all',
  'observed',
  'pending_review',
  'reversed',
  'settled',
  'disputed',
] as const;

export type AttributionStatusFilter = (typeof ATTRIBUTION_STATUS_FILTERS)[number];

export function resolveDealLinksTab(value: string | null): DealLinksTab {
  if (value && (DEAL_LINKS_TABS as readonly string[]).includes(value)) {
    return value as DealLinksTab;
  }
  return 'links';
}

export function resolveProgramStatusFilter(value: string | null): ProgramStatusFilter {
  if (value && (PROGRAM_STATUS_FILTERS as readonly string[]).includes(value)) {
    return value as ProgramStatusFilter;
  }
  return 'all';
}

export function resolveAttributionStatusFilter(value: string | null): AttributionStatusFilter {
  if (value && (ATTRIBUTION_STATUS_FILTERS as readonly string[]).includes(value)) {
    return value as AttributionStatusFilter;
  }
  return 'all';
}

export const DEAL_LINKS_PROGRAM_STATUS_PARAM = 'programStatus';
export const DEAL_LINKS_ATTRIBUTION_STATUS_PARAM = 'attributionStatus';

/** Deep-link into the most actionable attribution filter for exception badges. */
export function buildDealLinksAttributionAttentionHref(counts: {
  pendingReview: number;
  disputed: number;
}): string {
  const params = new URLSearchParams();
  params.set('tab', 'attribution');
  if (counts.pendingReview > 0) {
    params.set(DEAL_LINKS_ATTRIBUTION_STATUS_PARAM, 'pending_review');
  } else if (counts.disputed > 0) {
    params.set(DEAL_LINKS_ATTRIBUTION_STATUS_PARAM, 'disputed');
  }
  return `/admin/deal-links?${params.toString()}`;
}
