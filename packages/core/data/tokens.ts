/**
 * Token 配置
 * 统一的代币和链配置，与移动端和桌面端保持一致
 */

import { getChainTypeAliases, getEvmChainFamily, getEvmNativeSymbol } from './chainMetadata';

/**
 * Token 配置接口
 */
export interface TokenConfig {
  /** 唯一标识 (如 'ETHUSDT', 'BTC') */
  id: string;
  /** Canonical payment asset id (crypto:* / fiat:*) */
  assetId: string;
  /** 代币符号 (如 'USDT', 'BTC') */
  token: string;
  /** 所属链 (如 'ETH', 'BSC', 'BTC') */
  chain: string;
  /** 代币类型 (如 'ERC20', 'BEP20', 'SPL') */
  type?: string;
  /** 是否为原生代币 */
  isNative: boolean;
  /** 小数位数 */
  decimals: number;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 支付链配置接口
 * 注意：与 types/rwa.ts 中的 ChainConfig 不同，这里是支付相关的链配置
 */
export interface PaymentChainConfig {
  /** 链 ID (如 'ETH', 'BSC') */
  id: string;
  /** 链名称 */
  name: string;
  /** 图标代码 */
  iconCode?: string;
  /** 主题颜色 */
  color?: string;
  /** 地址前缀 */
  addressPrefix?: string;
  /** 链类型 */
  type: 'blockchain' | 'payment' | 'filter';
  /** 是否为外部钱包（非 Web3，如 BTC/LTC） */
  isExternalWallet?: boolean;
  /** 是否即将推出 */
  comingSoon?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** EVM chainId (如有) */
  evmChainId?: number;
}

/**
 * 代币配置列表
 * 与移动端/桌面端保持一致
 */
export const TOKENS: TokenConfig[] = [
  {
    id: 'BTC',
    assetId: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
    token: 'BTC',
    chain: 'BTC',
    isNative: true,
    decimals: 8,
  },
  {
    id: 'BCH',
    assetId: 'crypto:bitcoincash:mainnet:native',
    token: 'BCH',
    chain: 'BCH',
    isNative: true,
    decimals: 8,
  },
  {
    id: 'LTC',
    assetId: 'crypto:bip122:12a765e31ffd4059bada1e25190f6e98:native',
    token: 'LTC',
    chain: 'LTC',
    isNative: true,
    decimals: 8,
  },
  {
    id: 'ZEC',
    assetId: 'crypto:zcash:mainnet:native',
    token: 'ZEC',
    chain: 'ZEC',
    isNative: true,
    decimals: 8,
  },
  {
    id: 'XMR',
    assetId: 'crypto:monero:mainnet:native',
    token: 'XMR',
    chain: 'XMR',
    isNative: true,
    decimals: 12,
  },
  {
    id: 'ETH',
    assetId: 'crypto:eip155:1:native',
    token: 'ETH',
    chain: 'ETH',
    isNative: true,
    decimals: 18,
  },
  {
    id: 'ETHUSDT',
    assetId: 'crypto:eip155:1:erc20:0xF36BFeE8fd7F1950c0129714Faf6d1e1F94a66AA',
    token: 'USDT',
    chain: 'ETH',
    type: 'ERC20',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'ETHUSDC',
    assetId: 'crypto:eip155:1:erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    token: 'USDC',
    chain: 'ETH',
    type: 'ERC20',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'DAI',
    assetId: 'crypto:eip155:1:erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
    token: 'DAI',
    chain: 'ETH',
    type: 'ERC20',
    isNative: false,
    decimals: 18,
  },
  {
    id: 'BNB',
    assetId: 'crypto:eip155:56:native',
    token: 'BNB',
    chain: 'BSC',
    isNative: true,
    decimals: 18,
  },
  {
    id: 'BSCUSDT',
    assetId: 'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955',
    token: 'USDT',
    chain: 'BSC',
    type: 'BEP20',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'BSCUSDC',
    assetId: 'crypto:eip155:56:erc20:0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    token: 'USDC',
    chain: 'BSC',
    type: 'BEP20',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'BUSD',
    assetId: 'crypto:eip155:56:erc20:0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    token: 'BUSD',
    chain: 'BSC',
    type: 'BEP20',
    isNative: false,
    decimals: 18,
  },
  {
    id: 'BASEETH',
    assetId: 'crypto:eip155:8453:native',
    token: 'ETH',
    chain: 'BASE',
    isNative: true,
    decimals: 18,
  },
  {
    id: 'BASEUSDT',
    assetId: 'crypto:eip155:8453:erc20:0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    token: 'USDT',
    chain: 'BASE',
    type: 'Base',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'BASEUSDC',
    assetId: 'crypto:eip155:8453:erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    token: 'USDC',
    chain: 'BASE',
    type: 'Base',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'CFX',
    assetId: 'crypto:eip155:1030:native',
    token: 'CFX',
    chain: 'CFX',
    isNative: true,
    decimals: 18,
  },
  {
    id: 'MATIC',
    assetId: 'crypto:eip155:137:native',
    token: 'MATIC',
    chain: 'MATIC',
    isNative: true,
    decimals: 18,
  },
  {
    id: 'MATICUSDT',
    assetId: 'crypto:eip155:137:erc20:0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    token: 'USDT',
    chain: 'MATIC',
    type: 'Polygon',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'MATICUSDC',
    assetId: 'crypto:eip155:137:erc20:0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    token: 'USDC',
    chain: 'MATIC',
    type: 'Polygon',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'SOL',
    assetId: 'crypto:solana:mainnet:native',
    token: 'SOL',
    chain: 'SOL',
    isNative: true,
    decimals: 9,
  },
  {
    id: 'SOLUSDT',
    assetId: 'crypto:solana:mainnet:spl:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    token: 'USDT',
    chain: 'SOL',
    type: 'SPL',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'SOLUSDC',
    assetId: 'crypto:solana:mainnet:spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    token: 'USDC',
    chain: 'SOL',
    type: 'SPL',
    isNative: false,
    decimals: 6,
  },
  {
    id: 'TRX',
    assetId: 'crypto:tron:mainnet:native',
    token: 'TRX',
    chain: 'TRON',
    isNative: true,
    decimals: 6,
  },
  {
    id: 'TRXUSDT',
    assetId: 'crypto:tron:mainnet:trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    token: 'USDT',
    chain: 'TRON',
    type: 'TRC20',
    isNative: false,
    decimals: 6,
  },
];

const TOKENS_BY_ID = new Map<string, TokenConfig>(
  TOKENS.map(token => [token.id.toUpperCase(), token] as const)
);

const CANONICAL_TO_PRIMARY_TOKEN_ID = new Map<string, string>();
for (const token of TOKENS) {
  const canonical = token.assetId;
  if (!canonical) continue;
  const canonicalLower = canonical.toLowerCase();
  if (!CANONICAL_TO_PRIMARY_TOKEN_ID.has(canonicalLower)) {
    CANONICAL_TO_PRIMARY_TOKEN_ID.set(canonicalLower, token.id.toUpperCase());
  }
}

const BIP122_CHAIN_REF_TO_CHAIN: Record<string, string> = {
  '000000000019d6689c085ae165831e93': 'BTC',
  '12a765e31ffd4059bada1e25190f6e98': 'LTC',
};

export interface CanonicalPaymentCoinParts {
  namespace: string;
  chainRef: string;
  standard: string;
  assetRef?: string;
}

export function isCanonicalPaymentCoin(coin: string): boolean {
  const trimmed = (coin || '').trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('fiat:')) {
    return true;
  }
  if (lower.startsWith('crypto:')) {
    return parseCanonicalPaymentCoin(trimmed) !== null;
  }
  return false;
}

