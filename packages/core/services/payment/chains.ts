/**
 * Chain Configuration
 * 多链配置
 */

import { ChainId, ChainInfo } from './types';

// 链配置映射
export const CHAIN_CONFIG: Record<ChainId, ChainInfo> = {
  // Mainnet chains
  [ChainId.ETHEREUM]: {
    id: ChainId.ETHEREUM,
    name: 'Ethereum',
    shortName: 'ETH',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
    ],
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrl: '/chains/ethereum.svg',
    isTestnet: false,
  },
  [ChainId.BSC]: {
    id: ChainId.BSC,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: [
      'https://bsc-dataseed.binance.org',
      'https://bsc-dataseed1.defibit.io',
      'https://bsc-dataseed1.ninicoin.io',
    ],
    blockExplorerUrls: ['https://bscscan.com'],
    iconUrl: '/chains/bsc.svg',
    isTestnet: false,
  },
  [ChainId.POLYGON]: {
    id: ChainId.POLYGON,
    name: 'Polygon',
    shortName: 'MATIC',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc-mainnet.maticvigil.com',
      'https://polygon.llamarpc.com',
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrl: '/chains/polygon.svg',
    isTestnet: false,
  },
  [ChainId.ARBITRUM]: {
    id: ChainId.ARBITRUM,
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum',
    ],
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrl: '/chains/arbitrum.svg',
    isTestnet: false,
  },
  [ChainId.OPTIMISM]: {
    id: ChainId.OPTIMISM,
    name: 'Optimism',
    shortName: 'OP',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
    ],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    iconUrl: '/chains/optimism.svg',
    isTestnet: false,
  },
  [ChainId.AVALANCHE]: {
    id: ChainId.AVALANCHE,
    name: 'Avalanche C-Chain',
    shortName: 'AVAX',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.public-rpc.com',
      'https://rpc.ankr.com/avalanche',
    ],
    blockExplorerUrls: ['https://snowtrace.io'],
    iconUrl: '/chains/avalanche.svg',
    isTestnet: false,
  },

  // Testnet chains
  [ChainId.ETHEREUM_SEPOLIA]: {
    id: ChainId.ETHEREUM_SEPOLIA,
    name: 'Sepolia',
    shortName: 'SEP',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.sepolia.org', 'https://ethereum-sepolia.publicnode.com'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconUrl: '/chains/ethereum.svg',
    isTestnet: true,
  },
  [ChainId.BSC_TESTNET]: {
    id: ChainId.BSC_TESTNET,
    name: 'BSC Testnet',
    shortName: 'tBSC',
    nativeCurrency: {
      name: 'Test BNB',
      symbol: 'tBNB',
      decimals: 18,
    },
    rpcUrls: [
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://data-seed-prebsc-2-s1.binance.org:8545',
    ],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    iconUrl: '/chains/bsc.svg',
    isTestnet: true,
  },
  [ChainId.POLYGON_MUMBAI]: {
    id: ChainId.POLYGON_MUMBAI,
    name: 'Polygon Mumbai',
    shortName: 'MUMBAI',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com', 'https://polygon-mumbai.public-rpc.com'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com'],
    iconUrl: '/chains/polygon.svg',
    isTestnet: true,
  },
  [ChainId.ARBITRUM_SEPOLIA]: {
    id: ChainId.ARBITRUM_SEPOLIA,
    name: 'Arbitrum Sepolia',
    shortName: 'ARB-SEP',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
    iconUrl: '/chains/arbitrum.svg',
    isTestnet: true,
  },
  [ChainId.OPTIMISM_SEPOLIA]: {
    id: ChainId.OPTIMISM_SEPOLIA,
    name: 'Optimism Sepolia',
    shortName: 'OP-SEP',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.optimism.io'],
    blockExplorerUrls: ['https://sepolia-optimistic.etherscan.io'],
    iconUrl: '/chains/optimism.svg',
    isTestnet: true,
  },
  [ChainId.AVALANCHE_FUJI]: {
    id: ChainId.AVALANCHE_FUJI,
    name: 'Avalanche Fuji',
    shortName: 'FUJI',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io'],
    iconUrl: '/chains/avalanche.svg',
    isTestnet: true,
  },
};

// 获取链信息
export function getChainInfo(chainId: ChainId): ChainInfo | undefined {
  return CHAIN_CONFIG[chainId];
}

// 获取所有主网链
export function getMainnetChains(): ChainInfo[] {
  return Object.values(CHAIN_CONFIG).filter(chain => !chain.isTestnet);
}

// 获取所有测试网链
export function getTestnetChains(): ChainInfo[] {
  return Object.values(CHAIN_CONFIG).filter(chain => chain.isTestnet);
}

// 获取链的 RPC URL
export function getRpcUrl(chainId: ChainId): string {
  const chain = CHAIN_CONFIG[chainId];
  return chain?.rpcUrls[0] || '';
}

// 获取区块浏览器 URL
export function getExplorerUrl(chainId: ChainId): string {
  const chain = CHAIN_CONFIG[chainId];
  return chain?.blockExplorerUrls[0] || '';
}

// 获取交易浏览器链接
export function getTxExplorerUrl(chainId: ChainId, txHash: string): string {
  const explorerUrl = getExplorerUrl(chainId);
  return explorerUrl ? `${explorerUrl}/tx/${txHash}` : '';
}

// 获取地址浏览器链接
export function getAddressExplorerUrl(chainId: ChainId, address: string): string {
  const explorerUrl = getExplorerUrl(chainId);
  return explorerUrl ? `${explorerUrl}/address/${address}` : '';
}

// 判断是否是有效的链 ID
export function isValidChainId(chainId: number): chainId is ChainId {
  return chainId in ChainId;
}

// 获取链的原生代币符号
export function getNativeSymbol(chainId: ChainId): string {
  const chain = CHAIN_CONFIG[chainId];
  return chain?.nativeCurrency.symbol || 'ETH';
}

// 将十六进制链 ID 转换为数字
export function hexToChainId(hex: string): number {
  return parseInt(hex, 16);
}

// 将链 ID 转换为十六进制
export function chainIdToHex(chainId: ChainId): string {
  return `0x${chainId.toString(16)}`;
}

// 默认支持的链
export const DEFAULT_SUPPORTED_CHAINS: ChainId[] = [
  ChainId.ETHEREUM,
  ChainId.BSC,
  ChainId.POLYGON,
  ChainId.ARBITRUM,
  ChainId.OPTIMISM,
  ChainId.AVALANCHE,
];

// 默认测试网链
export const DEFAULT_TESTNET_CHAINS: ChainId[] = [
  ChainId.ETHEREUM_SEPOLIA,
  ChainId.BSC_TESTNET,
  ChainId.POLYGON_MUMBAI,
  ChainId.ARBITRUM_SEPOLIA,
];
