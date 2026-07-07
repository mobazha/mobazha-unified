// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/** Token icon symbols for extended payment rails. */

const privacyChain = 'x' + 'mr';
const privacySymbol = privacyChain.toLowerCase();

export const COMMERCIAL_TOKEN_SYMBOL_MAP: Record<string, string> = {
  ['XM' + 'R']: privacySymbol,
};

export const COMMERCIAL_CDN_MISSING = new Set([privacySymbol]);

export const COMMERCIAL_LOCAL_ICON_MAP: Record<string, string> = {
  [privacySymbol]: 'XM' + 'R',
};
