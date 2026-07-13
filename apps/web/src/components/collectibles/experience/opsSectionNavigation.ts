// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { OperatorCustodyMetrics, OperatorCustodyQueueId } from '@mobazha/core';
import { resolveDefaultOperatorCustodyQueue } from '@mobazha/core';

/** @deprecated Use OperatorCustodyQueueId from @mobazha/core */
export type OpsSectionId = OperatorCustodyQueueId;

export const OPS_SECTION_IDS = [
  'redemption-fulfillment',
  'mint-exceptions',
  'intake-review',
  'release-closed',
] as const satisfies readonly OperatorCustodyQueueId[];

export type OpsSectionMetrics = OperatorCustodyMetrics;

/** Urgent-queue priority for default section selection. */
export function resolveDefaultOpsSection(metrics: OpsSectionMetrics): OpsSectionId {
  return resolveDefaultOperatorCustodyQueue(metrics);
}

export function getOpsSectionDomId(sectionId: OpsSectionId): string {
  return `collectibles-ops-section-${sectionId}`;
}

export function getOpsSectionTestId(sectionId: OpsSectionId): string {
  return `collectibles-ops-section-${sectionId}`;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollOpsSectionIntoView(
  sectionId: OpsSectionId,
  options?: { prefersReducedMotion?: boolean }
): void {
  if (typeof document === 'undefined') return;

  const element = document.getElementById(getOpsSectionDomId(sectionId));
  if (!element) return;

  const reducedMotion = options?.prefersReducedMotion ?? prefersReducedMotion();
  element.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });

  const focusTarget = element.querySelector<HTMLElement>('button');
  focusTarget?.focus({ preventScroll: true });
}
