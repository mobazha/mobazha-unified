// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useMemo, useState } from 'react';
import { acquireSaaSToken } from '../services/auth/saasBridge';
import { systemApi } from '../services/api';
import type { StoreCredentialDenialAction } from '../utils/storeCredentialDenial';

export interface UseStoreCredentialRecoveryReturn {
  /**
   * Re-register / rotate the store's OWN signed platform credential via the
   * local node (`STORE_CREDENTIAL_INVALID`). This is NOT an OAuth flow and never
   * touches a platform account — the store's key authority never leaves the
   * node. Reloads the affected resource only after the node confirms success.
   */
  refreshCredential: () => Promise<boolean>;
  /**
   * Disconnect the optional platform account from this store
   * (`ACCOUNT_STORE_MISMATCH`). Removes only the optional account ownership; the
   * store's Peer identity, data, deal links, orders, and credential authority
   * remain. Reloads only after success.
   */
  disconnect: () => Promise<boolean>;
  /**
   * Connect a platform account, possibly reusing an existing account session
   * (`ACCOUNT_SESSION_REQUIRED`). OAuth authenticates only the *account*.
   */
  connect: () => Promise<boolean>;
  /**
   * Switch to a *different* platform account by forcing the OAuth account
   * chooser (`ACCOUNT_STORE_MISMATCH`).
   */
  switchAccount: () => Promise<boolean>;
  /** Plain reload of the affected resource (`RATE_LIMITED`). */
  retry: () => Promise<boolean>;
  /** Which recovery action is currently in flight, or `null`. */
  busyAction: StoreCredentialDenialAction | null;
  /**
   * Which recovery action last failed, or `null`. Set only on failure and
   * cleared when a new action starts. Surfaces render their own localized copy
   * from this flag — the raw server / OAuth error string is never exposed.
   */
  failedAction: StoreCredentialDenialAction | null;
}

/**
 * Drives every store-credential / platform-account denial recovery a surface can
 * offer, keyed by {@link StoreCredentialDenialAction}. Each action reloads the
 * affected resource ONLY after it succeeds, so the UI never claims recovery
 * before the node confirms it.
 *
 * The two local-admin recoveries — `refreshCredential` (re-register the store's
 * own signed credential) and `disconnect` (drop the optional account) — call the
 * node directly and deliberately never import the OAuth bridge. Only `connect` /
 * `switchAccount` run OAuth, which authenticates a platform *account* and never
 * grants the store's own key authority.
 *
 * @param reload Refetch the resource behind the denial. Awaited after a
 *   successful action; a rejection there is swallowed like any other failure.
 */
export function useStoreCredentialRecovery(
  reload: () => void | Promise<void>
): UseStoreCredentialRecoveryReturn {
  const [busyAction, setBusyAction] = useState<StoreCredentialDenialAction | null>(null);
  const [failedAction, setFailedAction] = useState<StoreCredentialDenialAction | null>(null);

  const run = useCallback(
    async (action: StoreCredentialDenialAction, perform: () => Promise<void>): Promise<boolean> => {
      setBusyAction(action);
      setFailedAction(null);
      try {
        await perform();
        await reload();
        return true;
      } catch {
        // Record only which action failed; never surface the raw error string.
        setFailedAction(action);
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [reload]
  );

  const refreshCredential = useCallback(
    () =>
      run('refreshCredential', async () => {
        await systemApi.refreshPlatformCredential();
      }),
    [run]
  );

  const disconnect = useCallback(
    () =>
      run('disconnect', async () => {
        await systemApi.disconnectPlatform();
      }),
    [run]
  );

  // OAuth association. `force` opens the account chooser to switch accounts;
  // without it an existing account session may be reused.
  const runOAuth = useCallback(
    (action: StoreCredentialDenialAction, force: boolean): Promise<boolean> =>
      run(action, async () => {
        const result = await acquireSaaSToken(force);
        if (!result.success || !result.token) {
          // Fail with a neutral error so no raw provider string can leak upward.
          throw new Error('platform account connect failed');
        }
        await systemApi.connectPlatform(result.token);
      }),
    [run]
  );
  const connect = useCallback(() => runOAuth('connect', false), [runOAuth]);
  const switchAccount = useCallback(() => runOAuth('switchAccount', true), [runOAuth]);

  const retry = useCallback(() => run('retry', async () => {}), [run]);

  return useMemo(
    () => ({
      refreshCredential,
      disconnect,
      connect,
      switchAccount,
      retry,
      busyAction,
      failedAction,
    }),
    [refreshCredential, disconnect, connect, switchAccount, retry, busyAction, failedAction]
  );
}
