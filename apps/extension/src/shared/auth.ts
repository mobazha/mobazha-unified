/**
 * Chrome Extension inline authentication — no popups, no redirects.
 *
 * Flow (MetaMask-style in-app login):
 *   1. User enters username/password in the extension Popup
 *   2. POST to Casdoor /api/login → get OAuth code (no browser redirect)
 *   3. Exchange code via hosting backend → get JWT
 *   4. Store token + user info in localStorage
 */

import { getEnvConfig } from '@mobazha/core/config/env';
import { getHostingUrl } from '@mobazha/core/services/api/config';
import { HOSTING_API } from '@mobazha/core/config/apiPaths';
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

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Call Casdoor POST /api/login directly with username/password.
 * Returns the OAuth code without any browser redirect.
 */
async function casdoorDirectLogin(
  username: string,
  password: string
): Promise<{ code: string; state: string }> {
  const env = getEnvConfig();
  const { serverUrl, clientId, appName, organizationName } = env.casdoor;

  const state = `${appName}_${generateState()}`;
  const redirectUri = `https://test-new.mobazha.org/callback`;

  const params = new URLSearchParams({
    clientId,
    responseType: 'code',
    redirectUri,
    scope: 'openid profile email',
    state,
  });

  const resp = await fetch(`${serverUrl}/api/login?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'code',
      organization: organizationName,
      username,
      password,
      application: appName,
    }),
  });

  const data = await resp.json();

  if (data.status === 'error' || data.msg) {
    throw new Error(data.msg || 'Login failed');
  }

  // Casdoor returns the full redirect URL with code & state in data
  const callbackUrl = typeof data.data === 'string' ? data.data : '';
  if (!callbackUrl) {
    throw new Error(data.msg || 'No authorization code returned');
  }

  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (!code || !returnedState) {
    throw new Error('Missing code or state in Casdoor response');
  }

  return { code, state: returnedState };
}

/**
 * Exchange the OAuth code for a JWT via the hosting backend.
 */
async function exchangeCodeForToken(code: string, state: string): Promise<string> {
  const baseUrl = getHostingUrl();
  const url = `${baseUrl}${HOSTING_API.AUTH_SIGNIN}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  if (!data.data) {
    throw new Error(data.msg || 'No token in response');
  }
  return data.data;
}

/**
 * Sign in with username/password — fully inline, no popup.
 */
export async function extensionSignIn(username: string, password: string): Promise<AuthResult> {
  try {
    const { code, state } = await casdoorDirectLogin(username, password);
    const token = await exchangeCodeForToken(code, state);

    saveToken(token);

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
}

export { isAuthenticated, getStoredToken };