export function mustCanonicalCoin(coin: string): string {
  const trimmed = (coin || '').trim();
  if (!trimmed) {
    throw new Error('payment coin must not be empty');
  }
  if (!isCanonicalPaymentCoin(trimmed)) {
    throw new Error(`non-canonical payment coin: ${trimmed}`);
  }
  return trimmed;
}

export function assetIdFromTokenId(tokenId: string): string | undefined {
  const token = TOKENS_BY_ID.get((tokenId || '').trim().toUpperCase());
  return token?.assetId;
}

export function mustAssetIdFromTokenId(tokenId: string): string {
  const assetID = assetIdFromTokenId(tokenId);
  if (!assetID) {
    throw new Error(`unknown token id: ${tokenId}`);
  }
  return assetID;
}

/**
 * Parses canonical crypto payment coin (crypto:...) into structured parts.
 * Returns null when input is not a valid canonical crypto payment coin.
 */
export function parseCanonicalPaymentCoin(coin: string): CanonicalPaymentCoinParts | null {
  const trimmed = (coin || '').trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length !== 4 && parts.length !== 5) return null;
  if (parts[0].toLowerCase() !== 'crypto') return null;

  const namespace = parts[1].toLowerCase();
  const chainRef = parts[2].toLowerCase();

  if (parts.length === 4) {
    if (parts[3].toLowerCase() !== 'native') return null;
    return { namespace, chainRef, standard: 'native' };
  }

  return {
    namespace,
    chainRef,
    standard: parts[3].toLowerCase(),
    assetRef: parts[4],
  };
}

