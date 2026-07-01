/**
 * Payment Types Tests
 * 支付类型测试
 */

import { describe, it, expect } from 'vitest';
import {
  ChainId,
  WalletConnectionState,
  WalletEvent,
  PaymentStatus,
  SUPPORTED_STABLECOINS,
} from '../../../services/payment';

describe('Payment Types', () => {
  describe('ChainId', () => {
    it('should have correct mainnet chain IDs', () => {
      expect(ChainId.ETHEREUM).toBe(1);
      expect(ChainId.BSC).toBe(56);
      expect(ChainId.POLYGON).toBe(137);
      expect(ChainId.ARBITRUM).toBe(42161);
      expect(ChainId.OPTIMISM).toBe(10);
      expect(ChainId.AVALANCHE).toBe(43114);
    });

    it('should have correct testnet chain IDs', () => {
      expect(ChainId.ETHEREUM_SEPOLIA).toBe(11155111);
      expect(ChainId.BSC_TESTNET).toBe(97);
      expect(ChainId.POLYGON_MUMBAI).toBe(80001);
      expect(ChainId.ARBITRUM_SEPOLIA).toBe(421614);
    });
  });

  describe('WalletConnectionState', () => {
    it('should have all states defined', () => {
      expect(WalletConnectionState.DISCONNECTED).toBeDefined();
      expect(WalletConnectionState.CONNECTING).toBeDefined();
      expect(WalletConnectionState.CONNECTED).toBeDefined();
      expect(WalletConnectionState.ERROR).toBeDefined();
    });
  });

  describe('WalletEvent', () => {
    it('should have all events defined', () => {
      expect(WalletEvent.CONNECTED).toBeDefined();
      expect(WalletEvent.DISCONNECTED).toBeDefined();
      expect(WalletEvent.CHAIN_CHANGED).toBeDefined();
      expect(WalletEvent.ACCOUNT_CHANGED).toBeDefined();
      expect(WalletEvent.ERROR).toBeDefined();
    });
  });

  describe('PaymentStatus', () => {
    it('should have all statuses defined', () => {
      expect(PaymentStatus.PENDING).toBeDefined();
      expect(PaymentStatus.AWAITING_CONFIRMATION).toBeDefined();
      expect(PaymentStatus.CONFIRMED).toBeDefined();
      expect(PaymentStatus.FAILED).toBeDefined();
      expect(PaymentStatus.REFUNDED).toBeDefined();
      expect(PaymentStatus.RELEASED).toBeDefined();
      expect(PaymentStatus.DISPUTED).toBeDefined();
    });
  });

  describe('SUPPORTED_STABLECOINS', () => {
    it('should have stablecoins for Ethereum', () => {
      const ethCoins = SUPPORTED_STABLECOINS[ChainId.ETHEREUM];
      expect(Array.isArray(ethCoins)).toBe(true);
      expect(ethCoins.length).toBeGreaterThan(0);

      // Check USDC
      const usdc = ethCoins.find(c => c.symbol === 'USDC');
      expect(usdc).toBeDefined();
      expect(usdc?.address).toBeTruthy();
      expect(usdc?.decimals).toBe(6);
    });

    it('should have stablecoins for BSC', () => {
      const bscCoins = SUPPORTED_STABLECOINS[ChainId.BSC];
      expect(Array.isArray(bscCoins)).toBe(true);
      expect(bscCoins.length).toBeGreaterThan(0);
    });

    it('should have stablecoins for Polygon', () => {
      const polyCoins = SUPPORTED_STABLECOINS[ChainId.POLYGON];
      expect(Array.isArray(polyCoins)).toBe(true);
      expect(polyCoins.length).toBeGreaterThan(0);
    });

    it('should have stablecoins for Arbitrum', () => {
      const arbCoins = SUPPORTED_STABLECOINS[ChainId.ARBITRUM];
      expect(Array.isArray(arbCoins)).toBe(true);
      expect(arbCoins.length).toBeGreaterThan(0);
    });

    it('should have correct token structure', () => {
      const ethCoins = SUPPORTED_STABLECOINS[ChainId.ETHEREUM];
      ethCoins.forEach(token => {
        expect(token.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(token.symbol).toBeTruthy();
        expect(token.name).toBeTruthy();
        expect(typeof token.decimals).toBe('number');
        expect(token.chainId).toBe(ChainId.ETHEREUM);
      });
    });
  });
});
