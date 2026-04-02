/**
 * Block explorer helpers
 * 区块链浏览器统一入口
 */

import { CHAIN_CONFIG } from './chains';
import { ChainId } from './types';
import { getChainFromCoin, getEVMChainId, parseCanonicalPaymentCoin } from '../../data/tokens';

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

/**
 * Extracts EVM chainId from a canonical asset ID (e.g. "crypto:eip155:11155111:native" → 11155111).
 * Returns undefined for non-EIP155 or unparseable inputs.
 */
function tryExtractEVMChainIdFromCanonical(coin: string): number | undefined {
  const parsed = parseCanonicalPaymentCoin(coin);
  if (!parsed || parsed.namespace !== 'eip155') return undefined;
  const id = Number(parsed.chainRef);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

export function getExplorerBaseUrl({ chainId, coin }: ExplorerContext = {}): string | null {
  // 优先使用传入的 chainId
  if (chainId) {
    const base = getEvmExplorerBase(chainId);
    if (base) return base;
  }

  // 解析 canonical asset ID（crypto:eip155:CHAIN_ID:...）以提取精确 chainId
  if (coin) {
    const canonicalChainId = tryExtractEVMChainIdFromCanonical(coin);
    if (canonicalChainId) {
      const base = getEvmExplorerBase(canonicalChainId);
      if (base) return base;
    }
  }

  const coinUpper = coin?.toUpperCase();

  // 检查非 EVM 链（BTC, LTC）
  if (coinUpper && NON_EVM_EXPLORERS[coinUpper]) {
    return NON_EVM_EXPLORERS[coinUpper].base;
  }

  // 使用 tokens.ts 的 getChainFromCoin 从代币名称获取链 ID（支持 ETHUSDT -> ETH）
  if (coinUpper) {
    const chainSymbol = getChainFromCoin(coinUpper);
    if (chainSymbol) {
      // 检查是否为非 EVM 链
      if (NON_EVM_EXPLORERS[chainSymbol]) {
        return NON_EVM_EXPLORERS[chainSymbol].base;
      }
      // 尝试获取 EVM chainId
      const evmChainId = getEVMChainId(chainSymbol);
      if (evmChainId) {
        return getEvmExplorerBase(evmChainId);
      }
      // 回退到 COIN_CHAIN_FALLBACK
      if (COIN_CHAIN_FALLBACK[chainSymbol]) {
        return getEvmExplorerBase(COIN_CHAIN_FALLBACK[chainSymbol]);
      }
    }
  }

  return null;
}

/**
 * Resolves a canonical asset ID or coin symbol to a non-EVM explorer key (e.g. "BTC", "LTC").
 */
function resolveNonEvmKey(coin: string | undefined): string | null {
  if (!coin) return null;
  const upper = coin.toUpperCase();
  if (NON_EVM_EXPLORERS[upper]) return upper;

  // canonical bip122/bitcoincash/zcash → map to symbol
  const parsed = parseCanonicalPaymentCoin(coin);
  if (!parsed) return null;
  const ns = parsed.namespace;
  if (ns === 'bip122') {
    const BIP122_EXPLORER_MAP: Record<string, string> = {
      '000000000019d6689c085ae165831e93': 'BTC',
      '12a765e31ffd4059bada1e25190f6e98': 'LTC',
    };
    return BIP122_EXPLORER_MAP[parsed.chainRef] ?? null;
  }
  return null;
}

export function getExplorerResourceUrl(
  value: string,
  resource: ExplorerResource,
  context: ExplorerContext = {}
): string | null {
  const nonEvmKey = resolveNonEvmKey(context.coin);
  if (nonEvmKey) {
    const explorer = NON_EVM_EXPLORERS[nonEvmKey];
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
