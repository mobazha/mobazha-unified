// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import BigNumber from 'bignumber.js';
import { getEvmNativeSymbol } from '../data/chainMetadata';
import {
  getChainByEVMId,
  getChainById,
  getTokenByPaymentCoin,
  parseCanonicalPaymentCoin,
} from '../data/tokens';

export type CollateralAssetKind = 'configured' | 'native' | 'unlisted';

export interface CollateralAssetDisplay {
  /** User-facing label when metadata is known; chain-only or asset ID for unlisted tokens. */
  label: string;
  /** Short symbol when known from configured metadata or an intrinsically known native standard. */
  symbol?: string;
  /** Chain name when derivable from a canonical asset ID. */
  chainName?: string;
  /** Raw canonical asset ID — always preserved for technical disclosure. */
  technicalAssetID: string;
  assetKind: CollateralAssetKind;
}

export type CollateralAmountRepresentation = 'humanized' | 'baseUnits';

export interface CollateralAmountDisplay {
  representation: CollateralAmountRepresentation;
  /** Human-readable amount in token units, or raw base units when decimals are unknown. */
  displayAmount: string;
  /** Amount with symbol when humanized; otherwise mirrors displayAmount without invented symbols. */
  displayWithSymbol: string;
  /** Original base-unit integer string. */
  baseUnits: string;
  symbol?: string;
  decimals?: number;
}

const BIP122_NATIVE_SYMBOLS: Record<string, string> = {
  '000000000019d6689c085ae165831e93': 'BTC',
  '12a765e31ffd4059bada1e25190f6e98': 'LTC',
};

function formatTokenAmount(amount: BigNumber, decimals: number): string {
  if (!amount.isFinite()) return amount.toString();
  const maxFraction = Math.min(Math.max(decimals, 0), 8);
  const trimmed = amount.decimalPlaces(maxFraction, BigNumber.ROUND_DOWN);
  if (trimmed.isZero()) return '0';
  return trimmed
    .toFormat(maxFraction)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');
}

function resolveChainName(assetID: string): string | undefined {
  const parsed = parseCanonicalPaymentCoin(assetID);
  if (!parsed) return undefined;

  if (parsed.namespace === 'eip155') {
    const evmChainID = Number(parsed.chainRef);
    if (Number.isFinite(evmChainID)) {
      return getChainByEVMId(evmChainID)?.name;
    }
  } else if (parsed.namespace === 'solana') {
    return 'Solana';
  } else if (parsed.namespace === 'tron') {
    return 'TRON';
  }

  return undefined;
}

interface ResolvedCollateralTokenMetadata {
  assetKind: CollateralAssetKind;
  symbol?: string;
  decimals?: number;
  decimalsKnown: boolean;
  chainName?: string;
}

function resolveCollateralTokenMetadata(assetID: string): ResolvedCollateralTokenMetadata {
  const trimmed = assetID.trim();
  const configured = getTokenByPaymentCoin(trimmed);
  if (configured) {
    const chainName = getChainById(configured.chain)?.name;
    return {
      assetKind: 'configured',
      symbol: configured.token,
      decimals: configured.decimals,
      decimalsKnown: true,
      chainName,
    };
  }

  const parsed = parseCanonicalPaymentCoin(trimmed);
  if (!parsed) {
    return {
      assetKind: 'unlisted',
      decimalsKnown: false,
      chainName: resolveChainName(trimmed),
    };
  }

  const chainName = resolveChainName(trimmed);

  if (parsed.standard === 'native') {
    let symbol: string | undefined;
    let decimals: number | undefined;

    if (parsed.namespace === 'eip155') {
      const evmChainID = Number(parsed.chainRef);
      symbol = Number.isFinite(evmChainID) ? getEvmNativeSymbol(evmChainID) : undefined;
      decimals = 18;
    } else if (parsed.namespace === 'solana') {
      symbol = 'SOL';
      decimals = 9;
    } else if (parsed.namespace === 'tron') {
      symbol = 'TRX';
      decimals = 6;
    } else if (parsed.namespace === 'bip122') {
      symbol = BIP122_NATIVE_SYMBOLS[parsed.chainRef];
      decimals = 8;
    } else if (parsed.namespace === 'bitcoincash') {
      symbol = 'BCH';
      decimals = 8;
    } else if (parsed.namespace === 'zcash') {
      symbol = 'ZEC';
      decimals = 8;
    }

    if (decimals !== undefined) {
      return {
        assetKind: 'native',
        symbol,
        decimals,
        decimalsKnown: true,
        chainName,
      };
    }
  }

  return {
    assetKind: 'unlisted',
    decimalsKnown: false,
    chainName,
  };
}

