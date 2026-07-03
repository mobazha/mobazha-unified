import { describe, expect, it } from 'vitest';
import {
  hasWaitingUpdate,
  RELOAD_RECOVERY_MS,
  SKIP_WAITING_FALLBACK_MS,
  SKIP_WAITING_MESSAGE,
} from '@/lib/serviceWorkerUpdate';

describe('serviceWorkerUpdate', () => {
  describe('hasWaitingUpdate', () => {
    it('returns true when a waiting worker exists and a controller is active', () => {
      expect(hasWaitingUpdate({ waiting: {} as globalThis.ServiceWorker }, true)).toBe(true);
    });

    it('returns false when there is no waiting worker', () => {
      expect(hasWaitingUpdate({ waiting: null }, true)).toBe(false);
    });

    it('returns false on first install before a controller exists', () => {
      expect(hasWaitingUpdate({ waiting: {} as globalThis.ServiceWorker }, false)).toBe(false);
    });
  });

  describe('constants', () => {
    it('exports the skip-waiting message shape', () => {
      expect(SKIP_WAITING_MESSAGE).toEqual({ type: 'SKIP_WAITING' });
    });

    it('uses a shorter fallback than reload recovery', () => {
      expect(SKIP_WAITING_FALLBACK_MS).toBeLessThan(RELOAD_RECOVERY_MS);
    });
  });
});
