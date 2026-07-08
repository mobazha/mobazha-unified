// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import type { DealCommissionStatement } from '../types/dealCommissionStatement';
import type { DealCommissionStatementAudience } from '../types/dealCommissionStatement';
import { useSharedDealCommissionStatements } from './useSharedDealCommissionStatements';

export interface UseDealCommissionStatementsReturn {
  statements: DealCommissionStatement[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useDealCommissionStatements(
  audience: DealCommissionStatementAudience,
  enabled = true
): UseDealCommissionStatementsReturn {
  return useSharedDealCommissionStatements(audience, enabled);
}
