/**
 * Chains Service Tests
 * 多链配置服务测试
 */

import { describe, it, expect } from 'vitest';
import { ChainId } from '../../../services/payment/types';
import {
  CHAIN_CONFIG,
  getChainInfo,
  getMainnetChains,
  getTestnetChains,
  getRpcUrl,
  getExplorerUrl,
  getTxExplorerUrl,
  getAddressExplorerUrl,
  isValidChainId,
  getNativeSymbol,
  hexToChainId,
  chainIdToHex,
  DEFAULT_SUPPORTED_CHAINS,
} from '../../../services/payment/chains';

describe('Chain Configuration', () => {
  describe('CHAIN_CONFIG', () => {
    it('should have configuration for all ChainId values', () => {
      const chainIds = Object.values(ChainId).filter(v => typeof v === 'number') as ChainId[];

      chainIds.forEach(chainId => {
        expect(CHAIN_CONFIG[chainId]).toBeDefined();
        expect(CHAIN_CONFIG[chainId].id).toBe(chainId);
      });
    });

    it('should have required fields for each chain', () => {
      Object.values(CHAIN_CONFIG).forEach(chain => {
        expect(chain.id).toBeDefined();
        expect(chain.name).toBeTruthy();
        expect(chain.shortName).toBeTruthy();
        expect(chain.nativeCurrency).toBeDefined();
        expect(chain.nativeCurrency.symbol).toBeTruthy();
        expect(chain.nativeCurrency.decimals).toBe(18);
        expect(chain.rpcUrls.length).toBeGreaterThan(0);
        expect(chain.blockExplorerUrls.length).toBeGreaterThan(0);
        expect(typeof chain.isTestnet).toBe('boolean');
      });
    });
  });

  describe('getChainInfo', () => {
    it('should return chain info for valid chainId', () => {
      const ethInfo = getChainInfo(ChainId.ETHEREUM);
      expect(ethInfo).toBeDefined();
      expect(ethInfo?.name).toBe('Ethereum');
      expect(ethInfo?.nativeCurrency.symbol).toBe('ETH');
    });

    it('should return undefined for invalid chainId', () => {
      const info = getChainInfo(999999 as ChainId);
      expect(info).toBeUndefined();
    });
  });

  describe('getMainnetChains', () => {
    it('should return only mainnet chains', () => {
      const mainnets = getMainnetChains();
      expect(mainnets.length).toBeGreaterThan(0);
      mainnets.forEach(chain => {
        expect(chain.isTestnet).toBe(false);
      });
    });

    it('should include Ethereum mainnet', () => {
      const mainnets = getMainnetChains();
      const eth = mainnets.find(c => c.id === ChainId.ETHEREUM);
      expect(eth).toBeDefined();
    });
  });

  describe('getTestnetChains', () => {
    it('should return only testnet chains', () => {
      const testnets = getTestnetChains();
      expect(testnets.length).toBeGreaterThan(0);
      testnets.forEach(chain => {
        expect(chain.isTestnet).toBe(true);
      });
    });

    it('should include Sepolia testnet', () => {
      const testnets = getTestnetChains();
      const sepolia = testnets.find(c => c.id === ChainId.ETHEREUM_SEPOLIA);
      expect(sepolia).toBeDefined();
    });
  });

  describe('getRpcUrl', () => {
    it('should return RPC URL for valid chain', () => {
      const rpc = getRpcUrl(ChainId.ETHEREUM);
      expect(rpc).toBeTruthy();
      expect(rpc.startsWith('https://')).toBe(true);
    });

    it('should return empty string for invalid chain', () => {
      const rpc = getRpcUrl(999999 as ChainId);
      expect(rpc).toBe('');
    });
  });

  describe('getExplorerUrl', () => {
    it('should return explorer URL for Ethereum', () => {
      const url = getExplorerUrl(ChainId.ETHEREUM);
      expect(url).toBe('https://etherscan.io');
    });

    it('should return explorer URL for BSC', () => {
      const url = getExplorerUrl(ChainId.BSC);
      expect(url).toBe('https://bscscan.com');
    });
  });

  describe('getTxExplorerUrl', () => {
    it('should return correct transaction URL', () => {
      const txHash = '0x123abc';
      const url = getTxExplorerUrl(ChainId.ETHEREUM, txHash);
      expect(url).toBe(`https://etherscan.io/tx/${txHash}`);
    });
  });

  describe('getAddressExplorerUrl', () => {
    it('should return correct address URL', () => {
      const address = '0xabc123';
      const url = getAddressExplorerUrl(ChainId.POLYGON, address);
      expect(url).toBe(`https://polygonscan.com/address/${address}`);
    });
  });

  describe('isValidChainId', () => {
    it('should return true for valid chain IDs', () => {
      expect(isValidChainId(1)).toBe(true); // Ethereum
      expect(isValidChainId(56)).toBe(true); // BSC
      expect(isValidChainId(137)).toBe(true); // Polygon
    });

    it('should return false for invalid chain IDs', () => {
      expect(isValidChainId(999999)).toBe(false);
      expect(isValidChainId(0)).toBe(false);
      expect(isValidChainId(-1)).toBe(false);
    });
  });

  describe('getNativeSymbol', () => {
    it('should return correct symbols', () => {
      expect(getNativeSymbol(ChainId.ETHEREUM)).toBe('ETH');
      expect(getNativeSymbol(ChainId.BSC)).toBe('BNB');
      expect(getNativeSymbol(ChainId.POLYGON)).toBe('MATIC');
      expect(getNativeSymbol(ChainId.AVALANCHE)).toBe('AVAX');
    });

    it('should return ETH as default for unknown chain', () => {
      expect(getNativeSymbol(999999 as ChainId)).toBe('ETH');
    });
  });

  describe('hexToChainId', () => {
    it('should convert hex to chainId', () => {
      expect(hexToChainId('0x1')).toBe(1);
      expect(hexToChainId('0x38')).toBe(56);
      expect(hexToChainId('0x89')).toBe(137);
    });
  });

  describe('chainIdToHex', () => {
    it('should convert chainId to hex', () => {
      expect(chainIdToHex(ChainId.ETHEREUM)).toBe('0x1');
      expect(chainIdToHex(ChainId.BSC)).toBe('0x38');
      expect(chainIdToHex(ChainId.POLYGON)).toBe('0x89');
    });
  });

  describe('DEFAULT_SUPPORTED_CHAINS', () => {
    it('should contain main chains', () => {
      expect(DEFAULT_SUPPORTED_CHAINS).toContain(ChainId.ETHEREUM);
      expect(DEFAULT_SUPPORTED_CHAINS).toContain(ChainId.BSC);
      expect(DEFAULT_SUPPORTED_CHAINS).toContain(ChainId.POLYGON);
      expect(DEFAULT_SUPPORTED_CHAINS).toContain(ChainId.ARBITRUM);
    });

    it('should not contain testnets', () => {
      expect(DEFAULT_SUPPORTED_CHAINS).not.toContain(ChainId.ETHEREUM_SEPOLIA);
      expect(DEFAULT_SUPPORTED_CHAINS).not.toContain(ChainId.BSC_TESTNET);
    });
  });
});
