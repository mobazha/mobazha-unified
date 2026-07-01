// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGroupContext } from '@mobazha/core';

const mockInitialize = vi.fn().mockResolvedValue(null);

vi.mock('@mobazha/core/services/groupContext', () => ({
  initializeGroupMarketplace: (...args: unknown[]) => mockInitialize(...args),
  detectGroupContext: vi.fn(),
  saveGroupContext: vi.fn(),
  getCurrentGroupContext: vi.fn(() => null),
  clearGroupContext: vi.fn(),
  setUserPeerID: vi.fn(),
  getUserPeerID: vi.fn(() => null),
  getGroupHeaders: vi.fn(() => ({})),
  verifyGroupMembership: vi.fn(),
}));

describe('useGroupContext autoInit loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialize.mockResolvedValue(null);
  });

  it('starts with loading true when autoInit is enabled', () => {
    mockInitialize.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useGroupContext({ autoInit: true }));
    expect(result.current.loading).toBe(true);
  });

  it('starts with loading false when autoInit is disabled', () => {
    const { result } = renderHook(() => useGroupContext({ autoInit: false }));
    expect(result.current.loading).toBe(false);
  });
});
