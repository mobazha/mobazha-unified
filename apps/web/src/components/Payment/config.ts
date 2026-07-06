/**
 * Payment Configuration
 * 支付配置 - 代币、链、支付方式
 */

import {
  TOKENS as CORE_TOKENS,
  CHAINS as CORE_CHAINS,
  isPaymentCoinEnabled,
} from '@mobazha/core/data/tokens';
import {
  filterVisiblePaymentTokens,
  getTokenIdFromPaymentCoin,
  isFiatCurrency,
} from '@mobazha/core';
import { TokenConfig, ChainConfig, FiatMethodConfig } from './types';

// 代币配置统一复用 core 注册表，避免 web 侧手写表漂移。
export const TOKENS: TokenConfig[] = CORE_TOKENS.map(token => ({
  ...token,
  disabled: token.disabled ?? !isPaymentCoinEnabled(token.assetId),
}));

// 链配置统一复用 core 注册表，避免 web 侧链名/链 ID 与 token 注册表漂移。
export const CHAINS: ChainConfig[] = [
  {
    id: 'all',
    name: 'All',
    icon: 'list',
    color: '#6b7280',
    type: 'filter',
  },
  ...CORE_CHAINS.filter(chain => chain.type === 'blockchain').map(chain => ({
    id: chain.id,
    name: chain.name,
    iconCode: chain.iconCode,
    color: chain.color ?? '#6b7280',
    type: 'blockchain' as const,
    addressPrefix: chain.addressPrefix ?? '',
    isExternalWallet: chain.isExternalWallet,
    comingSoon: chain.comingSoon ?? false,
    disabled: chain.disabled ?? false,
  })),
];

// 法币支付方式 — UI metadata only; availability determined by backend
export const FIAT_METHODS: FiatMethodConfig[] = [
  {
    id: 'stripe',
    providerID: 'stripe',
    name: 'Credit / Debit Card',
    icon: 'credit-card',
    color: '#6772e5',
    type: 'payment',
    brandLabels: ['Visa', 'Mastercard', 'Apple Pay', 'Google Pay'],
  },
  {
    id: 'paypal',
    providerID: 'paypal',
    name: 'PayPal',
    icon: 'paypal',
    color: '#0070ba',
    type: 'payment',
    brandLabels: ['PayPal'],
  },
];

/**
 * Resolve the exact crypto choices shown by the normal checkout selector.
 * Deal checkout defaults must use this list so they never preselect a hidden,
 * disabled, coming-soon, or seller-unsupported token.
 */
export function getAvailablePaymentTokens(acceptedCurrencies?: string[]): TokenConfig[] {
  const comingSoonChains = new Set(CHAINS.filter(chain => chain.comingSoon).map(chain => chain.id));
  let tokens = TOKENS.filter(token => !comingSoonChains.has(token.chain));

  if (acceptedCurrencies) {
    const accepted = new Set<string>();
    for (const value of acceptedCurrencies) {
      const normalized = value?.trim();
      if (!normalized) continue;
      accepted.add(normalized.toLowerCase());
      const tokenID = getTokenIdFromPaymentCoin(normalized);
      if (tokenID) accepted.add(tokenID.toLowerCase());
    }
    tokens = tokens.filter(token => {
      const tokenID = token.id.trim().toLowerCase();
      const canonical = token.assetId?.trim().toLowerCase();
      return accepted.has(tokenID) || (canonical ? accepted.has(canonical) : false);
    });
  }

  return filterVisiblePaymentTokens(tokens);
}

/**
 * Keep fiat methods inside the immutable order currency set when checkout
 * provides one. Undefined preserves normal seller-configured checkout;
 * an empty list intentionally exposes no fiat method.
 */
