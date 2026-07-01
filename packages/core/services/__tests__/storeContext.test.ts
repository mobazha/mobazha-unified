import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseStoreFromStartParam,
  setStoreContext,
  getStorePeerID,
  clearStoreContext,
  getStoreHeaders,
  isManagingStandaloneStore,
  validateStoreContext,
} from '../storeContext';

describe('storeContext', () => {
  beforeEach(() => {
    clearStoreContext();
    // Clear localStorage mock between tests
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('parseStoreFromStartParam', () => {
    it('returns null for undefined', () => {
      expect(parseStoreFromStartParam(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseStoreFromStartParam('')).toBeNull();
    });

    it('extracts peer ID from store_ prefix', () => {
      expect(parseStoreFromStartParam('store_QmPeerID123')).toBe('QmPeerID123');
    });

    it('returns null for bind_ prefix (no store prefix)', () => {
      expect(parseStoreFromStartParam('bind_abc123')).toBeNull();
    });

    it('returns null for store_ with empty peer ID', () => {
      expect(parseStoreFromStartParam('store_')).toBeNull();
    });
  });

  describe('setStoreContext + getStorePeerID', () => {
    it('set then get returns the value', () => {
      setStoreContext('QmStorePeer123');
      expect(getStorePeerID()).toBe('QmStorePeer123');
    });
  });

  describe('clearStoreContext', () => {
    it('after clear, get returns null', () => {
      setStoreContext('QmStorePeer123');
      clearStoreContext();
      expect(getStorePeerID()).toBeNull();
    });
  });

  describe('getStoreHeaders', () => {
    it('when active, returns X-Store-PeerID header', () => {
      setStoreContext('QmStorePeer456');
      expect(getStoreHeaders()).toEqual({ 'X-Store-PeerID': 'QmStorePeer456' });
    });

    it('when no context, returns empty object', () => {
      clearStoreContext();
      expect(getStoreHeaders()).toEqual({});
    });
  });

  describe('isManagingStandaloneStore', () => {
    it('returns true when store context is set', () => {
      setStoreContext('QmStorePeer789');
      expect(isManagingStandaloneStore()).toBe(true);
    });

    it('returns false when context is cleared', () => {
      setStoreContext('QmStorePeer789');
      clearStoreContext();
      expect(isManagingStandaloneStore()).toBe(false);
    });
  });

  describe('validateStoreContext', () => {
    it('clears context when saved peerID does not match owned store', async () => {
      setStoreContext('QmStaleStore');
      await validateStoreContext(async () => ({ peer_id: 'QmDifferentStore' }));
      expect(getStorePeerID()).toBeNull();
    });

    it('keeps context when saved peerID matches owned store', async () => {
      setStoreContext('QmMyStore');
      await validateStoreContext(async () => ({ peer_id: 'QmMyStore' }));
      expect(getStorePeerID()).toBe('QmMyStore');
    });

    it('clears context when user has no stores', async () => {
      setStoreContext('QmOrphanStore');
      await validateStoreContext(async () => null);
      expect(getStorePeerID()).toBeNull();
    });

    it('keeps context on network error (conservative)', async () => {
      setStoreContext('QmKeepOnError');
      await validateStoreContext(async () => {
        throw new Error('network failure');
      });
      expect(getStorePeerID()).toBe('QmKeepOnError');
    });

    it('does nothing when no context is set', async () => {
      clearStoreContext();
      const fetchFn = async () => ({ peer_id: 'QmSomeStore' });
      await validateStoreContext(fetchFn);
      expect(getStorePeerID()).toBeNull();
    });
  });
});
