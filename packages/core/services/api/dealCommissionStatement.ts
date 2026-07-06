// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Deal Link provisional commission statements — mobazha_hosting platform routes.
 */

import { HOSTING_API } from '../../config/apiPaths';
import type { components } from '../../types/api-generated';
import type {
  DealCommissionStatement,
  DealCommissionStatementAudience,
} from '../../types/dealCommissionStatement';
import { normalizeDealCommissionStatement } from '../../utils/dealCommissionStatement';
import { hostingGet } from './helpers';

type DealCommissionStatementPayload = components['schemas']['Platform_DealCommissionEntryResponse'];

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
  throw new Error('Invalid Deal commission statement response');
}

function audiencePath(audience: DealCommissionStatementAudience): string {
  return audience === 'seller'
    ? HOSTING_API.DEAL_COMMISSION_STATEMENTS_SELLER
    : HOSTING_API.DEAL_COMMISSION_STATEMENTS_PROMOTER;
}

export async function listDealCommissionStatements(
  audience: DealCommissionStatementAudience
): Promise<DealCommissionStatement[]> {
  const raw = await hostingGet<DealCommissionStatementPayload[]>(audiencePath(audience));
  return unwrapList(raw).map(normalizeDealCommissionStatement);
}

export async function listSellerDealCommissionStatements(): Promise<DealCommissionStatement[]> {
  return listDealCommissionStatements('seller');
}

export async function listPromoterDealCommissionStatements(): Promise<DealCommissionStatement[]> {
  return listDealCommissionStatements('promoter');
}