export function getAvailableFiatProviderIDs(
  providerIDs: string[],
  acceptedCurrencies?: string[]
): string[] {
  const providers = [...new Set(providerIDs.map(value => value.trim()).filter(Boolean))];
  if (acceptedCurrencies === undefined) return providers;

  const acceptedProviders = new Set<string>();
  let acceptsGenericFiat = false;
  for (const raw of acceptedCurrencies) {
    const value = raw.trim();
    if (!value) continue;
    const parts = value.split(':');
    if (parts.length === 3 && parts[0]?.toLowerCase() === 'fiat' && parts[1]) {
      acceptedProviders.add(parts[1].toLowerCase());
      continue;
    }
    if (isFiatCurrency(value.toUpperCase())) acceptsGenericFiat = true;
  }

  if (acceptsGenericFiat) return providers;
  return providers.filter(provider => acceptedProviders.has(provider.toLowerCase()));
}

// 获取代币图标
export function getTokenIcon(tokenId: string): string {
  const token = TOKENS.find(t => t.id === tokenId);
  if (!token) return '';

  const symbol = token.token.toLowerCase();
  // 使用 crypto icons 或本地图标
  return `/icons/crypto/${symbol}.svg`;
}

// 获取链图标
export function getChainIcon(chainId: string): string {
  const chain = CHAINS.find(c => c.id === chainId);
  if (!chain) return '';

  const iconCode = chain.iconCode?.toLowerCase() || chainId.toLowerCase();
  return `/icons/chains/${iconCode}.svg`;
}

// 根据代币ID获取代币配置
export function getTokenById(tokenId: string): TokenConfig | undefined {
  return TOKENS.find(t => t.id === tokenId);
}

// 根据链ID获取链配置
export function getChainById(chainId: string): ChainConfig | undefined {
  return CHAINS.find(c => c.id === chainId);
}

// 获取链下的所有代币
export function getTokensByChain(chainId: string): TokenConfig[] {
  if (chainId === 'all') {
    // 排除 comingSoon 链的代币
    const comingSoonChains = CHAINS.filter(c => c.comingSoon).map(c => c.id);
    return TOKENS.filter(t => !comingSoonChains.includes(t.chain) && !t.disabled);
  }
  return TOKENS.filter(t => t.chain === chainId && !t.disabled);
}

// 获取区块链列表（不包括 filter 类型）
export function getBlockchains(): ChainConfig[] {
  return CHAINS.filter(c => c.type === 'blockchain');
}

// 获取所有链（包括 filter）
export function getAllChains(): ChainConfig[] {
  return CHAINS;
}

/**
 * 稳定币符号集合 — 同一 symbol 跨多链的代币归入 "Stablecoins" 分组
 */
const STABLECOIN_SYMBOLS = new Set(['USDT', 'USDC', 'DAI', 'BUSD']);

/**
 * 币种分组项：同一 symbol 下可能有多条链
 */
export interface CurrencyGroup {
  symbol: string;
  tokens: TokenConfig[];
  category: 'stablecoin' | 'native' | 'other';
}

/**
 * 将可用代币列表按币种符号分组，并按类别排序。
 * - stablecoin: USDT / USDC / DAI / BUSD（同一 symbol 多链共享一张卡片）
 * - native: BTC / ETH / BNB 等链原生币（单链，直接选中）
 * - other: 其余
 */
export function groupTokensByCurrency(tokens: TokenConfig[]): CurrencyGroup[] {
  const map = new Map<string, TokenConfig[]>();

  for (const t of tokens) {
    const key = t.token;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(t);
  }

  const groups: CurrencyGroup[] = [];
  for (const [symbol, items] of map) {
    const category: CurrencyGroup['category'] = STABLECOIN_SYMBOLS.has(symbol)
      ? 'stablecoin'
      : items.length === 1 && items[0].isNative
        ? 'native'
        : 'other';
    groups.push({ symbol, tokens: items, category });
  }

  const ORDER: Record<CurrencyGroup['category'], number> = { stablecoin: 0, native: 1, other: 2 };
  groups.sort((a, b) => ORDER[a.category] - ORDER[b.category]);

  return groups;
}
