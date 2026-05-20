export const EVM_CHAIN_IDS = {
  ETHEREUM: 1,
  ETHEREUM_SEPOLIA: 11155111,
  BSC: 56,
  BSC_TESTNET: 97,
  POLYGON: 137,
  POLYGON_MUMBAI: 80001,
  BASE: 8453,
  BASE_SEPOLIA: 84532,
  ARBITRUM: 42161,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM: 10,
  OPTIMISM_SEPOLIA: 11155420,
  AVALANCHE: 43114,
  AVALANCHE_FUJI: 43113,
  CONFLUX: 1030,
} as const;

export type ChainFamily = 'ETH' | 'BSC' | 'MATIC' | 'BASE' | 'ARB' | 'OP' | 'AVAX' | 'CFX';

export interface EvmChainMetadata {
  chainId: number;
  family: ChainFamily;
  nativeSymbol: string;
  isTestnet: boolean;
}

const EVM_CHAIN_METADATA: Record<number, EvmChainMetadata> = {
  [EVM_CHAIN_IDS.ETHEREUM]: {
    chainId: EVM_CHAIN_IDS.ETHEREUM,
    family: 'ETH',
    nativeSymbol: 'ETH',
    isTestnet: false,
  },
  [EVM_CHAIN_IDS.ETHEREUM_SEPOLIA]: {
    chainId: EVM_CHAIN_IDS.ETHEREUM_SEPOLIA,
    family: 'ETH',
    nativeSymbol: 'ETH',
    isTestnet: true,
  },
  [EVM_CHAIN_IDS.BSC]: {
    chainId: EVM_CHAIN_IDS.BSC,
    family: 'BSC',
    nativeSymbol: 'BNB',
    isTestnet: false,
  },
  [EVM_CHAIN_IDS.BSC_TESTNET]: {
    chainId: EVM_CHAIN_IDS.BSC_TESTNET,
    family: 'BSC',
    nativeSymbol: 'BNB',
    isTestnet: true,
  },
  [EVM_CHAIN_IDS.POLYGON]: {
    chainId: EVM_CHAIN_IDS.POLYGON,
    family: 'MATIC',
    nativeSymbol: 'MATIC',
    isTestnet: false,
  },
  [EVM_CHAIN_IDS.POLYGON_MUMBAI]: {
    chainId: EVM_CHAIN_IDS.POLYGON_MUMBAI,
    family: 'MATIC',
    nativeSymbol: 'MATIC',
    isTestnet: true,
  },
  [EVM_CHAIN_IDS.BASE]: {
    chainId: EVM_CHAIN_IDS.BASE,
    family: 'BASE',
    nativeSymbol: 'ETH',
    isTestnet: false,
  },
  [EVM_CHAIN_IDS.BASE_SEPOLIA]: {
    chainId: EVM_CHAIN_IDS.BASE_SEPOLIA,
    family: 'BASE',
    nativeSymbol: 'ETH',
    isTestnet: true,
  },
  [EVM_CHAIN_IDS.ARBITRUM]: {
    chainId: EVM_CHAIN_IDS.ARBITRUM,
    family: 'ARB',
    nativeSymbol: 'ETH',
    isTestnet: false,
  },
  [EVM_CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    chainId: EVM_CHAIN_IDS.ARBITRUM_SEPOLIA,
    family: 'ARB',
    nativeSymbol: 'ETH',
    isTestnet: true,
  },
  [EVM_CHAIN_IDS.OPTIMISM]: {
    chainId: EVM_CHAIN_IDS.OPTIMISM,
    family: 'OP',
    nativeSymbol: 'ETH',
    isTestnet: false,
  },
  [EVM_CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    chainId: EVM_CHAIN_IDS.OPTIMISM_SEPOLIA,
    family: 'OP',
    nativeSymbol: 'ETH',
    isTestnet: true,
  },
  [EVM_CHAIN_IDS.AVALANCHE]: {
    chainId: EVM_CHAIN_IDS.AVALANCHE,
    family: 'AVAX',
    nativeSymbol: 'AVAX',
    isTestnet: false,
  },
  [EVM_CHAIN_IDS.AVALANCHE_FUJI]: {
    chainId: EVM_CHAIN_IDS.AVALANCHE_FUJI,
    family: 'AVAX',
    nativeSymbol: 'AVAX',
    isTestnet: true,
  },
  [EVM_CHAIN_IDS.CONFLUX]: {
    chainId: EVM_CHAIN_IDS.CONFLUX,
    family: 'CFX',
    nativeSymbol: 'CFX',
    isTestnet: false,
  },
};

const CHAIN_TYPE_ALIASES: Record<string, string[]> = {
  ETH: ['ethereum', 'eth', 'evm'],
  SOL: ['solana', 'sol'],
  BTC: ['bitcoin', 'btc'],
  LTC: ['litecoin', 'ltc'],
  BCH: ['bitcoincash', 'bch'],
  ZEC: ['zcash', 'zec'],
  TRON: ['tron', 'trx'],
};

export function getEvmChainMetadata(chainId: number): EvmChainMetadata | undefined {
  return EVM_CHAIN_METADATA[chainId];
}

export function getEvmChainFamily(chainId: number): ChainFamily | undefined {
  return getEvmChainMetadata(chainId)?.family;
}

export function getEvmNativeSymbol(chainId: number): string | undefined {
  return getEvmChainMetadata(chainId)?.nativeSymbol;
}

export function isEvmTestnetChain(chainId: number): boolean {
  return getEvmChainMetadata(chainId)?.isTestnet ?? false;
}

export function getChainTypeAliases(chainId: string): string[] {
  return CHAIN_TYPE_ALIASES[chainId.toUpperCase()] ?? [chainId.toLowerCase()];
}