/**
 * Resolves payment coin (tokenID/canonical) into configured token ID.
 */
export function getTokenIdFromPaymentCoin(coin: string): string | undefined {
  const trimmed = (coin || '').trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (TOKENS_BY_ID.has(upper)) {
    return upper;
  }

  if (!isCanonicalPaymentCoin(trimmed)) {
    return undefined;
  }

  const mappedTokenID = CANONICAL_TO_PRIMARY_TOKEN_ID.get(trimmed.toLowerCase());
  if (mappedTokenID) {
    return mappedTokenID;
  }

  return undefined;
}

/**
 * Gets token config from tokenID/canonical payment coin.
 */
export function getTokenByPaymentCoin(coin: string): TokenConfig | undefined {
  const tokenID = getTokenIdFromPaymentCoin(coin);
  if (!tokenID) return undefined;
  return TOKENS_BY_ID.get(tokenID);
}

/**
 * Returns EVM ERC20 token address from payment coin.
 * - For canonical eip155 ERC20 asset IDs, returns assetRef directly.
 * - For native/unknown/non-EVM coins, returns null.
 */
export function getEVMTokenAddressFromPaymentCoin(coin: string): string | null {
  const trimmed = (coin || '').trim();
  if (!trimmed) return null;

  const token = TOKENS_BY_ID.get(trimmed.toUpperCase());
  const canonical = token?.assetId ?? (isCanonicalPaymentCoin(trimmed) ? trimmed : '');
  if (!canonical) {
    return null;
  }

  const parsed = parseCanonicalPaymentCoin(canonical);
  if (!parsed || parsed.namespace !== 'eip155') {
    return null;
  }
  if (parsed.standard === 'native') {
    return null;
  }
  if (parsed.standard === 'erc20' && parsed.assetRef) {
    return parsed.assetRef;
  }
  return null;
}

/**
 * 链配置列表
 */
