// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

export interface CollateralOperatorScopeSnapshot {
  scopeKey: string;
  enabled: boolean;
  generation: number;
}

export function normalizeCollateralOperatorScopeKey(scopeKey?: string | null): string {
  return scopeKey?.trim() ?? '';
}

export function createCollateralOperatorScopeSnapshot(
  scopeKey: string,
  enabled: boolean,
  generation = 0
): CollateralOperatorScopeSnapshot {
  return { scopeKey, enabled, generation };
}

export function isCollateralOperatorScopeStale(
  request: Pick<CollateralOperatorScopeSnapshot, 'scopeKey' | 'enabled' | 'generation'>,
  current: CollateralOperatorScopeSnapshot
): boolean {
  if (!current.enabled) return true;
  return request.generation !== current.generation || request.scopeKey !== current.scopeKey;
}

export function shouldResetCollateralOperatorPrincipalState(
  previous: CollateralOperatorScopeSnapshot,
  next: CollateralOperatorScopeSnapshot
): boolean {
  return (
    previous.generation !== next.generation ||
    previous.scopeKey !== next.scopeKey ||
    previous.enabled !== next.enabled
  );
}

export class CollateralOperatorScopeChangedError extends Error {
  constructor() {
    super('Collateral operator scope changed before the operation completed.');
    this.name = 'CollateralOperatorScopeChangedError';
  }
}

export function isCollateralOperatorScopeChangedError(error: unknown): boolean {
  return error instanceof CollateralOperatorScopeChangedError;
}
