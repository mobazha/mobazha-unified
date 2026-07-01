/**
 * Sovereign stub — wallet features are disabled; all exports are
 * type-compatible with the real appkit.ts but contain no external URLs.
 */

export const APPKIT_PROJECT_ID = '';

export const APPKIT_METADATA = {
  name: 'Mobazha',
  description: 'Mobazha',
  url: '',
  icons: [] as string[],
};

export const SEPOLIA_CONTRACTS = {
  RWAMarketplace: '',
  ExampleRWAToken: '',
  MockUSDT: '',
  BroadwayRWA: '',
  BroadwaySwap: '',
  RevenueDistributor: '',
  NftOtcSwap: '',
  ExampleNFT: '',
} as const;

export const MAINNET_CONTRACTS = { ...SEPOLIA_CONTRACTS } as const;

export function getAppKitContracts() {
  return SEPOLIA_CONTRACTS;
}

export function getAppKitContractAddress(_contractName: keyof typeof SEPOLIA_CONTRACTS): string {
  return '';
}

export function getContractAddress(_tokenSymbol: string, _chainId?: number): string {
  return '';
}

export const CHAIN_IDS = {
  ETHEREUM_MAINNET: 1,
  SEPOLIA: 11155111,
} as const;

export function getCurrentChainId(): number {
  return CHAIN_IDS.SEPOLIA;
}

export function getTxUrl(_txHash: string, _chainId?: number): string {
  return '';
}

export function getAddressUrl(_address: string, _chainId?: number): string {
  return '';
}