export const CHAINS: PaymentChainConfig[] = [
  {
    id: 'all',
    name: 'All',
    type: 'filter',
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    iconCode: 'BTC',
    color: '#f7931a',
    type: 'blockchain',
    isExternalWallet: true,
  },
  {
    id: 'LTC',
    name: 'Litecoin',
    iconCode: 'LTC',
    color: '#bfbbbb',
    type: 'blockchain',
    isExternalWallet: true,
  },
  {
    id: 'BCH',
    name: 'Bitcoin Cash',
    iconCode: 'BCH',
    color: '#8dc351',
    type: 'blockchain',
    isExternalWallet: true,
  },
  {
    id: 'ZEC',
    name: 'Zcash',
    iconCode: 'ZEC',
    color: '#f4b728',
    type: 'blockchain',
    isExternalWallet: true,
  },
  {
    id: 'XMR',
    name: 'Monero',
    iconCode: 'XMR',
    color: '#ff6600',
    type: 'blockchain',
    isExternalWallet: true,
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    iconCode: 'ETH',
    color: '#627eea',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 1,
  },
  {
    id: 'BSC',
    name: 'BNB Smart Chain',
    iconCode: 'BSC',
    color: '#f3ba2f',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 56,
  },
  {
    id: 'BASE',
    name: 'Base',
    iconCode: 'BASE',
    color: '#0052ff',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 8453,
  },
  {
    id: 'CFX',
    name: 'Conflux',
    iconCode: 'CFX',
    color: '#1e3a8a',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 1030,
  },
  {
    id: 'MATIC',
    name: 'Polygon',
    iconCode: 'MATIC',
    color: '#8247e5',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 137,
  },
  {
    id: 'SOL',
    name: 'Solana',
    iconCode: 'SOL',
    color: '#9945ff',
    type: 'blockchain',
    comingSoon: true,
  },
  {
    id: 'TRON',
    name: 'TRON',
    iconCode: 'TRON',
    color: '#eb0029',
    addressPrefix: 'T',
    type: 'blockchain',
    isExternalWallet: true,
  },
];

// ============ 辅助函数 ============

/**
 * 根据 token ID 获取代币配置
 */
export function getTokenById(tokenId: string): TokenConfig | undefined {
  return TOKENS_BY_ID.get(tokenId.toUpperCase());
}

/**
 * 根据链 ID 获取该链上的所有代币
 */
export function getTokensByChain(chainId: string): TokenConfig[] {
  if (chainId === 'all') {
    return TOKENS;
  }
  return TOKENS.filter(t => t.chain.toUpperCase() === chainId.toUpperCase());
}

/**
 * 获取代币的小数位数
 * @param tokenId 代币 ID (如 'ETHUSDT', 'BTC')
 * @returns 小数位数，默认返回 8
 */
export function getTokenDecimals(tokenId: string): number {
  const token = getTokenByPaymentCoin(tokenId);
  if (token) {
    return token.decimals;
  }

  // 根据代币名称推断
  const upperTokenId = tokenId.toUpperCase();
  if (upperTokenId.includes('USDT') || upperTokenId.includes('USDC')) {
    return 6;
  }
  if (
    upperTokenId.includes('ETH') ||
    upperTokenId.includes('BNB') ||
    upperTokenId.includes('MATIC')
  ) {
    return 18;
  }
  if (upperTokenId === 'DAI') {
    return 18;
  }
  if (upperTokenId === 'SOL') {
    return 9;
  }
  if (upperTokenId === 'TRX') {
    return 6;
  }

  // 默认 8 位小数（BTC 标准）
  return 8;
}

/**
 * 根据链 ID 获取链配置
 */
export function getChainById(chainId: string): PaymentChainConfig | undefined {
  return CHAINS.find(c => c.id.toUpperCase() === chainId.toUpperCase());
}

/**
 * 获取所有区块链类型的链（排除 filter 类型）
 */
export function getBlockchainChains(): PaymentChainConfig[] {
  return CHAINS.filter(c => c.type === 'blockchain');
}

/**
 * 获取所有支持的链（排除 disabled 和 comingSoon）
 */
export function getSupportedChains(): PaymentChainConfig[] {
  return CHAINS.filter(c => c.type === 'blockchain' && !c.disabled && !c.comingSoon);
}

/**
 * UTXO 链列表
 * 这些链不需要前端钱包签名，后端自动处理多签交易
 */
export const UTXO_CHAINS = ['BTC', 'LTC', 'BCH', 'ZEC'] as const;

/**
 * 根据代币 ID 或链 ID 获取链类型
 * 支持输入：
 * - 链 ID: 'ETH', 'BTC', 'SOL'
 * - 代币 ID: 'ETHUSDT', 'SOLUSDC', 'BTC'
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 链 ID（大写），如 'ETH', 'BTC'；无法识别时返回空字符串
 */
