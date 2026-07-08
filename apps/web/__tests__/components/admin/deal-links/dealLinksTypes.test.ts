// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';

import {
  resolveAttributionStatusFilter,
  resolveDealLinksTab,
  resolveProgramStatusFilter,
  buildDealLinksAttributionAttentionHref,
} from '@/components/admin/deal-links/dealLinksTypes';

describe('dealLinksTypes', () => {
  it('resolveDealLinksTab falls back to links', () => {
    expect(resolveDealLinksTab(null)).toBe('links');
    expect(resolveDealLinksTab('invalid')).toBe('links');
    expect(resolveDealLinksTab('programs')).toBe('programs');
    expect(resolveDealLinksTab('attribution')).toBe('attribution');
    expect(resolveDealLinksTab('rewards')).toBe('links');
  });

  it('resolveProgramStatusFilter validates known values', () => {
    expect(resolveProgramStatusFilter(null)).toBe('all');
    expect(resolveProgramStatusFilter('paused')).toBe('paused');
    expect(resolveProgramStatusFilter('unknown')).toBe('all');
  });

  it('resolveAttributionStatusFilter validates known values', () => {
    expect(resolveAttributionStatusFilter(null)).toBe('all');
    expect(resolveAttributionStatusFilter('pending_review')).toBe('pending_review');
    expect(resolveAttributionStatusFilter('unknown')).toBe('all');
  });

  it('buildDealLinksAttributionAttentionHref prefers pending review filter', () => {
    expect(buildDealLinksAttributionAttentionHref({ pendingReview: 2, disputed: 5 })).toBe(
      '/admin/deal-links?tab=attribution&attributionStatus=pending_review'
    );
  });

  it('buildDealLinksAttributionAttentionHref falls back to disputed filter', () => {
    expect(buildDealLinksAttributionAttentionHref({ pendingReview: 0, disputed: 3 })).toBe(
      '/admin/deal-links?tab=attribution&attributionStatus=disputed'
    );
  });

  it('buildDealLinksAttributionAttentionHref opens attribution tab when no exceptions', () => {
    expect(buildDealLinksAttributionAttentionHref({ pendingReview: 0, disputed: 0 })).toBe(
      '/admin/deal-links?tab=attribution'
    );
  });
});
