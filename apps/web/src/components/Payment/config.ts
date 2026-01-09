/**
 * Payment Configuration
 * 支付配置 - 代币、链、支付方式
 */

import { TokenConfig, ChainConfig, FiatMethodConfig } from './types';

// 代币配置 - 与移动端保持一致
export const TOKENS: TokenConfig[] = [
  // Bitcoin
  { id: 'BTC', token: 'BTC', chain: 'BTC', isNative: true, decimals: 8, disabled: false },

  // Litecoin
  { id: 'LTC', token: 'LTC', chain: 'LTC', isNative: true, decimals: 8, disabled: false },

  // 以太坊代币
  { id: 'ETH', token: 'ETH', chain: 'ETH', isNative: true, decimals: 18, disabled: false },
  {
    id: 'ETHUSDT',
    token: 'USDT',
    chain: 'ETH',
    type: 'ERC20',
    isNative: false,
    decimals: 6,
    disabled: false,
  },
  {
    id: 'ETHUSDC',
    token: 'USDC',
    chain: 'ETH',
    type: 'ERC20',
    isNative: false,
    decimals: 6,
    disabled: false,
  },
  {
    id: 'DAI',
    token: 'DAI',
    chain: 'ETH',
    type: 'ERC20',
    isNative: false,
    decimals: 18,
    disabled: false,
  },

  // Solana代币
  { id: 'SOL', token: 'SOL', chain: 'SOL', isNative: true, decimals: 9, disabled: false },
  {
    id: 'SOLUSDT',
    token: 'USDT',
    chain: 'SOL',
    type: 'SPL',
    isNative: false,
    decimals: 6,
    disabled: false,
  },
  {
    id: 'SOLUSDC',
    token: 'USDC',
    chain: 'SOL',
    type: 'SPL',
    isNative: false,
    decimals: 6,
    disabled: false,
  },

  // BSC代币
  { id: 'BNB', token: 'BNB', chain: 'BSC', isNative: true, decimals: 18, disabled: false },
  {
    id: 'BUSD',
    token: 'BUSD',
    chain: 'BSC',
    type: 'BEP20',
    isNative: false,
    decimals: 18,
    disabled: false,
  },
  {
    id: 'BSCUSDT',
    token: 'USDT',
    chain: 'BSC',
    type: 'BEP20',
    isNative: false,
    decimals: 18,
    disabled: false,
  },

  // Base代币
  {
    id: 'BASEETH',
    token: 'ETH',
    chain: 'BASE',
    isNative: false,
    decimals: 18,
    disabled: false,
  },
  {
    id: 'BASEUSDT',
    token: 'USDT',
    chain: 'BASE',
    type: 'Base',
    isNative: false,
    decimals: 6,
    disabled: false,
  },
  {
    id: 'BASEUSDC',
    token: 'USDC',
    chain: 'BASE',
    type: 'Base',
    isNative: false,
    decimals: 6,
    disabled: false,
  },

  // Polygon代币
  { id: 'MATIC', token: 'MATIC', chain: 'MATIC', isNative: true, decimals: 18, disabled: false },
  {
    id: 'MATICUSDT',
    token: 'USDT',
    chain: 'MATIC',
    type: 'Polygon',
    isNative: false,
    decimals: 6,
    disabled: false,
  },
  {
    id: 'MATICUSDC',
    token: 'USDC',
    chain: 'MATIC',
    type: 'Polygon',
    isNative: false,
    decimals: 6,
    disabled: false,
  },
];

// 链配置
export const CHAINS: ChainConfig[] = [
  {
    id: 'all',
    name: 'All',
    icon: 'list',
    color: '#6b7280',
    type: 'filter',
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    iconCode: 'BTC',
    color: '#f7931a',
    type: 'blockchain',
    addressPrefix: '',
    isExternalWallet: true,
    comingSoon: false,
  },
  {
    id: 'LTC',
    name: 'Litecoin',
    iconCode: 'LTC',
    color: '#bfbbbb',
    type: 'blockchain',
    addressPrefix: '',
    isExternalWallet: true,
    comingSoon: false,
  },
  {
    id: 'BASE',
    name: 'Base',
    iconCode: 'BASE',
    color: '#0070ba',
    type: 'blockchain',
    addressPrefix: '0x',
    comingSoon: false,
  },
  {
    id: 'BSC',
    name: 'BSC',
    iconCode: 'BSC',
    color: '#f3ba2f',
    type: 'blockchain',
    addressPrefix: '0x',
    comingSoon: false,
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    iconCode: 'ETH',
    color: '#627eea',
    type: 'blockchain',
    addressPrefix: '0x',
    comingSoon: false,
  },
  {
    id: 'SOL',
    name: 'Solana',
    iconCode: 'SOL',
    color: '#9945ff',
    type: 'blockchain',
    addressPrefix: '',
    comingSoon: false,
  },
  // {
  //   id: 'MATIC',
  //   name: 'Polygon',
  //   iconCode: 'MATIC',
  //   color: '#8247e5',
  //   type: 'blockchain',
  //   addressPrefix: '0x',
  //   comingSoon: false,
  // },
];

// 法币支付方式
export const FIAT_METHODS: FiatMethodConfig[] = [
  {
    id: 'PayPal',
    name: 'PayPal',
    icon: 'paypal',
    color: '#0070ba',
    type: 'payment',
    comingSoon: true,
    disabled: true,
  },
  {
    id: 'Stripe',
    name: 'Stripe',
    icon: 'credit-card',
    color: '#6772e5',
    type: 'payment',
    comingSoon: true,
    disabled: true,
  },
];

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
