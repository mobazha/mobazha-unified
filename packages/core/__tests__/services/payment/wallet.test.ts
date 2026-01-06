/**
 * Wallet Service Tests
 * 钱包服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChainId, WalletConnectionState, WalletEvent } from '../../../services/payment/types';
import {
  getWalletService,
  resetWalletService,
  WalletService,
} from '../../../services/payment/wallet';

// Mock window.ethereum
const mockEthereum = {
  isMetaMask: true,
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

describe('Wallet Service', () => {
  beforeEach(() => {
    // Reset the singleton
    resetWalletService();
    vi.clearAllMocks();

    // Setup window.ethereum mock
    if (typeof window !== 'undefined') {
      (window as unknown as { ethereum: typeof mockEthereum }).ethereum = mockEthereum;
    }
  });

  describe('getWalletService', () => {
    it('should return a singleton instance', () => {
      const service1 = getWalletService();
      const service2 = getWalletService();
      expect(service1).toBe(service2);
    });

    it('should return WalletService instance', () => {
      const service = getWalletService();
      expect(service).toBeInstanceOf(WalletService);
    });
  });

  describe('WalletService', () => {
    describe('getState', () => {
      it('should return DISCONNECTED initially', () => {
        const service = getWalletService();
        expect(service.getState()).toBe(WalletConnectionState.DISCONNECTED);
      });
    });

    describe('isConnected', () => {
      it('should return false when disconnected', () => {
        const service = getWalletService();
        expect(service.isConnected()).toBe(false);
      });
    });

    describe('getWalletInfo', () => {
      it('should return null when not connected', () => {
        const service = getWalletService();
        expect(service.getWalletInfo()).toBeNull();
      });
    });

    describe('getCurrentChainId', () => {
      it('should return null when not connected', () => {
        const service = getWalletService();
        expect(service.getCurrentChainId()).toBeNull();
      });
    });

    describe('getCurrentAddress', () => {
      it('should return null when not connected', () => {
        const service = getWalletService();
        expect(service.getCurrentAddress()).toBeNull();
      });
    });

    describe('getSupportedChains', () => {
      it('should return array of supported chains', () => {
        const service = getWalletService();
        const chains = service.getSupportedChains();
        expect(Array.isArray(chains)).toBe(true);
        expect(chains.length).toBeGreaterThan(0);
        expect(chains).toContain(ChainId.ETHEREUM);
      });
    });

    describe('getProvider', () => {
      it('should return null when not connected', () => {
        const service = getWalletService();
        expect(service.getProvider()).toBeNull();
      });
    });

    describe('getSigner', () => {
      it('should return null when not connected', () => {
        const service = getWalletService();
        expect(service.getSigner()).toBeNull();
      });
    });

    describe('event listeners', () => {
      it('should allow adding event listeners', () => {
        const service = getWalletService();
        const callback = vi.fn();
        const unsubscribe = service.on(WalletEvent.CONNECTED, callback);

        expect(typeof unsubscribe).toBe('function');
      });

      it('should allow removing event listeners', () => {
        const service = getWalletService();
        const callback = vi.fn();
        service.on(WalletEvent.CONNECTED, callback);
        service.off(WalletEvent.CONNECTED, callback);
        // No error should be thrown
      });

      it('should return unsubscribe function that works', () => {
        const service = getWalletService();
        const callback = vi.fn();
        const unsubscribe = service.on(WalletEvent.CONNECTED, callback);
        unsubscribe();
        // No error should be thrown
      });
    });

    describe('disconnect', () => {
      it('should reset state on disconnect', async () => {
        const service = getWalletService();
        await service.disconnect();

        expect(service.getState()).toBe(WalletConnectionState.DISCONNECTED);
        expect(service.getWalletInfo()).toBeNull();
        expect(service.getProvider()).toBeNull();
        expect(service.getSigner()).toBeNull();
      });
    });
  });

  describe('WalletConnectionState', () => {
    it('should have correct states', () => {
      expect(WalletConnectionState.DISCONNECTED).toBe('disconnected');
      expect(WalletConnectionState.CONNECTING).toBe('connecting');
      expect(WalletConnectionState.CONNECTED).toBe('connected');
      expect(WalletConnectionState.ERROR).toBe('error');
    });
  });

  describe('WalletEvent', () => {
    it('should have correct event names', () => {
      expect(WalletEvent.CONNECTED).toBe('wallet:connected');
      expect(WalletEvent.DISCONNECTED).toBe('wallet:disconnected');
      expect(WalletEvent.CHAIN_CHANGED).toBe('wallet:chainChanged');
      expect(WalletEvent.ACCOUNT_CHANGED).toBe('wallet:accountChanged');
      expect(WalletEvent.ERROR).toBe('wallet:error');
    });
  });
});

describe('Wallet Service - Browser Environment', () => {
  // These tests would require jsdom with ethereum mock
  describe('connect', () => {
    it('should handle missing provider gracefully', async () => {
      // Temporarily remove ethereum
      const originalEthereum = (globalThis as unknown as { ethereum: unknown }).ethereum;
      delete (globalThis as unknown as { ethereum?: unknown }).ethereum;

      resetWalletService();
      const service = getWalletService();
      const result = await service.connect();

      expect(result).toBeNull();

      // Restore
      (globalThis as unknown as { ethereum: unknown }).ethereum = originalEthereum;
    });
  });
});
