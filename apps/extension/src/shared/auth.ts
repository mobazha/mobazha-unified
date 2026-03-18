/**
 * Chrome Extension inline authentication — no popups, no redirects.
 *
 * Flow (MetaMask-style in-app login):
 *   1. User enters username/password in the extension Popup
 *   2. POST Casdoor /api/login/oauth/access_token (ROPC grant) → JWT
 *   3. Store token + user info in localStorage
 *
 * Uses the OAuth 2.0 Resource Owner Password Credentials grant.
 * The /api/login/oauth/access_token endpoint is CORS-whitelisted in
 * Casdoor's cors_filter.go, unlike /api/login which blocks extension origins.
 */

import { getEnvConfig } from '@mobazha/core/config/env';
import { getUserInfo } from '@mobazha/core/services/auth/casdoor';
import {
  saveToken,
  saveUser,
  clearAuth,
  getStoredToken,
  isAuthenticated,
} from '@mobazha/core/services/auth/token';
import type { StoredUser } from '@mobazha/core/services/auth/token';

export interface AuthResult {
  success: boolean;
  user?: StoredUser;
  error?: string;
}

/**
 * Sign in via Casdoor ROPC (Resource Owner Password Credentials).
 * Uses /api/login/oauth/access_token which bypasses CORS checks.
 */
async function casdoorPasswordGrant(username: string, password: string): Promise<string> {
  const env = getEnvConfig();
  const { serverUrl, clientId } = env.casdoor;

  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: 'test-mobazha-client-secret',
    username,
    password,
    scope: 'openid profile email',
  });

  const resp = await fetch(`${serverUrl}/api/login/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }

  const data = await resp.json();

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  if (!data.access_token) {
    throw new Error('No access token in response');
  }

  return data.access_token;
}

/**
 * Sign in with username/password — fully inline, no popup.
 */
export async function extensionSignIn(username: string, password: string): Promise<AuthResult> {
  try {
    const token = await casdoorPasswordGrant(username, password);
    saveToken(token);

    // Sync token to chrome.storage.local for Service Worker access
    // (Service Worker has no localStorage)
    chrome.storage?.local?.set({ authToken: token });

    let user: StoredUser | undefined;
    try {
      const userInfo = await getUserInfo(token);
      if (userInfo) {
        user = {
          id: userInfo.id,
          name: userInfo.name,
          displayName: userInfo.displayName,
          avatar: userInfo.avatar,
        };
        saveUser(user);
      }
    } catch {
      // User info fetch is best-effort
    }

    return { success: true, user };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    return { success: false, error: message };
  }
}

export function extensionSignOut(): void {
  clearAuth();
  chrome.storage?.local?.remove(['authToken', 'orderStates', 'lastPollTime']);
}

export { isAuthenticated, getStoredToken };