/** Humanize a canonical collateral asset ID using token/chain metadata when truthful. */
export function resolveCollateralAssetDisplay(
  assetID: string | undefined
): CollateralAssetDisplay | null {
  const trimmed = assetID?.trim();
  if (!trimmed) return null;

  const metadata = resolveCollateralTokenMetadata(trimmed);
  const { assetKind, symbol, chainName } = metadata;
  const parsed = parseCanonicalPaymentCoin(trimmed);

  let label = trimmed;
  if (assetKind === 'configured' && symbol) {
    if (chainName && parsed?.standard === 'erc20') {
      label = `${symbol} on ${chainName}`;
    } else if (chainName && parsed?.standard === 'native') {
      label = `${symbol} (${chainName})`;
    } else {
      label = symbol;
    }
  } else if (assetKind === 'native' && symbol) {
    label = chainName ? `${symbol} (${chainName})` : symbol;
  } else if (assetKind === 'unlisted') {
    label = chainName ?? trimmed;
  }

  return {
    label,
    symbol: symbol || undefined,
    chainName,
    technicalAssetID: trimmed,
    assetKind,
  };
}

/** Format base-unit collateral amounts using token decimals only when positively known. */
export function resolveCollateralAmountDisplay(
  baseUnits: string | undefined,
  assetID: string | undefined
): CollateralAmountDisplay | null {
  const trimmedUnits = baseUnits?.trim();
  if (!trimmedUnits || !/^\d+$/.test(trimmedUnits)) return null;

  const trimmedAssetID = assetID?.trim();
  const metadata = trimmedAssetID
    ? resolveCollateralTokenMetadata(trimmedAssetID)
    : { decimalsKnown: false as const, assetKind: 'unlisted' as const };

  if (!metadata.decimalsKnown || metadata.decimals === undefined) {
    return {
      representation: 'baseUnits',
      displayAmount: trimmedUnits,
      displayWithSymbol: trimmedUnits,
      baseUnits: trimmedUnits,
    };
  }

  const amount = new BigNumber(trimmedUnits).dividedBy(new BigNumber(10).pow(metadata.decimals));
  const displayAmount = formatTokenAmount(amount, metadata.decimals);
  const symbol = metadata.symbol;
  const displayWithSymbol = symbol ? `${displayAmount} ${symbol}` : displayAmount;

  return {
    representation: 'humanized',
    displayAmount,
    displayWithSymbol,
    baseUnits: trimmedUnits,
    symbol,
    decimals: metadata.decimals,
  };
}

/** User-facing asset label with truthful fallbacks for unlisted canonical assets. */
export function resolveCollateralAssetUserLabel(
  asset: CollateralAssetDisplay,
  translate: (key: string, params?: Record<string, string>) => string
): string {
  if (asset.assetKind === 'unlisted') {
    return asset.chainName
      ? translate('collectibles.collateral.fields.unlistedAssetOnChain', { chain: asset.chainName })
      : translate('collectibles.collateral.fields.unlistedAsset');
  }
  return asset.label;
}

/** User-facing amount label with explicit base-unit wording when decimals are unknown. */
export function resolveCollateralAmountUserLabel(
  amount: CollateralAmountDisplay,
  translate: (key: string, params?: Record<string, string>) => string
): string {
  if (amount.representation === 'baseUnits') {
    return translate('collectibles.collateral.fields.baseUnitAmount', { amount: amount.baseUnits });
  }
  return amount.displayWithSymbol;
}
