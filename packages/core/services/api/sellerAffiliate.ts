// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { HOSTING_API, NODE_API } from '../../config/apiPaths';
import type {
  AffiliateShortLinkResolution,
  SellerAffiliateProgramRequest,
  SellerAffiliatePromoterStatementTarget,
} from '../../types/sellerAffiliate';
import {
  normalizeAffiliateShortLinkResolution,
  normalizePublicSellerAffiliateLink,
  normalizeSellerAffiliateCapabilities,
  normalizeSellerAffiliateLink,
  normalizeSellerAffiliateProgram,
  normalizeSellerAffiliateReferralSession,
  normalizeSellerAffiliateStatementLine,
  unwrapSellerAffiliateList,
} from '../../utils/sellerAffiliate';
import {
  crossStoreAnonymousGet,
  crossStoreAnonymousPost,
  hostingGet,
  nodeAuthGet,
  nodeAuthPost,
  nodeAuthPut,
} from './helpers';

export async function getSellerAffiliateProgram() {
  return normalizeSellerAffiliateProgram(
    await nodeAuthGet<unknown>(NODE_API.SELLER_AFFILIATE_PROGRAM)
  );
}

export async function getSellerAffiliateCapabilities() {
  return normalizeSellerAffiliateCapabilities(
    await nodeAuthGet<unknown>(NODE_API.SELLER_AFFILIATE_CAPABILITIES)
  );
}

export async function putSellerAffiliateProgram(body: SellerAffiliateProgramRequest) {
  return normalizeSellerAffiliateProgram(
    await nodeAuthPut<unknown>(NODE_API.SELLER_AFFILIATE_PROGRAM, body)
  );
}

export async function getPublicSellerAffiliateProgram(sellerPeerID: string) {
  return normalizePublicSellerAffiliateLink(
    await crossStoreAnonymousGet<unknown>(NODE_API.PUBLIC_SELLER_AFFILIATE_PROGRAM, sellerPeerID)
  );
}

export async function createSellerAffiliateLink(sellerPeerID: string, programID: string) {
  const evidence = await issueSellerAffiliatePromoterEvidence(sellerPeerID, programID);
  return normalizeSellerAffiliateLink(
    await crossStoreAnonymousPost<unknown>(
      NODE_API.PUBLIC_SELLER_AFFILIATE_PROGRAM_LINKS(programID),
      sellerPeerID,
      { evidence }
    )
  );
}

async function issueSellerAffiliatePromoterEvidence(sellerPeerID: string, programID: string) {
  return nodeAuthPost<unknown>(NODE_API.SELLER_AFFILIATE_PROMOTER_ENROLLMENTS, {
    sellerPeerID,
    programID,
  });
}

export async function listSellerAffiliateLinks(_programID: string) {
  return unwrapSellerAffiliateList(await nodeAuthGet<unknown>(NODE_API.SELLER_AFFILIATE_LINKS)).map(
    normalizeSellerAffiliateLink
  );
}

export async function revokeSellerAffiliateLink(_programID: string, linkID: string) {
  return normalizeSellerAffiliateLink(
    await nodeAuthPost<unknown>(NODE_API.SELLER_AFFILIATE_LINK_REVOKE(linkID))
  );
}

export async function reissueSellerAffiliateLink(linkID: string) {
  return normalizeSellerAffiliateLink(
    await nodeAuthPost<unknown>(NODE_API.SELLER_AFFILIATE_LINK_REISSUE(linkID))
  );
}

/**
 * Resolve a platform short code (/a/<code>) to its long-link facts. Anonymous;
 * the platform answers 404 for unknown codes and while short links are disabled.
 */
export async function resolveAffiliateShortLink(
  code: string
): Promise<AffiliateShortLinkResolution> {
  const trimmed = (code || '').trim();
  if (!trimmed) throw new Error('short code is required');
  return normalizeAffiliateShortLinkResolution(
    await hostingGet<unknown>(HOSTING_API.AFFILIATE_SHORT_LINKS(trimmed))
  );
}

export async function getPublicSellerAffiliateLink(sellerPeerID: string, token: string) {
  return normalizePublicSellerAffiliateLink(
    await crossStoreAnonymousGet<unknown>(
      NODE_API.PUBLIC_SELLER_AFFILIATE_LINK(token),
      sellerPeerID
    )
  );
}

export async function createSellerAffiliateReferralSession(sellerPeerID: string, token: string) {
  return normalizeSellerAffiliateReferralSession(
    await crossStoreAnonymousPost<unknown>(
      NODE_API.PUBLIC_SELLER_AFFILIATE_SESSIONS(token),
      sellerPeerID
    )
  );
}

export async function listSellerAffiliateStatements(
  audience: 'seller' | 'promoter',
  promoterTarget?: SellerAffiliatePromoterStatementTarget
) {
  let raw: unknown;
  if (audience === 'seller') {
    raw = await nodeAuthGet<unknown>(NODE_API.SELLER_AFFILIATE_STATEMENTS_SELLER);
  } else {
    if (!promoterTarget) throw new Error('promoter statement target is required');
    const evidence = await issueSellerAffiliatePromoterEvidence(
      promoterTarget.sellerPeerID,
      promoterTarget.programID
    );
    raw = await crossStoreAnonymousPost<unknown>(
      NODE_API.PUBLIC_SELLER_AFFILIATE_STATEMENTS_PROMOTER,
      promoterTarget.sellerPeerID,
      { evidence }
    );
  }
  return unwrapSellerAffiliateList(raw).map(normalizeSellerAffiliateStatementLine);
}
