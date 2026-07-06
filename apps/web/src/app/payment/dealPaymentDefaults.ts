// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

export interface DealProtectionProviderCandidate {
  peerID: string;
  verified?: boolean;
  verifiedMod?: boolean;
}

/**
 * Return a token to preselect only when Deal checkout has one safe crypto
 * choice and no competing fiat method. Existing valid choices are preserved.
 */
export function resolveDealDefaultTokenID(options: {
  isDealBacked: boolean;
  currentTokenID?: string;
  availableCryptoTokenIds: string[];
  hasVisibleFiatMethod: boolean;
}): string | undefined {
  if (!options.isDealBacked || options.hasVisibleFiatMethod) return undefined;

  const tokenIDs = [...new Set(options.availableCryptoTokenIds.filter(Boolean))];
  if (tokenIDs.length !== 1 || options.currentTokenID === tokenIDs[0]) return undefined;
  return tokenIDs[0];
}

/**
 * The moderator API is rating-sorted. Pick only its first verified candidate,
 * and only when the current selection does not belong to this seller's list.
 */
export function resolveDealDefaultProtectionProvider<
  T extends DealProtectionProviderCandidate,
>(options: {
  isDealBacked: boolean;
  protectionEnabled: boolean;
  isLoading: boolean;
  currentProviderPeerID?: string;
  candidates: T[];
}): T | undefined {
  if (!options.isDealBacked || !options.protectionEnabled || options.isLoading) return undefined;
  if (
    options.currentProviderPeerID &&
    options.candidates.some(candidate => candidate.peerID === options.currentProviderPeerID)
  ) {
    return undefined;
  }
  return options.candidates.find(candidate => candidate.verifiedMod || candidate.verified);
}
