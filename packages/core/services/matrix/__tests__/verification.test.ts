import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/helpers', () => ({
  authPost: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../api/config', () => ({
  getMyGatewayUrl: () => 'https://gateway.test.com',
  getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
}));

import { authPost } from '../../api/helpers';
import {
  requestVerification,
  acceptVerificationRequest,
  confirmVerification,
  cancelVerification,
  startSAS,
} from '../verification';

describe('verification module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestVerification', () => {
    it('calls authPost with correct path and userId', async () => {
      vi.mocked(authPost).mockResolvedValue({ transactionId: 'txn_abc' });

      const txnId = await requestVerification('@alice:test');

      expect(authPost).toHaveBeenCalledWith('/chat/verification/request', {
        userId: '@alice:test',
      });
      expect(txnId).toBe('txn_abc');
    });

    it('propagates API errors', async () => {
      vi.mocked(authPost).mockRejectedValue(new Error('network error'));

      await expect(requestVerification('@alice:test')).rejects.toThrow('network error');
    });
  });

  describe('acceptVerificationRequest', () => {
    it('calls authPost with txnId in path', async () => {
      vi.mocked(authPost).mockResolvedValue({});

      const result = await acceptVerificationRequest('txn_123');

      expect(authPost).toHaveBeenCalledWith('/chat/verification/txn_123/accept', {});
      expect(result).toBe(true);
    });
  });

  describe('confirmVerification', () => {
    it('calls authPost with txnId in path', async () => {
      vi.mocked(authPost).mockResolvedValue({});

      const result = await confirmVerification('txn_123');

      expect(authPost).toHaveBeenCalledWith('/chat/verification/txn_123/confirm', {});
      expect(result).toBe(true);
    });
  });

  describe('cancelVerification', () => {
    it('calls authPost with txnId in path', async () => {
      vi.mocked(authPost).mockResolvedValue({});

      const result = await cancelVerification('txn_123');

      expect(authPost).toHaveBeenCalledWith('/chat/verification/txn_123/cancel', {});
      expect(result).toBe(true);
    });
  });

  describe('startSAS', () => {
    it('calls authPost with txnId in path', async () => {
      vi.mocked(authPost).mockResolvedValue({});

      await startSAS('txn_123');

      expect(authPost).toHaveBeenCalledWith('/chat/verification/txn_123/start-sas', {});
    });
  });
});
