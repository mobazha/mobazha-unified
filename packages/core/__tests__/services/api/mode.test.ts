// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../services/api/client';
import { setApiMode, setApiModeConfig, withMockFallback } from '../../../services/api/mode';

const authGet = vi.fn();

vi.mock('../../../services/api/helpers', () => ({
  authGet: (...args: unknown[]) => authGet(...args),
  authPost: vi.fn(),
  authDel: vi.fn(),
}));

import { getWishlist } from '../../../services/api/wishlist';

const wishlistQuiet401 = {
  quietFallbackWhen: (error: unknown) => error instanceof ApiError && error.status === 401,
};

describe('withMockFallback', () => {
  beforeEach(() => {
    setApiMode('auto');
    setApiModeConfig({ fallbackToMock: true, mockDelay: 0, logRequests: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('suppresses fallback warning for expected unauthenticated wishlist 401', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err401 = new ApiError('Unauthorized', 401);

    const result = await withMockFallback(
      () => Promise.reject(err401),
      () => Promise.resolve([]),
      '/wishlists',
      wishlistQuiet401
    );

    expect(result).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('still warns and falls back for wishlist 500 errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err500 = new ApiError('Internal Server Error', 500);

    const result = await withMockFallback(
      () => Promise.reject(err500),
      () => Promise.resolve([]),
      '/wishlists',
      wishlistQuiet401
    );

    expect(result).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      '[API] Real API failed for /wishlists, falling back to mock:',
      err500
    );
  });
});

describe('getWishlist', () => {
  beforeEach(() => {
    setApiMode('auto');
    setApiModeConfig({ fallbackToMock: true, mockDelay: 0, logRequests: false });
    authGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back quietly on expected unauthenticated 401', async () => {
    authGet.mockRejectedValue(new ApiError('Unauthorized', 401));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const items = await getWishlist();

    expect(items).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns and falls back on server errors', async () => {
    const err500 = new ApiError('Internal Server Error', 500);
    authGet.mockRejectedValue(err500);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const items = await getWishlist();

    expect(items).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      '[API] Real API failed for /wishlists, falling back to mock:',
      err500
    );
  });
});