export function getChainFromCoin(coinOrChain?: string): string {
  if (!coinOrChain) return '';

  const trimmed = coinOrChain.trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase();

  const token = getTokenByPaymentCoin(trimmed);
  if (token) {
    return token.chain.toUpperCase();
  }

  // 首先尝试从代币配置中获取
  const chainConfig = CHAINS.find(c => c.id.toUpperCase() === upper);
  if (chainConfig) {
    return upper;
  }

  // 尝试解析 canonical coin（crypto:...）
  const parsed = parseCanonicalPaymentCoin(trimmed);
  if (parsed) {
    if (parsed.namespace === 'eip155') {
      const evmChainID = Number(parsed.chainRef);
      if (!Number.isNaN(evmChainID)) {
        const evmChain = getChainByEVMId(evmChainID);
        if (evmChain) {
          return evmChain.id.toUpperCase();
        }
      }
    }
    if (parsed.namespace === 'bip122') {
      return BIP122_CHAIN_REF_TO_CHAIN[parsed.chainRef] || '';
    }
    if (parsed.namespace === 'solana') {
      return 'SOL';
    }
    if (parsed.namespace === 'tron') {
      return 'TRON';
    }
  }

  // 法币不属于链路由
  if (trimmed.toLowerCase().startsWith('fiat:')) {
    return '';
  }

  // 无法识别的代币/链，打印警告并返回空字符串
  console.warn(`[getChainFromCoin] Unknown coin/chain: ${coinOrChain}`);
  return '';
}

/**
 * Returns compatible receiving-account chainType aliases for a payment coin or chain.
 *
 * The result is intended for UI/account matching where backend data may store
 * chainType as either a canonical chain ID (ETH/BTC/SOL/TRON) or a lowercase alias.
 *
 * Rules:
 * - paymentCoin takes priority over blockchain hints
 * - fiat returns the provider-scoped chainType (fiat:stripe / fiat:paypal) when possible
 * - unknown paymentCoin fails closed with an empty list
 */
export function getCompatibleChainTypes(paymentCoin?: string, blockchain?: string): string[] {
  if (paymentCoin) {
    const lower = paymentCoin.toLowerCase();
    if (lower.startsWith('fiat:')) {
      const provider = lower.split(':')[1];
      if (provider) return [`fiat:${provider}`];
      return ['fiat'];
    }

    const parsed = parseCanonicalPaymentCoin(paymentCoin);
    if (parsed) {
      if (parsed.namespace === 'eip155') {
        const evmChainID = Number(parsed.chainRef);
        const chain = Number.isFinite(evmChainID) ? getChainByEVMId(evmChainID)?.id : undefined;
        return chain ? getChainTypeAliases(chain) : getChainTypeAliases('ETH');
      }

      if (parsed.namespace === 'bip122') {
        const chain = BIP122_CHAIN_REF_TO_CHAIN[parsed.chainRef];
        return chain ? getChainTypeAliases(chain) : [];
      }

      if (parsed.namespace === 'solana') {
        return getChainTypeAliases('SOL');
      }

      if (parsed.namespace === 'tron') {
        return getChainTypeAliases('TRON');
      }

      return [];
    }

    const chain = getChainFromCoin(paymentCoin);
    if (!chain) {
      return [];
    }

    return getChainTypeAliases(chain);
  }

  if (blockchain) {
    const chain = getChainFromCoin(blockchain);
    if (!chain) {
      const lower = blockchain.toLowerCase();
      return lower ? [lower] : [];
    }

    return getChainTypeAliases(chain);
  }

  return [];
}

/**
 * 判断是否为 UTXO 链（BTC, LTC, BCH, ZEC）
 * UTXO 链不需要前端钱包签名，后端自动处理
 *
 * 支持输入：
 * - 链 ID: 'BTC', 'LTC'
 * - 代币 ID: 'BTC' (也是链 ID)
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否为 UTXO 链
 */
