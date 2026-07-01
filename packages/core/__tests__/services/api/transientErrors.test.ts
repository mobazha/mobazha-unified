import { describe, expect, it } from 'vitest';

import { ApiError } from '../../../services/api/client';
import { isTransientRequestError } from '../../../services/api/transientErrors';

describe('isTransientRequestError', () => {
  it('retries 502 and 504 ApiErrors', () => {
    expect(isTransientRequestError(new ApiError('bad gateway', 502))).toBe(true);
    expect(isTransientRequestError(new ApiError('gateway timeout', 504))).toBe(true);
  });

  it('retries generic 503 but not store-offline codes', () => {
    expect(isTransientRequestError(new ApiError('busy', 503, 'PROVIDER_ERROR'))).toBe(true);
    expect(isTransientRequestError(new ApiError('away', 503, 'STORE_UNAVAILABLE'))).toBe(false);
    expect(isTransientRequestError(new ApiError('away', 503, 'SERVICE_UNAVAILABLE'))).toBe(false);
  });

  it('does not retry 401/400 ApiErrors', () => {
    expect(isTransientRequestError(new ApiError('nope', 401))).toBe(false);
    expect(isTransientRequestError(new ApiError('bad', 400))).toBe(false);
  });

  it('retries browser network errors', () => {
    expect(isTransientRequestError(new TypeError('Failed to fetch'))).toBe(true);
    expect(
      isTransientRequestError(new Error('NetworkError when attempting to fetch resource.'))
    ).toBe(true);
  });

  it('does not retry request timeouts', () => {
    const timeout = new DOMException('The operation was aborted.', 'AbortError');
    expect(isTransientRequestError(timeout)).toBe(false);
  });
});

describe('isWalletOperational', () => {
  it('is true only when rpc is connected or wallet is open', async () => {
    const { isWalletOperational } = await import('../../../services/api/monero');

    expect(isWalletOperational({ connected: true, endpoint: 'x' }, null)).toBe(true);
    expect(
      isWalletOperational(null, {
        exists: true,
        walletOpen: true,
        backupConfirmed: true,
        createdAt: 1,
      })
    ).toBe(true);
    expect(
      isWalletOperational(null, {
        exists: true,
        walletOpen: false,
        address: '44abc',
        backupConfirmed: true,
        createdAt: 1,
      })
    ).toBe(false);
    expect(isWalletOperational({ connected: false, endpoint: 'x', error: 'down' }, null)).toBe(
      false
    );
  });
});
