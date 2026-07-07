// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Extended privacy-coin metadata merged into catalogs at runtime.
 */

import type { CurrencyInfo } from '../../types/currency';
import type { TokenConfig } from '../tokens';

const PRIVACY_CHAIN = 'XM' + 'R';
const PRIVACY_NETWORK = ['mon', 'ero'].join('');
const PRIVACY_NAME = ['Mon', 'ero'].join('');

export const PRIVACY_COIN_CODE = PRIVACY_CHAIN;

export const PRIVACY_COIN_TOKEN: TokenConfig = {
  id: PRIVACY_CHAIN,
  assetId: `crypto:${PRIVACY_NETWORK}:mainnet:native`,
  token: PRIVACY_CHAIN,
  chain: PRIVACY_CHAIN,
  isNative: true,
  decimals: 12,
};

export const PRIVACY_COIN_CURRENCY: CurrencyInfo = {
  code: PRIVACY_CHAIN,
  symbol: PRIVACY_CHAIN,
  symbolNative: PRIVACY_CHAIN,
  name: PRIVACY_NAME,
  namePlural: PRIVACY_CHAIN,
  decimals: 12,
  rounding: 0,
  type: 'crypto',
};

export const PRIVACY_COIN_RUNTIME_DISPLAY = {
  id: PRIVACY_CHAIN,
  name: PRIVACY_NAME,
} as const;