export function isUTXOChain(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  const chain = getChainFromCoin(coinOrChain);
  return UTXO_CHAINS.includes(chain as (typeof UTXO_CHAINS)[number]);
}

/**
 * 判断是否为 EVM 链
 * EVM 链需要前端钱包签名
 *
 * 支持输入：
 * - 链 ID: 'ETH', 'BSC'
 * - 代币 ID: 'ETHUSDT', 'BSCUSDT'
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否为 EVM 链
 */
export function isEVMChain(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  const chain = getChainFromCoin(coinOrChain);
  const chainConfig = CHAINS.find(c => c.id.toUpperCase() === chain);

  return chainConfig?.evmChainId !== undefined;
}

/**
 * 判断是否为 Solana 链
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否为 Solana 链
 */
export function isSolanaChain(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  const chain = getChainFromCoin(coinOrChain);
  return chain === 'SOL';
}

/**
 * 判断是否为 TRON 链
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否为 TRON 链
 */
export function isTRONChain(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  const chain = getChainFromCoin(coinOrChain);
  return chain === 'TRON';
}

/**
 * 判断订单操作是否需要前端钱包签名
 * - UTXO 链：不需要（后端处理）
 * - EVM/Solana 链：需要
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否需要钱包签名
 */
export function requiresWalletSignature(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  // UTXO 链不需要前端签名
  if (isUTXOChain(coinOrChain)) {
    return false;
  }

  // EVM, Solana, TRON 链需要签名
  return isEVMChain(coinOrChain) || isSolanaChain(coinOrChain) || isTRONChain(coinOrChain);
}

/**
 * 获取链的 EVM chainId
 */
export function getEVMChainId(chainId: string): number | undefined {
  const chain = getChainById(chainId);
  return chain?.evmChainId;
}

/**
 * 根据 EVM chainId 获取链配置
 */
export function getChainByEVMId(evmChainId: number): PaymentChainConfig | undefined {
  const configuredChain = CHAINS.find(c => c.evmChainId === evmChainId);
  if (configuredChain) {
    return configuredChain;
  }

  const fallbackChainId = getEvmChainFamily(evmChainId);
  return fallbackChainId ? getChainById(fallbackChainId) : undefined;
}

function getNativeSymbolByEVMChainId(evmChainId: number): string | undefined {
  return getEvmNativeSymbol(evmChainId);
}

/**
 * Returns a user-friendly display label for a payment coin.
 * Resolves canonical asset IDs (e.g., "crypto:eip155:1:native") to
 * human-readable token symbols (e.g., "ETH").
 * Falls back to chain name for unknown tokens, or the raw input as last resort.
 */
export function getPaymentCoinDisplayLabel(coin: string): string {
  if (!coin) return '';

  const token = getTokenByPaymentCoin(coin);
  if (token) {
    return token.token;
  }

  const parsed = parseCanonicalPaymentCoin(coin);
  if (parsed) {
    if (parsed.namespace === 'eip155') {
      const evmChainID = Number(parsed.chainRef);
      if (!Number.isNaN(evmChainID)) {
        const nativeSymbol = getNativeSymbolByEVMChainId(evmChainID);
        if (parsed.standard === 'native' && nativeSymbol) {
          return nativeSymbol;
        }
        const chain = getChainByEVMId(evmChainID);
        if (chain) {
          return parsed.standard === 'native' ? chain.name : coin;
        }
      }
    }
    if (parsed.namespace === 'solana' && parsed.standard === 'native') return 'SOL';
    if (parsed.namespace === 'tron' && parsed.standard === 'native') return 'TRX';
    if (parsed.namespace === 'bip122') {
      const chainId = BIP122_CHAIN_REF_TO_CHAIN[parsed.chainRef];
      if (chainId) return chainId;
    }
    if (parsed.namespace === 'bitcoincash') return 'BCH';
    if (parsed.namespace === 'zcash') return 'ZEC';
  }

  if (coin.toLowerCase().startsWith('fiat:')) {
    const parts = coin.split(':');
    return parts.length >= 2 ? parts[1].toUpperCase() : coin;
  }

  return coin;
}

