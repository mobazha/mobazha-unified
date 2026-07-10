// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { HOSTING_API } from '../../config/apiPaths';
import type { SellerAffiliateProgramRequest } from '../../types/sellerAffiliate';
import {
  normalizePublicSellerAffiliateLink,
  normalizeSellerAffiliateLink,
  normalizeSellerAffiliateProgram,
  normalizeSellerAffiliateReferralSession,
  normalizeSellerAffiliateStatementLine,
  unwrapSellerAffiliateList,
} from '../../utils/sellerAffiliate';
import { get, post } from './client';
import { getHostingUrl } from './config';
import { hostingGet, hostingPost, hostingPut } from './helpers';

export async function getSellerAffiliateProgram() {
  return normalizeSellerAffiliateProgram(
    await hostingGet<unknown>(HOSTING_API.SELLER_AFFILIATE_PROGRAM)
  );
}

export async function putSellerAffiliateProgram(body: SellerAffiliateProgramRequest) {
  return normalizeSellerAffiliateProgram(
    await hostingPut<unknown>(HOSTING_API.SELLER_AFFILIATE_PROGRAM, body)
  );
}

export async function createSellerAffiliateLink(programID: string) {
  return normalizeSellerAffiliateLink(
    await hostingPost<unknown>(HOSTING_API.SELLER_AFFILIATE_PROGRAM_LINKS(programID))
  );
}

export async function getPublicSellerAffiliateLink(token: string) {
  return normalizePublicSellerAffiliateLink(
    await get<unknown>(`${getHostingUrl()}${HOSTING_API.PUBLIC_SELLER_AFFILIATE_LINK(token)}`)
  );
}

export async function createSellerAffiliateReferralSession(token: string) {
  return normalizeSellerAffiliateReferralSession(
    await post<unknown>(`${getHostingUrl()}${HOSTING_API.PUBLIC_SELLER_AFFILIATE_SESSIONS(token)}`)
  );
}

export async function listSellerAffiliateStatements(audience: 'seller' | 'promoter') {
  const path =
    audience === 'seller'
      ? HOSTING_API.SELLER_AFFILIATE_STATEMENTS_SELLER
      : HOSTING_API.SELLER_AFFILIATE_STATEMENTS_PROMOTER;
  return unwrapSellerAffiliateList(await hostingGet<unknown>(path)).map(
    normalizeSellerAffiliateStatementLine
  );
}
