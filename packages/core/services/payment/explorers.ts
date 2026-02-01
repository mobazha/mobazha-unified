/**
 * Block explorer helpers
 * 区块链浏览器统一入口
 */

import { CHAIN_CONFIG } from './chains';
import { ChainId } from './types';

export type ExplorerResource = 'tx' | 'address' | 'token' | 'nft';

type ExplorerContext = {
  chainId?: number;
  coin?: string;
};

const COIN_CHAIN_FALLBACK: Record<string, ChainId> = {
  ETH: ChainId.ETHEREUM,
  BSC: ChainId.BSC,
  BNB: ChainId.BSC,
  MATIC: ChainId.POLYGON,
  POLYGON: ChainId.POLYGON,
  ARB: ChainId.ARBITRUM,
  ARBITRUM: ChainId.ARBITRUM,
  OP: ChainId.OPTIMISM,
  OPTIMISM: ChainId.OPTIMISM,
  AVAX: ChainId.AVALANCHE,
  AVALANCHE: ChainId.AVALANCHE,
};

const NON_EVM_EXPLORERS: Record<string, { base: string; txPath: string; addressPath: string }> = {
  BTC: { base: 'https://blockstream.info', txPath: '/tx/', addressPath: '/address/' },
  LTC: {
    base: 'https://blockchair.com/litecoin',
    txPath: '/transaction/',
    addressPath: '/address/',
  },
};

function getEvmExplorerBase(chainId: number): string | null {
  const config = CHAIN_CONFIG[chainId as ChainId];
  return config?.blockExplorerUrls?.[0] ?? null;
}

export function getExplorerBaseUrl({ chainId, coin }: ExplorerContext = {}): string | null {
  if (chainId) {
    const base = getEvmExplorerBase(chainId);
    if (base) return base;
  }

  const coinUpper = coin?.toUpperCase();
  if (coinUpper && NON_EVM_EXPLORERS[coinUpper]) {
    return NON_EVM_EXPLORERS[coinUpper].base;
  }

  if (coinUpper && COIN_CHAIN_FALLBACK[coinUpper]) {
    return getEvmExplorerBase(COIN_CHAIN_FALLBACK[coinUpper]);
  }

  return null;
}

export function getExplorerResourceUrl(
  value: string,
  resource: ExplorerResource,
  context: ExplorerContext = {}
): string | null {
  const coinUpper = context.coin?.toUpperCase();
  if (coinUpper && NON_EVM_EXPLORERS[coinUpper]) {
    const explorer = NON_EVM_EXPLORERS[coinUpper];
    if (resource === 'tx') return `${explorer.base}${explorer.txPath}${value}`;
    if (resource === 'address') return `${explorer.base}${explorer.addressPath}${value}`;
    return null;
  }

  const baseUrl = getExplorerBaseUrl(context);
  if (!baseUrl) return null;

  return `${baseUrl}/${resource}/${value}`;
}

/**
 * 兼容旧签名：交易 hash -> 区块浏览器链接
 */
export function getBlockExplorerUrl(txid: string, coin?: string, chainId?: number): string | null {
  return getExplorerResourceUrl(txid, 'tx', { coin, chainId });
}