/**
 * Resolves a payment coin (canonical or token ID) to a token ID suitable
 * for TokenIcon and other UI components.
 * Returns the token ID (e.g., "ETH") if found, otherwise the input as-is.
 */
export function resolveTokenIdForDisplay(coin: string): string {
  if (!coin) return '';
  const tokenId = getTokenIdFromPaymentCoin(coin);
  if (tokenId) return tokenId;

  const parsed = parseCanonicalPaymentCoin(coin);
  if (parsed?.namespace === 'eip155' && parsed.standard === 'native') {
    const evmChainID = Number(parsed.chainRef);
    if (!Number.isNaN(evmChainID)) {
      return getNativeSymbolByEVMChainId(evmChainID) || coin;
    }
  }

  return coin;
}

/**
 * 获取智能小数位数（参考币安/OKX等主流交易所的显示规则）
 *
 * 规则：
 * 1. 对于 >= 1 的数字，使用 desiredDecimals（通常2位小数）
 * 2. 对于 < 1 的数字，显示 3-4 位有效数字
 *
 * 示例：
 * - 1234.5678 → 1234.57 (2位小数)
 * - 0.12345 → 0.1235 (4位有效数字)
 * - 0.00024567 → 0.0002457 (4位有效数字)
 * - 0.000001234 → 0.00000123 (3位有效数字，受 maxDecimals 限制)
 */
function getSmartDecimals(
  amount: number,
  desiredDecimals: number,
  maxDecimals = 8,
  significantDigits = 4 // 期望显示的有效数字位数
): number {
  if (amount === 0) return desiredDecimals;

  const absAmount = Math.abs(amount);

  // 对于 >= 1 的数字，使用期望的小数位数
  if (absAmount >= 1) {
    return desiredDecimals;
  }

  // 对于 < 1 的数字，计算需要多少小数位来显示 N 位有效数字
  // 使用 log10 找到第一个有效数字的位置
  // 例如：0.00024 → log10(0.00024) ≈ -3.62 → floor = -4 → 第一个有效数字在小数点后第4位
  const log = Math.log10(absAmount);
  const firstSignificantPosition = Math.floor(log); // 负数表示小数点后的位置

  // 计算需要的小数位数：第一个有效数字位置 + 额外的有效数字
  // 例如：0.00024 需要 4 + (4-1) = 7 位小数来显示 4 位有效数字
  const requiredDecimals = -firstSignificantPosition + (significantDigits - 1);

  // 限制在 [desiredDecimals, maxDecimals] 范围内
  return Math.min(Math.max(requiredDecimals, desiredDecimals), maxDecimals);
}

/**
 * 格式化金额（从最小单位转换为显示单位）
 * @param amount 最小单位金额
 * @param tokenId 代币 ID
 * @param displayDecimals 显示的小数位数（默认根据代币类型自动判断，会智能扩展以显示非零值）
 */
export function formatTokenAmount(
  amount: number | string,
  tokenId: string,
  displayDecimals?: number
): string {
  const decimals = getTokenDecimals(tokenId);
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const normalizedAmount = numAmount / Math.pow(10, decimals);

  // 确定基础显示小数位数
  const baseDisplay = displayDecimals ?? (decimals >= 6 ? 2 : Math.min(decimals, 8));

  // 使用智能小数位数，确保不会显示 0.00 当实际有值时
  const smartDisplay = getSmartDecimals(normalizedAmount, baseDisplay, decimals);

  return normalizedAmount.toFixed(smartDisplay);
}

/**
 * 解析金额（从显示单位转换为最小单位）
 * @param displayAmount 显示金额
 * @param tokenId 代币 ID
 */
export function parseTokenAmount(displayAmount: number | string, tokenId: string): bigint {
  const decimals = getTokenDecimals(tokenId);
  const numAmount = typeof displayAmount === 'string' ? parseFloat(displayAmount) : displayAmount;
  return BigInt(Math.round(numAmount * Math.pow(10, decimals)));
}
