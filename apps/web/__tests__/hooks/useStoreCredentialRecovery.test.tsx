// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const acquireSaaSTokenMock = vi.fn();
const connectPlatformMock = vi.fn();
const refreshPlatformCredentialMock = vi.fn();
const disconnectPlatformMock = vi.fn();

vi.mock('@mobazha/core/services/auth/saasBridge', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/services/auth/saasBridge')>();
  return {
    ...actual,
    acquireSaaSToken: (...args: unknown[]) => acquireSaaSTokenMock(...args),
  };
});

vi.mock('@mobazha/core/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/services/api')>();
  return {
    ...actual,
    systemApi: {
      ...actual.systemApi,
      connectPlatform: (...args: unknown[]) => connectPlatformMock(...args),
      refreshPlatformCredential: (...args: unknown[]) => refreshPlatformCredentialMock(...args),
      disconnectPlatform: (...args: unknown[]) => disconnectPlatformMock(...args),
    },
  };
});

import { useStoreCredentialRecovery } from '@mobazha/core';

describe('useStoreCredentialRecovery', () => {
  beforeEach(() => {
    acquireSaaSTokenMock.mockReset();
    connectPlatformMock.mockReset();
    refreshPlatformCredentialMock.mockReset();
    disconnectPlatformMock.mockReset();
  });

  it('refreshCredential re-registers the store credential and reloads — never OAuth', async () => {
    refreshPlatformCredentialMock.mockResolvedValue({ refreshed: true });
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useStoreCredentialRecovery(reload));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.refreshCredential();
    });

    expect(ok).toBe(true);
    expect(refreshPlatformCredentialMock).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    // Credential recovery must never touch the OAuth / account-connect path.
    expect(acquireSaaSTokenMock).not.toHaveBeenCalled();
    expect(connectPlatformMock).not.toHaveBeenCalled();
    expect(result.current.failedAction).toBeNull();
  });

  it('refreshCredential does not reload and flags failure when the node rejects', async () => {
    // Recovery must not claim success (reload) before the node confirms it.
    refreshPlatformCredentialMock.mockRejectedValue(new Error('registration failed'));
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useStoreCredentialRecovery(reload));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.refreshCredential();
    });

    expect(ok).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.failedAction).toBe('refreshCredential'));
    expect(acquireSaaSTokenMock).not.toHaveBeenCalled();
  });

  it('disconnect drops the optional account and reloads — never OAuth', async () => {
    disconnectPlatformMock.mockResolvedValue({ disconnected: true });
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useStoreCredentialRecovery(reload));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.disconnect();
    });

    expect(ok).toBe(true);
    expect(disconnectPlatformMock).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(acquireSaaSTokenMock).not.toHaveBeenCalled();
    expect(connectPlatformMock).not.toHaveBeenCalled();
  });

  it('connect reuses an existing account session (no forced account choice) then reloads', async () => {
    acquireSaaSTokenMock.mockResolvedValue({ success: true, token: 'jwt' });
    connectPlatformMock.mockResolvedValue({ casdoorAvailable: true, ownerUserId: 'u1' });
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useStoreCredentialRecovery(reload));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.connect();
    });

    expect(ok).toBe(true);
    expect(acquireSaaSTokenMock).toHaveBeenCalledWith(false);
    expect(connectPlatformMock).toHaveBeenCalledWith('jwt');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('switchAccount forces a fresh account choice', async () => {
    acquireSaaSTokenMock.mockResolvedValue({ success: true, token: 'jwt' });
    connectPlatformMock.mockResolvedValue({ casdoorAvailable: true, ownerUserId: 'u2' });
    const { result } = renderHook(() => useStoreCredentialRecovery(vi.fn()));

    await act(async () => {
      await result.current.switchAccount();
    });

    expect(acquireSaaSTokenMock).toHaveBeenCalledWith(true);
  });

  it('flags an OAuth failure without exposing the raw server/OAuth error string', async () => {
    // The bridge returns a raw provider message; the hook must not surface it,
    // only a failedAction flag the UI translates into localized copy.
    acquireSaaSTokenMock.mockResolvedValue({ success: false, error: 'raw provider blew up' });
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useStoreCredentialRecovery(reload));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.switchAccount();
    });

    expect(ok).toBe(false);
    expect(connectPlatformMock).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.failedAction).toBe('switchAccount'));
    // The return shape carries no raw message/error field that could leak.
    expect(Object.keys(result.current).sort()).toEqual(
      [
        'busyAction',
        'connect',
        'disconnect',
        'failedAction',
        'refreshCredential',
        'retry',
        'switchAccount',
      ].sort()
    );
  });

  it('retry just reloads the resource', async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useStoreCredentialRecovery(reload));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.retry();
    });

    expect(ok).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(acquireSaaSTokenMock).not.toHaveBeenCalled();
    expect(refreshPlatformCredentialMock).not.toHaveBeenCalled();
  });
});
